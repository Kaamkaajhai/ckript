import Script from "../models/Script.js";

export const uploadScript = async (req, res) => {
  try {
    const script = await Script.create({ creator: req.user._id, ...req.body });
    res.status(201).json(script);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScripts = async (req, res) => {
  try {
    const scripts = await Script.find().populate("creator", "name profileImage role");
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unlockScript = async (req, res) => {
  try {
    const script = await Script.findById(req.body.scriptId);
    if (!script.unlockedBy.includes(req.user._id)) {
      script.unlockedBy.push(req.user._id);
      await script.save();
    }
    res.json({ message: "Script unlocked", script });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
