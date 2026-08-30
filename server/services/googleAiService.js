const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const getApiKey = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

/**
 * Default to an ALIAS, not a pinned version.
 *
 * The previous default was `gemini-2.5-pro`, and every AI feature broke when Google retired it:
 * "This model is no longer available to new users." The whole ladder beneath it — 2.5-pro,
 * 1.5-pro, 2.5-flash — had gone the same way, so there was nothing left to fall back to and a
 * heuristic fallback score was silently substituted instead.
 *
 * `gemini-pro-latest` tracks whatever the current pro model is, so a retirement stops being an
 * outage. The trade is that output can shift under us when Google moves the alias; for scoring and
 * synopsis work that is much cheaper than the whole feature going dark.
 *
 * GOOGLE_AI_MODEL still overrides, for pinning a specific version deliberately.
 */
const getModel = () => process.env.GOOGLE_AI_MODEL || "gemini-pro-latest";

/**
 * Tried in order when the primary cannot serve the request.
 *
 * Verified against the live API rather than chosen from the docs — the model LIST is not a reliable
 * guide, because `gemini-2.5-pro` and `gemini-2.5-flash` are both still listed by ListModels and
 * both 404 on use. Each entry here was confirmed by an actual generateContent call.
 *
 * Ordered quality first, then speed: pro-latest (~2.9s), 3.5-flash (~1.4s, verified), then the
 * flash alias as a last resort.
 */
export const FALLBACK_MODELS = ["gemini-pro-latest", "gemini-3.5-flash", "gemini-flash-latest"];

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

/**
 * Is this a failure another MODEL might not have?
 *
 * Deliberately broader than the quota check it replaces. That one matched only 429/quota, so a
 * retired model — a 404 "no longer available to new users" — threw immediately and never tried the
 * next rung. When Google retired the entire ladder at once, that turned a recoverable situation
 * into every AI feature going dark, because the one thing that could have saved it was skipped.
 *
 * Three families qualify:
 *   429 / quota      this key is throttled here; another model has its own budget
 *   404 model gone   Google retired it; the next rung may still exist
 *   503 overloaded   "experiencing high demand" — transient and model-specific, so move along
 *
 * Everything else — a malformed prompt, a bad key, a timeout, our own 502 on an empty response —
 * would fail identically on every model, so retrying the ladder just multiplies the latency before
 * the same error surfaces.
 */
export const shouldTryNextModel = (statusCode, message = "") => {
  const msg = message.toLowerCase();

  if (statusCode === 429) return true;
  if (msg.includes("quota") || msg.includes("rate limit") || msg.includes("resource exhausted")) return true;

  // A retired or unknown model. Matched on the message as well as the status because a 404 can also
  // mean a genuinely wrong model name — which the next rung fixes just as well.
  if (statusCode === 404) return true;
  if (msg.includes("no longer available") || msg.includes("is not found") || msg.includes("not supported")) return true;

  // Google's own capacity problem, not ours.
  if (statusCode === 503) return true;
  if (msg.includes("overloaded") || msg.includes("high demand")) return true;

  return false;
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
      if (shouldTryNextModel(err.statusCode, err.message)) {
        console.warn(`[GoogleAI] ${model} unavailable (${err.statusCode}: ${err.message}) — trying next model in the ladder`);
        continue;
      }
      // Would fail the same way on every model (bad key, bad prompt, timeout) — surface it now.
      throw err;
    }
  }

  /*
   * Every rung failed. The message says WHY rather than assuming quota: the ladder now also runs
   * for retired models and overload, and "all models hit quota limits" sent people to check billing
   * when in fact Google had retired every model the code knew about.
   */
  const err = new Error(
    `No AI model in the fallback ladder could serve this request (${modelsToTry.join(", ")}). `
    + `Last error: ${lastError?.message || "unknown"}`
  );
  // 429 only when it really was throttling; otherwise 503, which is what "upstream cannot serve
  // this" actually means and stops a retirement being reported to the caller as a rate limit.
  err.statusCode = shouldTryNextModel(lastError?.statusCode, lastError?.message || "")
    && (lastError?.statusCode === 429 || /quota|rate limit|resource exhausted/i.test(lastError?.message || ""))
    ? 429
    : 503;
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

/*
 * `isGoogleQuotaError` used to live here. It was exported, had no callers anywhere in the server,
 * and called `isQuotaError` — the predicate that became `shouldTryNextModel`. So it was already a
 * dangling reference, and only stayed quiet because nothing invoked it.
 *
 * Removed rather than re-pointed: `shouldTryNextModel` is deliberately broader than "was this a
 * quota error", and wiring a function called isGoogleQuotaError to it would have made the name lie.
 * If a caller ever needs a true quota check, write one then, against what it actually needs.
 */
