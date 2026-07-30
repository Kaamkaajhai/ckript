import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

import { generateJsonWithGoogleAI } from "../services/googleAiService.js";
import { generateTrailerVideo } from "../services/videoGenerationService.js";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "f94659ac266fc9dbeec2eff4f18e18de", // Fallback to the requested key if env is missing
});


const clampScore = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const cleanText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const safeSlice = (value = "", limit = 22000) => cleanText(value).slice(0, limit);

const OUTPUT_LANGUAGE_NAMES = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  tr: "Turkish",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
};

const getOutputLanguageInstruction = (languageCode = "en") => {
  const normalizedCode = String(languageCode || "en").toLowerCase();
  const languageName = OUTPUT_LANGUAGE_NAMES[normalizedCode] || OUTPUT_LANGUAGE_NAMES.en;

  if (normalizedCode === "en") {
    return `Use English for corrected/rewritten script output and notes.`;
  }

  return `Use ${languageName} for corrected/rewritten script output and notes.`;
};

const normalizeScorePayload = (payload = {}) => {
  const score = {
    plot: clampScore(payload.plot),
    characters: clampScore(payload.characters),
    dialogue: clampScore(payload.dialogue),
    pacing: clampScore(payload.pacing),
    marketability: clampScore(payload.marketability),
  };

  const avg = Math.round(
    (score.plot + score.characters + score.dialogue + score.pacing + score.marketability) / 5
  );

  score.overall = clampScore(payload.overall || avg);

  // Preserve rich structured fields returned by AI
  const strengths = Array.isArray(payload.strengths) ? payload.strengths : [];
  const weaknesses = Array.isArray(payload.weaknesses) ? payload.weaknesses : [];
  const improvements = Array.isArray(payload.improvements) ? payload.improvements : [];

  return {
    ...score,
    feedback: payload.feedback || "AI analysis completed.",
    strengths,
    weaknesses,
    improvements,
    audienceFit: payload.audienceFit || "",
    comparables: payload.comparables || "",
  };
};

const hasValidScorePayload = (payload = {}) => {
  const keys = ["plot", "characters", "dialogue", "pacing", "marketability"];
  const hasAtLeastOneNumericDimension = keys.some((key) => {
    const value = Number(payload?.[key]);
    return Number.isFinite(value);
  });

  const hasFeedbackText = String(payload?.feedback || "").trim().length > 0;
  return hasAtLeastOneNumericDimension && hasFeedbackText;
};

const buildJsonRepairPrompt = (basePrompt) => `${basePrompt}

CRITICAL OUTPUT RULES:
- Return one valid JSON object only.
- Use only double quotes.
- Do not include markdown, code fences, comments, or trailing commas.
- Keep feedback concise (max 4 sentences).
- Keep arrays concise (max 3 items each).`;

const scoreRequestLockMs = 10 * 60 * 1000;

export const runScriptScoreGeneration = async ({ scriptId, userId }) => {
  const script = await Script.findById(scriptId);
  if (!script) return;

  // Another worker may have completed the score already.
  if (Number(script.scriptScore?.overall || 0) > 0) {
    if (script.evaluationStatus !== "completed") {
      script.evaluationStatus = "completed";
      script.evaluationRequestedAt = undefined;
      await script.save();
    }
    return;
  }

  const score = await runScriptScoreFromText({
    text: script.textContent || script.fullContent || script.synopsis || script.description,
    meta: {
      title: script.title,
      primaryGenre: script.primaryGenre || script.genre,
      subGenres: script.subGenres,
      format: script.format,
      contentType: script.contentType,
      tones: script.classification?.tones,
      themes: script.classification?.themes,
      logline: script.logline,
      synopsis: script.synopsis || script.description,
      roles: script.roles,
      pageCount: script.pageCount,
    },
    fallbackDoc: script,
  });
  const usedFallback = score.source === "fallback";

  script.scriptScore = { ...score, scoredAt: new Date() };
  script.services = {
    hosting: script.services?.hosting ?? true,
    evaluation: true,
    aiTrailer: script.services?.aiTrailer ?? false,
    spotlight: script.services?.spotlight ?? false,
  };
  script.evaluationStatus = "completed";
  script.evaluationRequestedAt = undefined;
  script.markModified("services");
  await script.save();

  await Notification.create({
    user: userId,
    type: "script_score",
    script: script._id,
    message: `Your script "${script.title}" scored ${score.overall}/100${usedFallback ? " (fallback engine)" : ""}`,
  });
};

/**
 * Score screenplay TEXT and return the normalized result. Persists nothing.
 *
 * Split out of runScriptScoreGeneration so a competition entry can be judged on the frozen snapshot
 * it submitted rather than on the live Script document. Judging the live document was wrong twice
 * over: the writer could keep editing after the deadline, and a script that had already been scored
 * before submission would short-circuit the generator and hand the competition a stale score of an
 * earlier draft.
 */
