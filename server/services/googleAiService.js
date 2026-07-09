const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const getApiKey = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
const getModel = () => process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";

// Fallback model ladder used when the primary model hits quota / rate limits.
// Each entry is tried in order until one succeeds.
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

const extractText = (responseJson) => {
  const parts = responseJson?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part?.text || "")
    .join("\n")
    .trim();
};

// Retry helper with exponential backoff
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchWithRetry = async (url, options, { retries = 2, baseDelay = 1500 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      // If rate-limited and retries remain, back off and retry
      if (response.status === 429 && attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[GoogleAI] Rate-limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (err.name === "AbortError") {
        const timeoutErr = new Error("AI request timed out after 60 seconds");
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[GoogleAI] Request failed (${err.message}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError || new Error("AI request failed after retries");
};

const isQuotaError = (statusCode, message = "") => {
  const msg = message.toLowerCase();
  return (
    statusCode === 429 ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource exhausted")
  );
};

// Single attempt against one specific model. Returns { text, raw } or throws.
const callModel = async ({ model, apiKey, prompt, temperature, maxOutputTokens, responseMimeType }) => {
  const endpoint = `${GOOGLE_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
  const generationConfig = { temperature, maxOutputTokens };
  if (responseMimeType) generationConfig.responseMimeType = responseMimeType;

  console.log(`[GoogleAI] Calling ${model} (temp=${temperature}, maxTokens=${maxOutputTokens}, mime=${responseMimeType || "text"})`);

  const response = await fetchWithRetry(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || "Google AI request failed";
    console.error(`[GoogleAI] Error ${response.status} from ${model}: ${message}`);
    const err = new Error(message);
    err.statusCode = response.status;
    err.aiProvider = "google";
    err.rawError = data?.error || null;
    throw err;
  }

  const text = extractText(data);
  if (!text) {
    const err = new Error("Google AI returned an empty response");
    err.statusCode = 502;
    throw err;
  }

  console.log(`[GoogleAI] Success from ${model} — ${text.length} chars returned`);
  return { text, raw: data };
};

export const generateWithGoogleAI = async ({
  prompt,
  temperature = 0.4,
  maxOutputTokens = 2500,
  responseMimeType,
}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error("Google AI API key is missing. Set GOOGLE_AI_API_KEY in server env.");
    err.statusCode = 503;
    throw err;
  }

  // Build the model list: configured model first, then fallbacks (deduped)
  const primaryModel = getModel();
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  let lastError;
  for (const model of modelsToTry) {
    try {
      return await callModel({ model, apiKey, prompt, temperature, maxOutputTokens, responseMimeType });
    } catch (err) {
      lastError = err;
      if (isQuotaError(err.statusCode, err.message)) {
        console.warn(`[GoogleAI] Quota/rate-limit on ${model} — trying next model in fallback ladder`);
        continue;
      }
      // Non-quota errors (bad JSON, timeout, 5xx) — don't try other models
      throw err;
    }
  }

  // All models exhausted
  const err = new Error(
    `All AI models hit quota limits. Please try again in a few minutes. (last: ${lastError?.message || "unknown"})`
  );
  err.statusCode = 429;
  err.aiProvider = "google";
  throw err;
};

// Strip markdown code fences the model sometimes adds despite "no code fences" instructions
// (```json ... ``` or ``` ... ```), plus any leading/trailing prose around the JSON body.
const stripCodeFences = (text = "") =>
  String(text)
    .replace(/^﻿/, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

// Best-effort repair of a TRUNCATED JSON object — the common failure when the model hits the token
// cap mid-output (long synopsis + many roles). Strategy: scan once tracking string state and the
// bracket stack; record a "safe cut point" only at STRUCTURAL boundaries that are unambiguously
// complete — a comma at depth ≥1, or a closing bracket. (A bare string is NOT a safe point: it
// could be an object key whose value hasn't been written yet, e.g. `..."synopsis":"...<cut>`.)
// Then cut to the last safe point — dropping any half-written trailing pair — and append the
// closers the bracket stack needs. Recovers every field fully emitted before truncation.
const repairTruncatedJson = (snippet = "") => {
  const s = String(snippet);
  const stack = [];
  let inStr = false;
  let escaped = false;
  let cutAt = -1;        // index to slice up to (exclusive) at the last safe point
  let closersAtCut = ""; // brackets still open at that safe point, in close order
  const closersFor = (st) => st.slice().reverse().join("");

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{" || ch === "[") { stack.push(ch === "{" ? "}" : "]"); continue; }
    if (ch === "}" || ch === "]") {
      stack.pop();
      // A closed bracket is a complete value. Safe to cut right after it.
      cutAt = i + 1;
      closersAtCut = closersFor(stack);
      continue;
    }
    if (ch === "," && stack.length) {
      // A comma at depth means the value before it is complete. Cut AT the comma (exclude it).
      cutAt = i;
      closersAtCut = closersFor(stack);
    }
  }

  if (cutAt <= 0) return null;
  const out = s.slice(0, cutAt).replace(/,\s*$/, "") + closersAtCut;
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
};

export const generateJsonWithGoogleAI = async ({
  prompt,
  temperature = 0.3,
  maxOutputTokens = 4096,
}) => {
  const { text: rawText } = await generateWithGoogleAI({
    prompt,
    temperature,
    maxOutputTokens,
    responseMimeType: "application/json",
  });

  const text = stripCodeFences(rawText);

  // 1) Straight parse.
  try {
    return JSON.parse(text);
  } catch { /* fall through */ }

  // 2) Slice to the outermost { ... } and parse.
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    const sliced = text.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(sliced);
    } catch { /* fall through to repair */ }
  }

  // 3) Repair a truncated object (model hit the token cap mid-JSON). Repair from the first "{".
  if (jsonStart !== -1) {
    const repaired = repairTruncatedJson(text.slice(jsonStart));
    if (repaired && typeof repaired === "object") {
      console.warn("[GoogleAI] Recovered truncated JSON via repair pass");
      return repaired;
    }
  }

  const err = new Error("AI returned malformed JSON");
  err.statusCode = 502;
  err.rawSnippet = text.slice(0, 300);
  throw err;
};

export const isGoogleQuotaError = (error) => {
  if (!error) return false;
  return isQuotaError(error.statusCode, error.message);
};
