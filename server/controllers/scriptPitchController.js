import ScriptPitch from "../models/ScriptPitch.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

export const sendPitch = async (req, res) => {
  try {
    const writerId = req.user._id;
    const { scriptId, investorId, note } = req.body;

    // Validate Script
    const script = await Script.findOne({ _id: scriptId, creator: writerId });
    if (!script) return res.status(404).json({ message: "Script not found or unauthorized." });

    // Validate Investor
    const investor = await User.findById(investorId);
    if (!investor || investor.role !== "investor") {
      return res.status(400).json({ message: "Invalid investor selected." });
    }

    // Check if already pitched
    const existingPitch = await ScriptPitch.findOne({ script: scriptId, investor: investorId });
    if (existingPitch) {
      return res.status(400).json({ message: "You have already pitched this script to this investor." });
    }

    const pitch = await ScriptPitch.create({
      script: scriptId,
      writer: writerId,
      investor: investorId,
      status: "pending",
      note
    });

    // Notify Investor
    try {
      await Notification.create({
        user: investorId,
        type: "script_pitch",
        from: writerId,
        script: scriptId,
        message: `${req.user.name} pitched a script to you: ${script.title}`
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    return res.status(201).json(pitch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPitchesForInvestor = async (req, res) => {
  try {
    const investorId = req.user._id;
    const pitches = await ScriptPitch.find({ investor: investorId })
      .populate("writer", "name profileImage")
      .populate("script", "title logline genres")
      .sort("-createdAt");
    
    res.json(pitches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePitchStatus = async (req, res) => {
  try {
    const investorId = req.user._id;
    const { pitchId } = req.params;
    const { status } = req.body; // 'approved', 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const pitch = await ScriptPitch.findOneAndUpdate(
      { _id: pitchId, investor: investorId },
      { status },
      { new: true }
    );

    if (!pitch) return res.status(404).json({ message: "Pitch not found." });

    res.json(pitch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
