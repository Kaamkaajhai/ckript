import ScriptPitch from "../models/ScriptPitch.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { asObjectId } from "../utils/requestValue.js";

const PITCH_STATUSES = ["approved", "rejected"];

export const sendPitch = async (req, res) => {
  try {
    const writerId = req.user._id;
    const { note } = req.body;
    const scriptId = asObjectId(req.body.scriptId);
    const investorId = asObjectId(req.body.investorId);

    // Validate Script
    if (!scriptId) return res.status(404).json({ message: "Script not found or unauthorized." });
    const script = await Script.findOne({ _id: scriptId, creator: writerId });
    if (!script) return res.status(404).json({ message: "Script not found or unauthorized." });

    // Validate Investor
    if (!investorId) {
      return res.status(400).json({ message: "Invalid investor selected." });
    }
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
    const pitchId = asObjectId(req.params.pitchId);
    // Bind the update to the matched literal rather than to req.body, so nothing the whitelist did
    // not produce can reach the update document.
    const status = PITCH_STATUSES.find((allowed) => allowed === req.body.status);

    if (!status) {
      return res.status(400).json({ message: "Invalid status." });
    }

    if (!pitchId) return res.status(404).json({ message: "Pitch not found." });

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
