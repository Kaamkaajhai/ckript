import ContactSubmission from "../models/ContactSubmission.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_REASONS = new Set(["doubt", "team", "general", "email"]);

export const getContactSubmissions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const total = await ContactSubmission.countDocuments();
    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({ submissions, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch contact submissions" });
  }
};

export const createContactSubmission = async (req, res) => {
  try {
    const { name, email, reason, message } = req.body;

    if (!name || !email || !reason || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedMessage = String(message).trim();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (!VALID_REASONS.has(reason)) {
      return res.status(400).json({ message: "Invalid contact reason" });
    }

    const submission = await ContactSubmission.create({
      name: trimmedName,
      email: normalizedEmail,
      reason,
      message: trimmedMessage,
    });

    return res.status(201).json({
      message: "Contact request submitted successfully",
      id: submission._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit contact request" });
  }
};