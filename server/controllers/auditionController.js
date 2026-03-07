import Audition from "../models/Audition.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Submit an audition for a role
export const submitAudition = async (req, res) => {
  try {
    const { scriptId, roleId, videoUrl, thumbnailUrl, notes } = req.body;

    const user = await User.findById(req.user._id);
    if (user.role !== "actor") {
      return res.status(403).json({ message: "Only actors can submit auditions" });
    }

    const script = await Script.findById(scriptId);
    if (!script) return res.status(404).json({ message: "Script not found" });

    const role = script.roles.id(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    // Check if already auditioned
    const existing = await Audition.findOne({ script: scriptId, role: roleId, actor: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "You have already auditioned for this role" });
    }

    const audition = await Audition.create({
      script: scriptId,
      role: roleId,
      actor: req.user._id,
      videoUrl,
      thumbnailUrl,
      notes,
    });

    // Notify the script creator
    await Notification.create({
      user: script.creator,
      type: "audition",
      from: req.user._id,
      script: script._id,
      audition: audition._id,
      message: `${user.name} auditioned for "${role.characterName}" in "${script.title}"`,
    });

    res.status(201).json({ message: "Audition submitted", audition });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already auditioned for this role" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get auditions for a script (creator only)
export const getScriptAuditions = async (req, res) => {
  try {
    const script = await Script.findById(req.params.scriptId);
    if (!script) return res.status(404).json({ message: "Script not found" });

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can view auditions" });
    }

    const auditions = await Audition.find({ script: req.params.scriptId })
      .populate("actor", "name profileImage actorProfile bio")
      .sort({ createdAt: -1 });

    // Group auditions by role
    const roleAuditions = {};
    for (const role of script.roles) {
      roleAuditions[role._id.toString()] = {
        role,
        auditions: auditions.filter(a => a.role.toString() === role._id.toString()),
      };
    }

    res.json({ roles: script.roles, auditions: roleAuditions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get auditions by the current actor
export const getMyAuditions = async (req, res) => {
  try {
    const auditions = await Audition.find({ actor: req.user._id })
      .populate({
        path: "script",
        select: "title genre coverImage creator roles",
        populate: { path: "creator", select: "name profileImage" }
      })
      .sort({ createdAt: -1 });

    res.json(auditions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update audition status (creator only)
export const updateAuditionStatus = async (req, res) => {
  try {
    const { status, rating, feedback } = req.body;
    const audition = await Audition.findById(req.params.id);
    if (!audition) return res.status(404).json({ message: "Audition not found" });

    const script = await Script.findById(audition.script);
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can update audition status" });
    }

    audition.status = status || audition.status;
    audition.rating = rating || audition.rating;
    audition.feedback = feedback || audition.feedback;
    await audition.save();

    // Notify the actor
    const statusMessage = {
      shortlisted: "Congratulations! You've been shortlisted",
      rejected: "Unfortunately, you were not selected",
      accepted: "Amazing! You've been accepted for the role",
    };

    await Notification.create({
      user: audition.actor,
      type: "audition",
      from: req.user._id,
      script: script._id,
      audition: audition._id,
      message: `${statusMessage[status] || "Status updated"} for "${script.title}"`,
    });

    res.json({ message: "Audition updated", audition });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available roles for audition (public)
export const getAvailableRoles = async (req, res) => {
  try {
    const { genre, contentType } = req.query;
    const query = { "roles.0": { $exists: true }, holdStatus: "available", isSold: { $ne: true } };
    if (genre) query.genre = genre;
    if (contentType) query.contentType = contentType;

    const scripts = await Script.find(query)
      .populate("creator", "name profileImage")
      .select("title genre contentType roles coverImage trailerThumbnail description")
      .sort({ createdAt: -1 });

    // Get audition counts per role
    const results = [];
    for (const script of scripts) {
      for (const role of script.roles) {
        const auditionCount = await Audition.countDocuments({ script: script._id, role: role._id });
        results.push({
          script: {
            _id: script._id,
            title: script.title,
            genre: script.genre,
            coverImage: script.coverImage,
            creator: script.creator,
          },
          role,
          auditionCount,
        });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
