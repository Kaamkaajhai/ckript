import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const message = await Message.create({ sender: req.user._id, ...req.body });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId }).populate("sender", "name profileImage");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
