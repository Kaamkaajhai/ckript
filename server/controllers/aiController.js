import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { CREDIT_PRICES } from "./creditsController.js";

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

    // Simulate AI processing (in production, call AI video API)
    // Generate a placeholder trailer based on genre and description
    const trailerData = generateAITrailerData(script);
    
    script.trailerUrl = trailerData.videoUrl;
    script.trailerThumbnail = trailerData.thumbnailUrl;
    script.trailerStatus = "ready";
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
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    // Generate AI score (simulated - in production, use GPT-4 or custom model)
    const score = generateAIScriptScore(script);
    
    script.scriptScore = {
      overall: score.overall,
      plot: score.plot,
      characters: score.characters,
      dialogue: score.dialogue,
      pacing: score.pacing,
      marketability: score.marketability,
      feedback: score.feedback,
      scoredAt: new Date(),
    };
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
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

function generateAIScriptScore(script) {
  // In production: Send script content to GPT-4 or custom fine-tuned model
  // for professional screenplay analysis
  const baseScore = 60 + Math.floor(Math.random() * 30);
  const variation = () => Math.max(20, Math.min(100, baseScore + Math.floor(Math.random() * 20) - 10));
  
  const scores = {
    plot: variation(),
    characters: variation(),
    dialogue: variation(),
    pacing: variation(),
    marketability: variation(),
  };
  scores.overall = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

  const feedbackParts = [];
  if (scores.plot >= 80) feedbackParts.push("Strong plot structure with compelling narrative arcs.");
  else if (scores.plot >= 60) feedbackParts.push("Plot has potential but could benefit from tighter structure in Act 2.");
  else feedbackParts.push("Plot needs significant restructuring. Consider a stronger inciting incident.");

  if (scores.characters >= 80) feedbackParts.push("Well-developed characters with clear motivations.");
  else if (scores.characters >= 60) feedbackParts.push("Characters are decent but need more depth and backstory.");
  else feedbackParts.push("Characters feel underdeveloped. Add more dimension to your protagonist.");

  if (scores.dialogue >= 80) feedbackParts.push("Dialogue is sharp, natural, and serves the story well.");
  else if (scores.dialogue >= 60) feedbackParts.push("Dialogue is functional but could be more distinctive per character.");
  else feedbackParts.push("Dialogue needs work - characters sound too similar.");

  if (scores.pacing >= 80) feedbackParts.push("Excellent pacing that keeps the reader engaged throughout.");
  else if (scores.pacing >= 60) feedbackParts.push("Pacing is uneven - consider trimming scenes in the middle section.");
  else feedbackParts.push("Pacing is slow in Act 2. Consider cutting unnecessary scenes.");

  if (scores.marketability >= 80) feedbackParts.push("High market potential - this concept has strong commercial appeal.");
  else if (scores.marketability >= 60) feedbackParts.push("Moderate market potential. Consider strengthening the unique selling point.");
  else feedbackParts.push("Limited market appeal in current form. Consider targeting a specific niche.");

  return {
    ...scores,
    feedback: feedbackParts.join("\n\n"),
  };
}
