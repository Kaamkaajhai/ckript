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

export const generateJsonWithGoogleAI = async ({
  prompt,
  temperature = 0.3,
  maxOutputTokens = 3000,
}) => {
  const { text } = await generateWithGoogleAI({
    prompt,
    temperature,
    maxOutputTokens,
    responseMimeType: "application/json",
  });

  try {
    return JSON.parse(text);
  } catch {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      const err = new Error("AI returned invalid JSON");
      err.statusCode = 502;
      throw err;
    }
    const possibleJson = text.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(possibleJson);
    } catch {
      const err = new Error("AI returned malformed JSON");
      err.statusCode = 502;
      throw err;
    }
  }
};

export const isGoogleQuotaError = (error) => {
  if (!error) return false;
  return isQuotaError(error.statusCode, error.message);
};