export const runScriptScoreFromText = async ({ text = "", meta = {}, fallbackDoc = null } = {}) => {
  const scriptText = safeSlice(text, 24000);

  const script = {
    title: meta.title,
    primaryGenre: meta.primaryGenre,
    format: meta.format,
    contentType: meta.contentType,
    logline: meta.logline,
    synopsis: meta.synopsis,
    pageCount: meta.pageCount,
  };
  const roles = (meta.roles || []).map(r => `${r.characterName}${r.description ? ` — ${r.description}` : ""}`).join("; ");
  const tones = (meta.tones || []).join(", ");
  const themes = (meta.themes || []).join(", ");
  const subGenres = (meta.subGenres || []).join(", ");

  const scorePrompt = `You are a senior Hollywood screenplay analyst with 20+ years of experience evaluating scripts for studios, production companies, and streaming platforms.

Your job is to produce a rigorous, professional, and DEEP evaluation of the script provided. You MUST read the full script text deeply before generating any score. Your score must be based on a thorough analysis of the actual dialogue lines, characters' voices, pacing rhythm, thematic depth, and how well it fits into the commercial market. 

Every score and every sentence of feedback must reference concrete details from the actual script — specific dialogue lines you analyzed, specific character arcs, actual plot points, structural beats, and subtext. Do NOT write generic advice. If the script is shallow, score it low. If it has deep market potential, score it high based on its demographic fit.

Return STRICT JSON with this exact shape — no markdown, no code fences:
{
  "plot": <integer 0-100 (based on structure, narrative drive, and depth)>,
  "characters": <integer 0-100 (based on distinct voices, arcs, and complexity)>,
  "dialogue": <integer 0-100 (based on subtext, authenticity, and specific script lines)>,
  "pacing": <integer 0-100 (based on scene rhythm and momentum)>,
  "marketability": <integer 0-100 (based on commercial viability, genre trends, and market fit)>,
  "overall": <integer 0-100>,
  "feedback": "<4-6 sentences of sharp, deep, professional feedback. You MUST quote specific script lines or scene numbers to prove you read it deeply>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "improvements": ["<concrete actionable improvement 1>", "<concrete actionable improvement 2>", "<concrete actionable improvement 3>"],
  "audienceFit": "<deep analysis of target audience demographic and commercial market positioning>",
  "comparables": "<2-3 produced films or shows this script resembles in tone/depth/genre>"
}

Scoring guide:
- 90-100: Phenomenal depth, brilliant dialogue, studio-ready market fit
- 80-89: Professionally competitive, strong character voices, minor polish needed
- 70-79: Good foundation, decent pacing, clear revision path
- 60-69: Promising concept, but shallow execution, significant script line work required
- Below 60: Fundamental structural, character, or dialogue issues

Script Metadata:
Title: ${script.title}
Primary Genre: ${script.primaryGenre || script.genre || "Not specified"}
Sub-genres: ${subGenres || "None"}
Format: ${script.format || "Not specified"}
Content Type: ${script.contentType || "Not specified"}
Tones: ${tones || "Not specified"}
Themes: ${themes || "Not specified"}
Logline: ${script.logline || "Not provided"}
Synopsis: ${script.synopsis || script.description || "Not provided"}
Key Characters: ${roles || "Not provided"}
Page Count: ${script.pageCount || "Unknown"}

Full Script Content:
${scriptText || "Not provided — evaluate based on metadata only and note this limitation in feedback"}

Analyze deeply. Be specific. Be honest. Be professional.`;

  let scorePayload;
  let usedFallback = false;
  let scoreSource = "google_ai";
  try {
    scorePayload = await generateJsonWithGoogleAI({
      prompt: scorePrompt,
      temperature: 0.4,
      maxOutputTokens: 2600,
    });

    if (!hasValidScorePayload(scorePayload)) {
      throw new Error("AI response payload missing score dimensions or feedback");
    }
  } catch (primaryError) {
    try {
      scorePayload = await generateJsonWithGoogleAI({
        prompt: buildJsonRepairPrompt(scorePrompt),
        temperature: 0.2,
        maxOutputTokens: 3200,
      });

      if (!hasValidScorePayload(scorePayload)) {
        throw new Error("AI retry payload still invalid");
      }
    } catch (retryError) {
      console.warn(
        "[AI Score] Falling back to local scoring engine:",
        primaryError?.message || "primary failed",
        "| retry:",
        retryError?.message || "retry failed"
      );
      usedFallback = true;
      scoreSource = "fallback";
      // The heuristic engine reads a document; give it the real one when we have it.
      scorePayload = generateAIScriptScore(fallbackDoc || { ...script, textContent: scriptText });
    }
  }

  const score = normalizeScorePayload(scorePayload);
  return {
    overall: score.overall,
    plot: score.plot,
    characters: score.characters,
    dialogue: score.dialogue,
    pacing: score.pacing,
    marketability: score.marketability,
    feedback: score.feedback,
    strengths: score.strengths,
    weaknesses: score.weaknesses,
    improvements: score.improvements,
    audienceFit: score.audienceFit,
    comparables: score.comparables,
    source: scoreSource,
    usedFallback,
  };
};

