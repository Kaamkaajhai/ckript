const REPLICATE_API_BASE = "https://api.replicate.com/v1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const pickVideoUrl = (output) => {
  const items = asArray(output)
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        return item.url || item.uri || item.video || item.output || "";
      }
      return "";
    })
    .filter(Boolean);

  return items.find((url) => /\.mp4(\?|$)/i.test(url)) || items[0] || "";
};

const buildReplicateHeaders = () => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    const err = new Error("REPLICATE_API_TOKEN is missing.");
    err.statusCode = 503;
    err.code = "VIDEO_PROVIDER_NOT_CONFIGURED";
    throw err;
  }

  return {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };
};

const createReplicatePrediction = async ({ prompt, durationSeconds = 12, aspectRatio = "16:9" }) => {
  const modelVersion = process.env.REPLICATE_MODEL_VERSION;
  if (!modelVersion) {
    const err = new Error("REPLICATE_MODEL_VERSION is missing.");
    err.statusCode = 503;
    err.code = "VIDEO_PROVIDER_NOT_CONFIGURED";
    throw err;
  }

  const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: "POST",
    headers: buildReplicateHeaders(),
    body: JSON.stringify({
      version: modelVersion,
      input: {
        prompt,
        duration: durationSeconds,
        aspect_ratio: aspectRatio,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data?.detail || data?.title || "Failed to create Replicate prediction");
    err.statusCode = response.status;
    err.code = "VIDEO_PROVIDER_REQUEST_FAILED";
    err.rawError = data;
    throw err;
  }

  return data;
};

const pollReplicatePrediction = async (id, { timeoutMs = 240000, intervalMs = 3500 } = {}) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${REPLICATE_API_BASE}/predictions/${id}`, {
      method: "GET",
      headers: buildReplicateHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data?.detail || "Failed to fetch Replicate prediction status");
      err.statusCode = response.status;
      err.code = "VIDEO_PROVIDER_REQUEST_FAILED";
      err.rawError = data;
      throw err;
    }

    if (data.status === "succeeded") return data;

    if (data.status === "failed" || data.status === "canceled") {
      const err = new Error(data?.error || `Replicate prediction ${data.status}`);
      err.statusCode = 502;
      err.code = "VIDEO_PROVIDER_GENERATION_FAILED";
      err.rawError = data;
      throw err;
    }

    await sleep(intervalMs);
  }

  const err = new Error("Video generation timed out");
  err.statusCode = 504;
  err.code = "VIDEO_PROVIDER_TIMEOUT";
  throw err;
};

export const generateTrailerVideo = async ({ prompt, durationSeconds = 12, aspectRatio = "16:9" }) => {
  const provider = (process.env.AI_VIDEO_PROVIDER || "replicate").toLowerCase();

  if (provider !== "replicate") {
    const err = new Error(`Unsupported AI video provider: ${provider}`);
    err.statusCode = 400;
    err.code = "VIDEO_PROVIDER_UNSUPPORTED";
    throw err;
  }

  const created = await createReplicatePrediction({ prompt, durationSeconds, aspectRatio });
  const completed = await pollReplicatePrediction(created.id);
  const videoUrl = pickVideoUrl(completed.output);

  if (!videoUrl) {
    const err = new Error("Video provider returned no playable output URL");
    err.statusCode = 502;
    err.code = "VIDEO_PROVIDER_EMPTY_OUTPUT";
    err.rawError = completed;
    throw err;
  }

  return {
    provider,
    predictionId: completed.id,
    videoUrl,
    raw: completed,
  };
};
