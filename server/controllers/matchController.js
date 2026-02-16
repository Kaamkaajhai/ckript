import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Get smart matches for the current user
export const getSmartMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { page = 1, limit = 20 } = req.query;

    let matches = [];

    if (["investor", "producer", "director"].includes(user.role)) {
      // For industry professionals: match scripts to their preferences
      matches = await getMatchesForProfessional(user, page, limit);
    } else if (user.role === "creator") {
      // For creators: show who's viewing their profile/scripts
      matches = await getMatchesForCreator(user, page, limit);
    } else if (user.role === "actor") {
      // For actors: match roles that fit their profile
      matches = await getMatchesForActor(user, page, limit);
    }

    res.json({ matches, page: parseInt(page), total: matches.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user preferences for smart matching
export const updatePreferences = async (req, res) => {
  try {
    const { genres, budgetRange, contentTypes } = req.body;
    const user = await User.findById(req.user._id);

    if (genres) user.preferences.genres = genres;
    if (budgetRange) user.preferences.budgetRange = budgetRange;
    if (contentTypes) user.preferences.contentTypes = contentTypes;

    await user.save();
    res.json({ message: "Preferences updated", preferences: user.preferences });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Record a script view (for tracking and matching)
export const recordScriptView = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);
    if (!script) return res.status(404).json({ message: "Script not found" });

    // Increment view count
    script.views += 1;
    
    // Add to viewedBy if not already
    const alreadyViewed = script.viewedBy.some(v => v.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      script.viewedBy.push({ user: req.user._id, viewedAt: new Date() });
    }
    await script.save();

    // Add to user's view history
    const user = await User.findById(req.user._id);
    user.viewHistory.push({ script: scriptId, viewedAt: new Date() });
    // Keep only last 100 views
    if (user.viewHistory.length > 100) {
      user.viewHistory = user.viewHistory.slice(-100);
    }
    await user.save();

    // Notify script creator if viewer is a producer/investor/director
    if (["investor", "producer", "director"].includes(user.role)) {
      await Notification.create({
        user: script.creator,
        type: "profile_view",
        from: req.user._id,
        script: script._id,
        message: `${user.name} (${user.role}) just viewed your script "${script.title}"`,
      });
    }

    res.json({ message: "View recorded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Swipe-style matching: Like / Pass on a script
export const swipeScript = async (req, res) => {
  try {
    const { scriptId, action } = req.body; // action: "like" | "pass"
    
    if (action === "like") {
      const script = await Script.findById(scriptId).populate("creator", "name");
      if (!script) return res.status(404).json({ message: "Script not found" });

      const user = await User.findById(req.user._id);

      // Notify the creator
      await Notification.create({
        user: script.creator._id,
        type: "smart_match",
        from: req.user._id,
        script: script._id,
        message: `${user.name} (${user.role}) is interested in "${script.title}"`,
        matchScore: 90,
      });

      res.json({ message: "Interest recorded", matched: true });
    } else {
      res.json({ message: "Script passed" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notifications for the user
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate("from", "name profileImage role")
      .populate("script", "title genre trailerThumbnail")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notifications as read
export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Matching algorithms ---

async function getMatchesForProfessional(user, page, limit) {
  const skip = (page - 1) * limit;
  
  // Build match query based on preferences
  const query = { holdStatus: "available" };
  
  if (user.preferences.genres?.length > 0) {
    query.genre = { $in: user.preferences.genres };
  }
  if (user.preferences.contentTypes?.length > 0) {
    query.contentType = { $in: user.preferences.contentTypes };
  }

  const scripts = await Script.find(query)
    .populate("creator", "name profileImage role")
    .sort({ createdAt: -1, views: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Calculate match scores
  return scripts.map(script => {
    let matchScore = 50; // base score

    // Genre match
    if (user.preferences.genres?.includes(script.genre)) matchScore += 25;
    
    // Content type match
    if (user.preferences.contentTypes?.includes(script.contentType)) matchScore += 15;
    
    // Has trailer boost
    if (script.trailerStatus === "ready") matchScore += 5;
    
    // High script score boost
    if (script.scriptScore?.overall >= 80) matchScore += 5;

    // Recency boost
    const daysSinceUpload = (Date.now() - script.createdAt) / (1000 * 60 * 60 * 24);
    if (daysSinceUpload < 7) matchScore += 5;

    return {
      script,
      matchScore: Math.min(99, matchScore),
      matchReasons: getMatchReasons(user, script),
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

async function getMatchesForCreator(user, page, limit) {
  // Find producers/investors who match the creator's scripts
  const myScripts = await Script.find({ creator: user._id });
  const myGenres = [...new Set(myScripts.map(s => s.genre).filter(Boolean))];

  const professionals = await User.find({
    role: { $in: ["investor", "producer", "director"] },
    "preferences.genres": { $in: myGenres },
  }).select("-password").limit(parseInt(limit));

  return professionals.map(pro => ({
    user: pro,
    matchScore: calculateCreatorMatchScore(myGenres, pro),
    matchReasons: [`Interested in ${myGenres.join(", ")}`, `${pro.role} looking for new content`],
  }));
}

async function getMatchesForActor(user, page, limit) {
  // Find roles that match the actor's profile
  const scripts = await Script.find({
    "roles.0": { $exists: true },
    holdStatus: "available",
  }).populate("creator", "name profileImage");

  const matchedRoles = [];
  for (const script of scripts) {
    for (const role of script.roles) {
      let matchScore = 50;
      
      if (user.actorProfile?.gender && role.gender && user.actorProfile.gender === role.gender) matchScore += 20;
      if (user.actorProfile?.age && role.ageRange) {
        if (user.actorProfile.age >= role.ageRange.min && user.actorProfile.age <= role.ageRange.max) matchScore += 20;
      }
      if (user.actorProfile?.actingStyles?.length > 0 && role.type) {
        const styleMatch = user.actorProfile.actingStyles.some(s => role.type.toLowerCase().includes(s.toLowerCase()));
        if (styleMatch) matchScore += 15;
      }

      matchedRoles.push({
        script,
        role,
        matchScore: Math.min(99, matchScore),
        matchReasons: [`Role: ${role.characterName}`, role.description || ""],
      });
    }
  }

  return matchedRoles.sort((a, b) => b.matchScore - a.matchScore).slice(0, parseInt(limit));
}

function calculateCreatorMatchScore(myGenres, professional) {
  let score = 50;
  const sharedGenres = myGenres.filter(g => professional.preferences?.genres?.includes(g));
  score += sharedGenres.length * 15;
  if (professional.role === "producer") score += 10;
  if (professional.role === "investor") score += 5;
  return Math.min(99, score);
}

function getMatchReasons(user, script) {
  const reasons = [];
  if (user.preferences.genres?.includes(script.genre)) reasons.push(`Matches your interest in ${script.genre}`);
  if (script.trailerStatus === "ready") reasons.push("Has AI-generated trailer preview");
  if (script.scriptScore?.overall >= 80) reasons.push(`High script score: ${script.scriptScore.overall}/100`);
  if (script.roles?.length > 0) reasons.push(`${script.roles.length} roles attached`);
  if (reasons.length === 0) reasons.push("New script in your area of interest");
  return reasons;
}