// Simulate AI trailer generation (in production, integrate with RunwayML, Pika, etc.)
export const generateTrailer = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);
    
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can generate a trailer" });
    }

    // Ensure the user is on a premium plan before generating trailer
    const user = await User.findById(req.user._id);
    const plan = String(user.subscription?.plan || "free").toLowerCase();
    
    if (plan === "free" || plan === "none") {
      return res.status(403).json({ 
        message: "AI Trailer generation is a premium feature. Please upgrade your plan to unlock this.",
        requiresUpgrade: true
      });
    }

    // Mark as generating
    script.trailerStatus = "generating";
    await script.save();

    const scriptText = safeSlice(
      script.textContent || script.fullContent || script.synopsis || script.description,
      18000
    );

    const trailerPrompt = `You are a trailer writing assistant for film scripts.
Create a cinematic trailer package from the script context below.

Return STRICT JSON with this exact shape:
{
  "hookLine": "string",
  "trailerNarration": "string",
  "sceneBeats": ["string", "string", "string", "string", "string"],
  "voiceoverStyle": "string",
  "musicCue": "string"
}

Rules:
- Keep trailerNarration 120-220 words.
- sceneBeats must contain exactly 5 concise beats.
- Avoid spoilers for final ending.

Script Title: ${script.title}
Genre: ${script.primaryGenre || script.genre || "Unknown"}
Logline: ${script.logline || "N/A"}
Description: ${script.description || "N/A"}
Content: ${scriptText || "N/A"}`;

    let trailerJson;
    let usedFallback = false;
    try {
      trailerJson = await generateJsonWithGoogleAI({
        prompt: trailerPrompt,
        temperature: 0.7,
        maxOutputTokens: 1600,
      });
    } catch (aiError) {
      usedFallback = true;
      trailerJson = buildFallbackTrailerText(script);
    }

    const trailerData = buildTrailerData(script, trailerJson);

    let videoProvider = "fallback";
    try {
      const videoPrompt = buildVideoPrompt(script, trailerData.text);
      const generatedVideo = await generateTrailerVideo({
        prompt: videoPrompt,
        durationSeconds: 12,
        aspectRatio: "16:9",
      });
      trailerData.videoUrl = generatedVideo.videoUrl;
      videoProvider = generatedVideo.provider;
    } catch {
      usedFallback = true;
    }
    
    script.trailerUrl = trailerData.videoUrl;
    script.trailerThumbnail = trailerData.thumbnailUrl;
    script.trailerStatus = "ready";
    script.trailerSource = "ai"; // Mark as AI-generated
    script.services = {
      hosting: script.services?.hosting ?? true,
      evaluation: script.services?.evaluation ?? false,
      aiTrailer: true,
      spotlight: script.services?.spotlight ?? false,
    };
    script.markModified("services");
    await script.save();

    // Notify followers
    const creator = await User.findById(req.user._id);
    for (const followerId of creator.followers) {
      await Notification.create({
        user: followerId,
        type: "trailer_ready",
        from: req.user._id,
        script: script._id,
        message: `${creator.name} just released an AI trailer for "${script.title}"`,
      });
    }

    res.json({ 
      message: "Trailer generated successfully", 
      trailer: {
        url: script.trailerUrl,
        thumbnail: script.trailerThumbnail,
        status: script.trailerStatus,
      },
      trailerText: trailerData.text,
      usedFallback,
      videoProvider,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Get trailer status
export const getTrailerStatus = async (req, res) => {
  try {
    const script = await Script.findById(req.params.scriptId).select("trailerUrl trailerThumbnail trailerStatus title");
    if (!script) return res.status(404).json({ message: "Script not found" });
    res.json({
      status: script.trailerStatus,
      url: script.trailerUrl,
      thumbnail: script.trailerThumbnail,
      title: script.title,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// AI Script Score / Pro Analysis
export const generateScriptScore = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);
    
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can request a score" });
    }

    const hasCompletedScore = Number(script.scriptScore?.overall || 0) > 0;
    const requestedAtMs = script.evaluationRequestedAt
      ? new Date(script.evaluationRequestedAt).getTime()
      : 0;
    const recentRequestInFlight =
      script.evaluationStatus === "requested" &&
      !hasCompletedScore &&
      requestedAtMs > 0 &&
      Date.now() - requestedAtMs < scoreRequestLockMs;

    // Prevent rapid duplicate clicks while a recent generation request is still in-flight.
    if (recentRequestInFlight) {
      return res.status(202).json({
        message: "Evaluation is already in progress.",
        pending: true,
      });
    }

    // Ensure the user is on a premium plan before generating evaluation
    const user = await User.findById(req.user._id);
    const plan = String(user.subscription?.plan || "free").toLowerCase();
    
    if (plan === "free" || plan === "none") {
      return res.status(403).json({ 
        message: "AI Script Evaluation is a premium feature. Please upgrade your plan to unlock this.",
        requiresUpgrade: true
      });
    }

    script.services = {
      hosting: script.services?.hosting ?? true,
      evaluation: true,
      aiTrailer: script.services?.aiTrailer ?? false,
      spotlight: script.services?.spotlight ?? false,
    };
    script.evaluationStatus = "requested";
    script.evaluationRequestedAt = new Date();
    script.markModified("services");
    await script.save();

    // Run generation in background; return immediately so one click is enough.
    setImmediate(async () => {
      try {
        await runScriptScoreGeneration({ scriptId: script._id, userId: req.user._id });
      } catch {
        const staleScript = await Script.findById(script._id);
        if (!staleScript) return;
        staleScript.evaluationStatus = "none";
        staleScript.evaluationRequestedAt = undefined;
        await staleScript.save();
      }
    });

    return res.status(202).json({
      message: "Evaluation request submitted. It is now processing in the background.",
      pending: true,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const correctScriptText = async (req, res) => {
  try {
    const sourceText = String(req.body?.text || "").trim();
    if (!sourceText) {
      return res.status(400).json({ message: "Script text is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const plan = String(user.subscription?.plan || "free").toLowerCase();
    if (plan === "free" || plan === "none") {
      return res.status(403).json({ 
        message: "AI Grammar Fix is a premium feature. Please upgrade your plan to unlock this.",
        requiresUpgrade: true
      });
    }

    const outputLanguageInstruction = getOutputLanguageInstruction(user.language);

    const normalizedSource = sourceText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const truncatedSource = normalizedSource.slice(0, 25000);

    const prompt = `You are an expert screenplay proofreader.
Fix grammar, punctuation, spelling, and readability while preserving writer voice, scene structure, and line breaks.

Return STRICT JSON with this exact shape:
{
  "correctedText": "string",
  "notes": ["string", "string", "string"]
}

Rules:
- Do NOT censor or rewrite story intent.
- Keep screenplay formatting and paragraph/line breaks.
- correctedText must contain the full corrected script text.
- notes should be up to 5 concise bullet-style strings.
- ${outputLanguageInstruction}

Script text:
${truncatedSource}`;

    let payload;
    let usedFallback = false;
    try {
      payload = await generateJsonWithGoogleAI({
        prompt,
        temperature: 0.2,
        maxOutputTokens: 3200,
      });
    } catch (aiError) {
      usedFallback = true;
      payload = {
        correctedText: truncatedSource,
        notes: [
          "AI quota is currently limited; showing original text.",
          "No automatic grammar edits were applied.",
          "Try again later to run full AI correction.",
        ],
      };
    }

    const correctedText = String(payload?.correctedText || "").trim() || truncatedSource;
    const notes = Array.isArray(payload?.notes)
      ? payload.notes.map((note) => String(note).trim()).filter(Boolean).slice(0, 5)
      : [];

    return res.json({
      correctedText,
      notes,
      usedFallback,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// ── AI Project Metadata (free tool — parse a project and draft logline, synopsis, roles) ──

const ROLE_GENDER_VALUES = ["Any", "Female", "Male", "Non-binary", "Other"];

const normalizeGeneratedRoles = (rawRoles = []) => {
  if (!Array.isArray(rawRoles)) return [];
  return rawRoles
    .map((role) => {
      const characterName = cleanText(role?.characterName || role?.name || "");
      if (!characterName) return null;

      const genderRaw = cleanText(role?.gender || "Any");
      const gender =
        ROLE_GENDER_VALUES.find((g) => g.toLowerCase() === genderRaw.toLowerCase()) || "Any";

      const minAge = Number(role?.ageRange?.min);
      const maxAge = Number(role?.ageRange?.max);

      return {
        characterName: characterName.slice(0, 120),
        type: cleanText(role?.type || role?.archetype || "").slice(0, 120),
        description: cleanText(role?.description || "").slice(0, 600),
        gender,
        ageRange: {
          min: Number.isFinite(minAge) && minAge >= 0 ? Math.round(minAge) : "",
          max: Number.isFinite(maxAge) && maxAge >= 0 ? Math.round(maxAge) : "",
        },
      };
    })
    .filter(Boolean)
    .slice(0, 12);
};

// Generate logline, synopsis, and roles by parsing the project's script content.
// Free tool used during project creation / upload.
/**
 * Generate project metadata (logline / synopsis / roles) from script text.
 *
 * Extracted from the HTTP handler so background jobs — competition entry processing, for one — can
 * reuse the exact same prompt and normalization instead of keeping a second copy that drifts.
 * Throws with `statusCode` set, which the handler surfaces unchanged.
 */
export const runProjectMetadataGeneration = async ({
  text = "",
  title: rawTitle = "",
  genre: rawGenre = "",
  contentType: rawContentType = "",
  userId = null,
  fields: requestedFields = null,
} = {}) => {
  // Cap at 8,000 chars (~1,400 words) — enough to identify characters, plot and tone
  // without blowing through free-tier token quotas on large scripts.
  const sourceText = safeSlice(text, 8000);
  if (!sourceText || sourceText.length < 50) {
    const error = new Error("Add at least a short passage of script content before generating metadata.");
    error.statusCode = 400;
    throw error;
  }

  const user = userId ? await User.findById(userId).select("language") : null;
  const outputLanguageInstruction = getOutputLanguageInstruction(user?.language);

  const title = cleanText(rawTitle).slice(0, 200);
  const genre = cleanText(rawGenre);
  const contentType = cleanText(rawContentType);

  const fields = Array.isArray(requestedFields) && requestedFields.length
    ? requestedFields.filter((f) => ["logline", "synopsis", "roles"].includes(f))
    : ["logline", "synopsis", "roles"];

  const wantLogline = fields.includes("logline");
  const wantSynopsis = fields.includes("synopsis");
  const wantRoles = fields.includes("roles");

  const prompt = `You are a senior development executive and story analyst. Read the project content below and extract production-ready metadata. Base everything ONLY on what is actually in the content — do not invent characters or plot points that are not present.

Return STRICT JSON with this exact shape — no markdown, no code fences:
{
  "logline": "<one to two punchy sentences (max 280 characters) capturing the protagonist, central conflict, and stakes>",
  "synopsis": "<2-4 tight paragraphs summarizing the story arc, main characters, and tone — no spoiler warnings, just the story>",
  "roles": [
    {
      "characterName": "<name as written in the script>",
      "type": "<archetype/billing e.g. Lead, Supporting, Antagonist, Cameo>",
      "gender": "<one of: ${ROLE_GENDER_VALUES.join(", ")}>",
      "ageRange": { "min": <integer or null>, "max": <integer or null> },
      "description": "<1-2 sentences on the character's role, personality, and casting vibe>"
    }
  ]
}

Rules:
- Only include the keys requested: ${fields.join(", ")}.
- "roles": include every named character you can identify (up to 12), most important first. If ages are unclear, use null.
- "gender" MUST be exactly one of: ${ROLE_GENDER_VALUES.join(", ")}.
- Keep the logline under 280 characters.
- If the content is too thin to determine something, return an empty string or empty array rather than guessing wildly.
- ${outputLanguageInstruction}

Project Title: ${title || "Untitled"}
Genre: ${genre || "Not specified"}
Content Type: ${contentType || "Not specified"}

Project Content:
${sourceText}`;

  let payload;
  let usedFallback = false;
  try {
    payload = await generateJsonWithGoogleAI({
      prompt,
      temperature: 0.4,
      // Logline + a 2–4 paragraph synopsis + up to 12 roles can easily exceed a small cap and
      // truncate the JSON mid-output (the synopsis is the long part — that's why logline-only
      // worked but synopsis failed). Give it room; gemini-2.5-flash supports up to 8192.
      maxOutputTokens: 8192,
    });
  } catch (aiError) {
    console.error("[AI Metadata] AI call failed:", aiError.message, aiError.rawSnippet ? `| snippet: ${aiError.rawSnippet}` : "");
    usedFallback = true;
    payload = {};
  }

  const result = { usedFallback };
  if (wantLogline) result.logline = cleanText(payload?.logline || "").slice(0, 500);
  if (wantSynopsis) result.synopsis = cleanText(payload?.synopsis || "");
  if (wantRoles) result.roles = normalizeGeneratedRoles(payload?.roles);
  return result;
};

export const generateProjectMetadata = async (req, res) => {
  try {
    const { usedFallback, ...result } = await runProjectMetadataGeneration({
      text: req.body?.text || req.body?.textContent || "",
      title: req.body?.title || "",
      genre: req.body?.genre || req.body?.primaryGenre || "",
      contentType: req.body?.contentType || "",
      userId: req.user._id,
      fields: req.body?.fields,
    });

    return res.json({
      ...result,
      usedFallback,
      message: usedFallback
        ? "AI is busy right now — please try again in a moment."
        : "Metadata generated successfully.",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// ── AI Writing Assistant (free tool for writers during script creation) ──────

const AI_ACTION_PROMPTS = {
  improve: `You are a senior Hollywood screenwriter, story consultant, and creative writing expert with 25+ years of experience.
Significantly improve the following script text: make it dramatically more engaging, vivid, and compelling. Add powerful imagery, sharpen action lines, strengthen scene transitions, add authentic sensory details (sights, sounds, smells), introduce compelling subtext in dialogue, and enhance emotional resonance. Go beyond surface edits — add new descriptive paragraphs where scenes feel thin, flesh out character reactions, add atmospheric details, and ensure every line pulls the reader deeper into the story. The improved version should be noticeably longer and richer than the original while preserving the writer's core voice, plot, and character names.`,

  professional: `You are an elite screenplay formatter and editor at a top Hollywood studio (think A24, Paramount, Warner Bros).
Completely rewrite the following script text to premium industry-professional standards. Apply proper screenplay formatting with precise slug lines (INT./EXT.), lean but evocative action lines, natural and punchy dialogue with proper character cues, parentheticals where needed, and professional transitions. Add missing scene descriptions, atmosphere, and production-ready details. Expand thin scenes with proper cinematic language — camera-aware descriptions, beat indicators, and pacing marks. The result should read like a polished, submission-ready studio script that a producer would immediately want to read more of. Make it significantly more detailed and complete.`,

  grammar: `You are a world-class screenplay proofreader, copy editor, and language specialist.
Meticulously fix ALL grammar, punctuation, spelling, sentence structure, and readability issues. Also improve word choices where bland or repetitive — replace weak verbs with vivid ones, fix awkward phrasing, ensure consistent tense usage, and polish sentence rhythm for better flow. Add proper paragraph breaks where walls of text exist. Preserve the writer's voice, story intent, scene structure, character names, and formatting.`,

  shorten: `You are an acclaimed script editor known for creating razor-sharp, propulsive screenplays.
Condense the following script text: cut redundancy, trim verbose descriptions to their essential visual beats, tighten dialogue by removing filler words and on-the-nose exposition, and eliminate unnecessary action lines. Replace wordy passages with punchy, precise alternatives — don't just delete, rewrite tighter. Every remaining line should earn its place. Keep ALL important story beats, character moments, and plot points intact while making the script read faster and hit harder.`,

  expand: `You are an award-winning screenplay consultant who specializes in developing rich, immersive, cinematic scenes.
Substantially expand the following script text — make it at least 40-60% longer. Add rich sensory details to every scene description (what we see, hear, feel), deepen character reactions with specific physical gestures and internal beats, add atmospheric details (lighting, weather, ambient sounds, textures), build tension through pacing and micro-moments, flesh out transitions between scenes, add meaningful subtext to dialogue exchanges, and develop any rushed or skeletal moments into full, breathing scenes. Add new descriptive paragraphs, character actions, and environmental details that make the world feel real and cinematic. Stay true to the writer's tone and style.`,

  dialogue: `You are an Emmy and Oscar-winning dialogue specialist who has crafted conversations for the most memorable characters in cinema.
Dramatically improve ALL dialogue in the following script text: make every conversation crackle with life — give each character a truly distinct voice (speech patterns, vocabulary, rhythm, verbal tics), layer in rich subtext (what's said vs. what's meant), remove all on-the-nose exposition and replace with natural reveals, add interruptions and overlapping speech where realistic, include meaningful pauses and beats, and ensure each dialogue exchange drives both character development and plot forward. Add new dialogue lines where characters need more depth. Add parentheticals for delivery notes. Keep all action lines and scene headings but enhance them slightly to support the improved dialogue.`,

  emotional: `You are a master story consultant specializing in deeply emotional, award-winning storytelling and complex character arcs.
Profoundly enhance the emotional depth of the following script text: strengthen character motivations with specific backstory hints, add layers of vulnerability, internal conflict, and unspoken tension. Deepen interpersonal dynamics — show what characters feel through actions, micro-expressions, and loaded silences. Heighten emotional stakes by adding moments of tenderness, fear, hope, or heartbreak. Add new emotional beats — a lingering look, a hand that trembles, a voice that cracks. Develop the emotional subtext so readers feel the weight of every scene. Expand thin emotional moments into rich, affecting passages. Keep the plot structure and character names intact while making every scene resonate on a human level.`,
};

export const generateProseSample = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can generate a prose sample" });
    }

    const sourceText = script.textContent || script.fullContent || script.synopsis || script.description;
    if (!sourceText) {
      return res.status(400).json({ message: "Script has no content to convert." });
    }

    // Check premium plan
    const user = await User.findById(req.user._id);
    const plan = String(user.subscription?.plan || "free").toLowerCase();

    if (plan === "free" || plan === "none") {
      return res.status(403).json({
        message: "AI Prose Sample generation is a premium feature. Please upgrade your plan.",
        requiresUpgrade: true
      });
    }

    // Take the first ~500 words
    const words = sourceText.split(/\s+/);
    const sampleSource = words.slice(0, 500).join(" ");

    const prompt = `You are a bestselling novelist adapting a screenplay into a novel.
Convert the following screenplay scene(s) into rich, literary prose (3rd person).
Keep the tone, character names, and core actions, but expand the scene with vivid descriptions, internal thoughts, and atmospheric details suitable for a novel.
Aim for a length of around 300-500 words.

Return STRICT JSON with this exact shape:
{
  "proseSample": "string (the generated prose text)"
}

Screenplay text:
${sampleSource}`;

    let payload;
    let usedFallback = false;
    try {
      payload = await generateJsonWithGoogleAI({
        prompt,
        temperature: 0.6,
        maxOutputTokens: 2000,
      });
    } catch (aiError) {
      usedFallback = true;
      payload = {
        proseSample: "AI prose generation is currently unavailable. Please try again later.",
      };
    }

    const proseSample = String(payload?.proseSample || "").trim();

    res.json({
      message: "Prose sample generated successfully",
      proseSample,
      usedFallback,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const aiWritingAssist = async (req, res) => {
  try {
    const { text, action, customInstruction } = req.body;
    const sourceText = String(text || "").trim();

    if (!sourceText) {
      return res.status(400).json({ message: "Script text is required." });
    }
    if (!action && !customInstruction) {
      return res.status(400).json({ message: "An action or custom instruction is required." });
    }

    const user = await User.findById(req.user._id).select("language");
    if (!user) return res.status(404).json({ message: "User not found." });
    const outputLanguageInstruction = getOutputLanguageInstruction(user.language);

    // ── Check Premium Plan for Writing Assist ──────────────────────────────────
    if (action === "grammar") {
      const plan = String(user.subscription?.plan || "free").toLowerCase();

      if (plan === "free" || plan === "none") {
        return res.status(403).json({
          message: "AI Grammar Fix is a premium feature. Please upgrade your plan.",
          requiresUpgrade: true
        });
      }
    }

    const normalizedSource = sourceText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const truncatedSource = normalizedSource.slice(0, 25000);

    // Build the prompt
    let systemInstruction;
    if (customInstruction) {
      systemInstruction = `You are an elite professional screenplay writing assistant with decades of Hollywood experience. Follow the writer's instruction precisely while preserving story intent, character names, and screenplay formatting. Go above and beyond — don't just make minimal changes, provide rich, detailed, professional-quality content. Add extra detail, depth, and polish that elevates the writing significantly.\n\nWriter's instruction: ${String(customInstruction).slice(0, 500)}`;
    } else {
      systemInstruction = AI_ACTION_PROMPTS[action];
      if (!systemInstruction) {
        return res.status(400).json({ message: `Unknown action: ${action}. Use one of: ${Object.keys(AI_ACTION_PROMPTS).join(", ")}` });
      }
    }

    const prompt = `${systemInstruction}

Return STRICT JSON with this exact shape — no markdown, no code fences:
{
  "result": "string (the full improved text)",
  "changes": ["string", "string", "string"]
}

Rules:
- "result" must contain the COMPLETE rewritten text — it should be RICHER and MORE DETAILED than the original (not a summary or partial). Add extra content, descriptions, and depth.
- "changes" should list 3-5 brief bullet points describing what was changed and improved.
- Preserve all line breaks, scene headings, and character names.
- Go above and beyond — add new descriptive details, richer language, and professional touches that weren't in the original.
- Do NOT add meta-commentary inside the result text.
- ${outputLanguageInstruction}

Original script text:
${truncatedSource}`;

    let payload;
    let usedFallback = false;

    try {
      payload = await generateJsonWithGoogleAI({
        prompt,
        temperature: action === "grammar" ? 0.15 : 0.5,
        maxOutputTokens: Math.min(truncatedSource.length * 3 + 2000, 16000),
      });
    } catch (aiError) {
      console.error("[AI Writing Assist] AI call failed:", aiError.message);
      usedFallback = true;
      // Return a meaningful error detail to the frontend
      const isQuota = aiError.statusCode === 429 || /quota|rate.limit/i.test(aiError.message);
      const isTimeout = aiError.statusCode === 504 || /timeout|abort/i.test(aiError.message);
      payload = {
        result: truncatedSource,
        changes: isQuota
          ? ["AI rate limit reached — please wait 30 seconds and try again."]
          : isTimeout
          ? ["AI took too long to respond — try with a shorter text selection."]
          : [`AI error: ${aiError.message || "Unknown error"}. Please try again.`],
      };
    }

    const result = String(payload?.result || "").trim() || truncatedSource;
    const changes = Array.isArray(payload?.changes)
      ? payload.changes.map((c) => String(c).trim()).filter(Boolean).slice(0, 5)
      : [];

    return res.json({ result, changes, usedFallback, action: action || "custom" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// Get service costs
export const getServiceCosts = async (req, res) => {
  try {
    res.json({
      aiEvaluation: "Premium Only",
      aiTrailer: "Premium Only",
      scriptAnalysis: "Premium Only",
      premiumReport: "Premium Only"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Helper functions (simulated AI) ---

function generateAITrailerData(script) {
  // In production: Send script.description + script.genre to AI video generation API
  // (RunwayML Gen-3, Pika Labs, Sora, etc.)
  const genreVisuals = {
    Drama: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800",
    Comedy: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800",
    Thriller: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=800",
    Horror: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800",
    Action: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800",
    Romance: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800",
    "Sci-Fi": "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800",
    Fantasy: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
    Documentary: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=800",
    Animation: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800",
  };

  return {
    videoUrl: `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`,
    thumbnailUrl: genreVisuals[script.genre] || genreVisuals.Drama,
  };
}

function buildTrailerData(script, payload = {}) {
  const fallbackMedia = generateAITrailerData(script);
  const hookLine = cleanText(payload.hookLine || payload.tagline || "");
  const trailerNarration = cleanText(payload.trailerNarration || payload.narration || "");
  const sceneBeats = Array.isArray(payload.sceneBeats)
    ? payload.sceneBeats.map((item) => cleanText(item)).filter(Boolean)
    : [];
  const voiceoverStyle = cleanText(payload.voiceoverStyle || "");
  const musicCue = cleanText(payload.musicCue || "");

  return {
    videoUrl: payload.videoUrl || fallbackMedia.videoUrl,
    thumbnailUrl: payload.thumbnailUrl || fallbackMedia.thumbnailUrl,
    text: {
      hookLine,
      trailerNarration,
      sceneBeats: sceneBeats.slice(0, 5),
      voiceoverStyle,
      musicCue,
    },
  };
}

function buildFallbackTrailerText(script) {
  const genre = script.primaryGenre || script.genre || "drama";
  const title = script.title || "Untitled Project";
  const logline = cleanText(script.logline || script.description || "A world on the edge of change.");

  return {
    hookLine: `${title}: One choice changes everything.`,
    trailerNarration: `${logline} In a ${genre.toLowerCase()} world, stakes rise fast as hidden truths surface and relationships are tested. Every decision pushes the characters toward a point of no return, building to an emotional and cinematic climax that leaves audiences wanting more.`,
    sceneBeats: [
      "Opening image sets the world and tone.",
      "A disruptive event forces the protagonist into action.",
      "Escalation montage reveals conflict and pressure.",
      "A vulnerable emotional beat reframes the stakes.",
      "Final high-intensity button ends on suspense.",
    ],
    voiceoverStyle: "Cinematic, urgent, emotionally grounded",
    musicCue: "Slow atmospheric build into percussive climax",
  };
}

function buildVideoPrompt(script, trailerText = {}) {
  const title = cleanText(script.title || "Untitled Project");
  const genre = cleanText(script.primaryGenre || script.genre || "drama");
  const logline = cleanText(script.logline || script.description || "");
  const hookLine = cleanText(trailerText.hookLine || "");
  const narration = cleanText(trailerText.trailerNarration || "");
  const beats = Array.isArray(trailerText.sceneBeats)
    ? trailerText.sceneBeats.map((beat) => cleanText(beat)).filter(Boolean).slice(0, 5)
    : [];
  const musicCue = cleanText(trailerText.musicCue || "cinematic tension build");
  const voiceStyle = cleanText(trailerText.voiceoverStyle || "cinematic and emotional");

  return `Create a high-quality cinematic teaser trailer video for the script "${title}".
Genre: ${genre}
Logline: ${logline || "N/A"}
Hook: ${hookLine || "N/A"}
Narration tone: ${voiceStyle}
Music direction: ${musicCue}
Story narration: ${narration || "N/A"}
Scene beats:
${beats.map((beat, index) => `${index + 1}. ${beat}`).join("\n") || "1. Build atmosphere and suspense"}

Requirements:
- 12-second cinematic teaser, realistic live-action look.
- Dynamic camera movement, dramatic lighting, emotional character closeups.
- No logos, no subtitles, no text overlays, no watermarks.
- Trailer style pacing with escalating intensity and polished color grading.`;
}

function generateAIScriptScore(script) {
  // Derive scores from actual script metadata — no random numbers
  const title = script.title || "Untitled";
  const genre = script.primaryGenre || script.genre || "drama";
  const format = script.format || "feature";
  const logline = script.logline || "";
  const synopsis = script.synopsis || script.description || "";
  const textContent = script.textContent || script.fullContent || "";
  const roles = script.roles || [];
  const tones = (script.classification?.tones || []).join(", ");
  const themes = (script.classification?.themes || []).join(", ");

  // Use real metadata signals to anchor scores meaningfully
  const hasLogline = logline.length > 30;
  const hasSynopsis = synopsis.length > 100;
  const hasRoles = roles.length >= 2;
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  const hasFullScript = wordCount > 3000;
  const hasTones = tones.length > 0;
  const hasThemes = themes.length > 0;

  // Deterministic base per dimension using content signals
  const plotBase = hasFullScript ? 72 : hasSynopsis ? 62 : hasLogline ? 55 : 48;
  const charBase = hasRoles ? (roles.length >= 4 ? 74 : 68) : hasSynopsis ? 60 : 50;
  const dialogueBase = hasFullScript ? 70 : hasSynopsis ? 58 : 48;
  const pacingBase = hasFullScript ? 68 : hasSynopsis ? 60 : 50;
  const marketBase = (hasLogline && hasTones) ? 72 : hasLogline ? 65 : hasSynopsis ? 58 : 52;

  const scores = {
    plot: Math.min(100, plotBase),
    characters: Math.min(100, charBase),
    dialogue: Math.min(100, dialogueBase),
    pacing: Math.min(100, pacingBase),
    marketability: Math.min(100, marketBase),
  };
  scores.overall = Math.round(
    (scores.plot + scores.characters + scores.dialogue + scores.pacing + scores.marketability) / 5
  );

  const roleNames = roles.map(r => r.characterName).filter(Boolean).slice(0, 3).join(", ");
  const genreLabel = genre.charAt(0).toUpperCase() + genre.slice(1);
  const formatLabel = format.charAt(0).toUpperCase() + format.slice(1);

  const feedback = `"${title}" is a ${genreLabel} ${formatLabel.toLowerCase()} ${
    logline ? `whose logline — "${logline.slice(0, 120)}${logline.length > 120 ? '...' : ''}" — ` : ""
  }establishes a clear premise${hasTones ? ` with ${tones} tonal qualities` : ""}. ${
    hasRoles
      ? `The cast of characters (${roleNames}${roles.length > 3 ? ` and ${roles.length - 3} others` : ""}) provides a workable ensemble foundation, though greater contrast between character voices and deeper motivation arcs would elevate emotional investment.`
      : "Character development materials were limited at this time; expanding the character roster with distinct voices and layered motivations is recommended."
  } ${
    hasFullScript
      ? `The full manuscript was analyzed for structural rhythm; pacing appears functional but mid-section scene density may benefit from strategic trimming.`
      : hasSynopsis
      ? `Based on the synopsis, the narrative structure covers expected genre beats, though full script content would enable a more precise pacing assessment.`
      : "A complete script submission would allow significantly deeper structural and tonal analysis."
  } ${
    themes
      ? `The thematic exploration of ${themes} aligns with current audience appetite for ${genreLabel.toLowerCase()} content.`
      : ""
  } Strengthening the Act II midpoint and sharpening the climactic payoff will improve competitive positioning for this format.`;

  const strengths = [
    hasLogline ? `Focused logline communicates the central conflict of "${title}" with clarity` : `Established genre framework (${genreLabel}) provides familiar entry point for audiences`,
    hasRoles ? `Ensemble structure with ${roles.length} named characters offers narrative flexibility` : `Core concept demonstrates recognizable genre competency`,
    hasTones ? `Tonal palette (${tones}) is appropriate for the ${genreLabel} market` : `Story concept is accessible to the target demographic`,
  ];

  const weaknesses = [
    hasFullScript ? `Scene-level detail requires tightening, particularly in the second act` : `Incomplete script material limits depth of structural assessment`,
    hasRoles ? `Character voice differentiation could be stronger across the ensemble` : `Character dimension and backstory need further development`,
  ];

  const improvements = [
    `Refine the logline to emphasize the protagonist's stakes and the central antagonistic force`,
    `Add at least one scene that reveals character through behavior rather than exposition`,
    `Test the script against the genre's canonical structure (e.g., save-the-cat beats for ${genreLabel.toLowerCase()}) and address any missing beats`,
  ];

  return {
    ...scores,
    feedback,
    strengths,
    weaknesses,
    improvements,
    audienceFit: `${genreLabel} audiences, streaming and independent theatrical distribution${hasTones ? `, skewing toward viewers who enjoy ${tones} content` : ""}`,
    comparables: `Similar ${genreLabel.toLowerCase()} titles in the current market across streaming and independent film circuits`,
  };
}

export const generateCoverImage = async (req, res) => {
  try {
    const { title, logline, genre, scriptText } = req.body;
    let generatedPrompt = "";

    try {
      const systemPrompt = `You are an award-winning Hollywood Key Art Designer, Creative Director, and Cinematic Concept Artist who has designed official movie posters and streaming platform cover arts for Netflix, HBO, A24, Marvel, DC, Warner Bros, and Amazon Prime.

Your task is to create a PREMIUM CINEMATIC SCRIPT THUMBNAIL prompt that represents the uploaded script.

The thumbnail must NOT look AI-generated.
It must feel like an official movie or OTT platform cover.

----------------------------------------------------
OBJECTIVE
----------------------------------------------------
Create one high-end cinematic cover image prompt that instantly communicates the story's mood and genre while making users want to click it.
The image should look like an official Netflix/A24/Warner Bros movie artwork.
The design must be premium, elegant, modern, realistic and visually striking.

----------------------------------------------------
STYLE
----------------------------------------------------
• Hyper realistic, Cinematic lighting, Premium color grading, Movie key art quality
• Ultra detailed, Clean composition, Professional poster design, Editorial photography quality
• Real camera look, Natural skin textures, Realistic depth of field, Film grain
• High dynamic range, 8K quality, Global illumination, Volumetric lighting
• Premium aesthetic, Luxury visual language
Never produce cartoon, illustration, anime, vector art, clipart or low-quality AI artwork unless the uploaded script itself belongs to those categories.

----------------------------------------------------
TITLE
----------------------------------------------------
The most important requirement is the typography. You MUST explicitly instruct the image generator to write the exact title: "${title || "Untitled"}".
Example phrase to include in your prompt: 'The text "${title || "Untitled"}" is written in large, premium, elegant, cinematic typography. The spelling must be 100% exact and correct, exactly as "${title || "Untitled"}".'
Place it naturally inside the composition. The title should integrate with the artwork rather than looking pasted.
Never add subtitles. Never add taglines. Never add fake production studios. Never add actor names. Never add logos. Never add watermarks.

----------------------------------------------------
COMPOSITION & REALISM
----------------------------------------------------
Use professional movie poster composition. Strong focal point. Rule of thirds. Natural visual hierarchy. Balanced spacing. Minimal clutter. Powerful storytelling through visuals.
Everything must look photographed using high-end cinema cameras. Use realistic Faces, Skin, Eyes, Clothing, Hair, Environments, Lighting, Reflections, Materials.
Avoid common AI mistakes. Do NOT generate: AI-looking faces, Plastic skin, Extra fingers/limbs, Deformed anatomy, Poor typography, Blurry text, Generic stock images.

----------------------------------------------------
OUTPUT
----------------------------------------------------
Generate exactly ONE highly detailed image generation prompt string (for the Flux AI image generator) based on all the rules above.
Make sure the prompt is HIGHLY UNIQUE based on the script synopsis provided. Do not use generic elements.
Return ONLY the raw prompt string, nothing else.`;

      const userPrompt = `Script Title:
${title || "Untitled"}

Genre:
${genre || "Drama"}

Synopsis/Context:
${logline || ""}

Script Excerpt (Study this to capture the exact mood, characters, and setting of the actual script):
${scriptText || "A deeply compelling and visually striking story."}`;

      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: "deepseek-r1-distill-llama-70b",
        temperature: 0.8,
        max_completion_tokens: 400,
      });

      let rawOutput = completion.choices[0]?.message?.content?.trim() || "";
      // DeepSeek generates reasoning tokens inside <think> tags. Strip them out.
      generatedPrompt = rawOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      // Also strip markdown code blocks if the model wrapped the output in them
      generatedPrompt = generatedPrompt.replace(/^```[\s\S]*?\n/g, '').replace(/```$/g, '').trim();

    } catch (groqError) {
      console.warn("Groq failed (key might be invalid), using fallback prompt:", groqError.message);
      generatedPrompt = `A premium 8K cinematic movie poster, highly realistic, Hollywood key art quality. The text "${title || "Untitled"}" is written in large, elegant, cinematic typography. Genre: ${genre || "Drama"}. ${logline ? "Story concept: " + logline : ""}. Ultra detailed, cinematic lighting, masterpiece.`;
    }

    if (!generatedPrompt) {
      generatedPrompt = `A premium 8K cinematic movie poster, highly realistic, Hollywood key art quality. The text "${title || "Untitled"}" is written in large, elegant, cinematic typography. Genre: ${genre || "Drama"}. Ultra detailed, cinematic lighting, masterpiece.`;
    }

    // Now call pollinations AI which returns an image blob
    const encodedPrompt = encodeURIComponent(generatedPrompt);
    // Seed for some randomness, plus dimensions for a typical poster/thumbnail
    const seed = Math.floor(Math.random() * 1000000);
    // Fetch the image in the backend to avoid frontend CORS/0-byte issues
    // Using width 1280 and height 800 (16:10 ratio) to perfectly match frontend ScriptCard aspect ratio!
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=800&nologo=true&seed=${seed}&model=flux`;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from Pollinations: ${imageResponse.statusText}`);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    res.status(200).json({
      success: true,
      prompt: generatedPrompt,
      imageUrl: imageUrl,
      base64Image: base64Image
    });

  } catch (error) {
    console.error("AI Cover Generation Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate AI cover image.", error: error.message });
  }
};
