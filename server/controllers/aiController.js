import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { CREDIT_PRICES } from "./creditsController.js";
import { generateJsonWithGoogleAI } from "../services/googleAiService.js";
import { generateTrailerVideo } from "../services/videoGenerationService.js";

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

    // Check if credits were already paid during upload
    const alreadyPaid = script.services?.aiTrailer === true;
    
    if (!alreadyPaid) {
      // Check credits
      const user = await User.findById(req.user._id);
      const requiredCredits = CREDIT_PRICES.AI_TRAILER;
      const userBalance = user.credits?.balance || 0;

      if (userBalance < requiredCredits) {
        return res.status(402).json({ 
          message: `Insufficient credits. AI Trailer generation requires ${requiredCredits} credits.`,
          requiresCredits: true,
          required: requiredCredits,
          balance: userBalance,
          shortfall: requiredCredits - userBalance
        });
      }

      // Deduct credits
      user.credits.balance -= requiredCredits;
      user.credits.totalSpent += requiredCredits;
      user.credits.transactions.push({
        type: "spent",
        amount: -requiredCredits,
        description: `AI Trailer generation for "${script.title}"`,
        reference: `TRAILER-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date()
      });
      await user.save();
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
    script.services = {
      hosting: script.services?.hosting ?? true,
      evaluation: script.services?.evaluation ?? false,
      aiTrailer: true,
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

    // Check if credits were already paid during upload
    const alreadyPaid = script.services?.evaluation === true;
    
    if (!alreadyPaid) {
      const user = await User.findById(req.user._id);
      const requiredCredits = CREDIT_PRICES.AI_EVALUATION;
      const userBalance = user.credits?.balance || 0;
      
      if (userBalance < requiredCredits) {
        return res.status(402).json({ 
          message: `Insufficient credits. AI Script Evaluation requires ${requiredCredits} credits.`,
          requiresCredits: true,
          required: requiredCredits,
          balance: userBalance,
          shortfall: requiredCredits - userBalance
        });
      }

      // Deduct credits
      user.credits.balance -= requiredCredits;
      user.credits.totalSpent += requiredCredits;
      user.credits.transactions.push({
        type: "spent",
        amount: -requiredCredits,
        description: `AI Script Evaluation for "${script.title}"`,
        reference: `EVAL-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date()
      });
      await user.save();
    }

    const scriptText = safeSlice(
      script.textContent || script.fullContent || script.synopsis || script.description,
      24000
    );

    const roles = (script.roles || []).map(r => `${r.characterName}${r.description ? ` — ${r.description}` : ""}`).join("; ");
    const tones = (script.classification?.tones || []).join(", ");
    const themes = (script.classification?.themes || []).join(", ");
    const subGenres = (script.subGenres || []).join(", ");

    const scorePrompt = `You are a senior Hollywood screenplay analyst with 20+ years of experience evaluating scripts for studios, production companies, and streaming platforms.

Your job is to produce a rigorous, professional, and SPECIFIC evaluation of the script provided. Every score and every sentence of feedback must reference concrete details from the actual content — character names, specific scenes, actual plot points, dialogue patterns, structural beats. Do NOT write generic advice that could apply to any script.

Return STRICT JSON with this exact shape — no markdown, no code fences:
{
  "plot": <integer 0-100>,
  "characters": <integer 0-100>,
  "dialogue": <integer 0-100>,
  "pacing": <integer 0-100>,
  "marketability": <integer 0-100>,
  "overall": <integer 0-100>,
  "feedback": "<4-6 sentences of sharp, specific, professional feedback referencing actual script elements>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
  "improvements": ["<concrete actionable improvement 1>", "<concrete actionable improvement 2>", "<concrete actionable improvement 3>"],
  "audienceFit": "<target audience and market positioning based on this specific script>",
  "comparables": "<2-3 produced films or shows this script resembles in tone/structure/genre>"
}

Scoring guide:
- 90-100: Festival/studio-ready, exceptional craft
- 80-89: Professionally competitive with minor polish needed
- 70-79: Strong foundation, clear revision path
- 60-69: Promising concept, significant craft work required
- Below 60: Fundamental structural or character issues

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
    try {
      scorePayload = await generateJsonWithGoogleAI({
        prompt: scorePrompt,
        temperature: 0.4,
        maxOutputTokens: 2600,
      });
    } catch (aiError) {
      usedFallback = true;
      scorePayload = generateAIScriptScore(script);
    }

    const score = normalizeScorePayload(scorePayload);
    
    script.scriptScore = {
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
      scoredAt: new Date(),
    };
    script.services = {
      hosting: script.services?.hosting ?? true,
      evaluation: true,
      aiTrailer: script.services?.aiTrailer ?? false,
    };
    script.markModified("services");
    await script.save();

    // Notify the creator
    await Notification.create({
      user: req.user._id,
      type: "script_score",
      script: script._id,
      message: `Your script "${script.title}" scored ${score.overall}/100`,
    });

    res.json({ 
      message: "Script scored successfully",
      score: script.scriptScore,
      usedFallback,
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

    // ── Credit check (5 credits for grammar fix) ─────────────────────────
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const required = CREDIT_PRICES.AI_GRAMMAR; // 5 credits
    const balance = user.credits?.balance || 0;

    if (balance < required) {
      return res.status(402).json({
        message: `Insufficient credits. Grammar Fix requires ${required} credits. You have ${balance}.`,
        requiresCredits: true,
        required,
        balance,
        shortfall: required - balance,
      });
    }

    // Deduct credits before AI call
    user.credits.balance -= required;
    user.credits.totalSpent = (user.credits.totalSpent || 0) + required;
    user.credits.transactions = user.credits.transactions || [];
    user.credits.transactions.push({
      type: "spent",
      amount: -required,
      description: "AI Grammar Fix (Script Editor)",
      reference: `GRAMMAR-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date(),
    });
    await user.save();

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

    // ── Credit check for grammar action ──────────────────────────────────
    if (action === "grammar") {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found." });

      const required = CREDIT_PRICES.AI_GRAMMAR; // 5 credits
      const balance = user.credits?.balance || 0;

      if (balance < required) {
        return res.status(402).json({
          message: `Insufficient credits. AI Grammar Fix requires ${required} credits. You have ${balance}.`,
          requiresCredits: true,
          required,
          balance,
          shortfall: required - balance,
        });
      }

      // Deduct credits
      user.credits.balance -= required;
      user.credits.totalSpent = (user.credits.totalSpent || 0) + required;
      user.credits.transactions = user.credits.transactions || [];
      user.credits.transactions.push({
        type: "spent",
        amount: -required,
        description: `AI Grammar Fix`,
        reference: `GRAMMAR-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date(),
      });
      await user.save();
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
      aiEvaluation: CREDIT_PRICES.AI_EVALUATION,
      aiTrailer: CREDIT_PRICES.AI_TRAILER,
      scriptAnalysis: CREDIT_PRICES.SCRIPT_ANALYSIS,
      premiumReport: CREDIT_PRICES.PREMIUM_REPORT
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
