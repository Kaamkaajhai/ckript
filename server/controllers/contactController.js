import ContactSubmission from "../models/ContactSubmission.js";
import { notifyAdminWorkflowEvent } from "../utils/adminWorkflowAlerts.js";

const WHITESPACE = /\s/;
const VALID_REASONS = new Set(["doubt", "team", "general", "email", "other"]);

// Accepts exactly what /^[^\s@]+@[^\s@]+\.[^\s@]+$/ accepted — no whitespace, exactly one "@" with at
// least one character before it, and a dot in the domain with at least one character on either side —
// but in single scans. That regex was quadratic: on "a@" + "a.".repeat(50000) + "@" the engine retries
// the domain split at every dot and rescans to the end each time, and this endpoint is unauthenticated.
const isValidEmail = (value) => {
  if (WHITESPACE.test(value)) return false;
  const at = value.indexOf("@");
  if (at < 1 || value.indexOf("@", at + 1) !== -1) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf(".", 1); // from 1: the dot needs a character before it
  return dot !== -1 && dot < domain.length - 1;
};

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
    const { name, email, reason, otherReason, message } = req.body;

    if (!name || !email || !reason || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedMessage = String(message).trim();
    const trimmedOtherReason = String(otherReason || "").trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (!VALID_REASONS.has(reason)) {
      return res.status(400).json({ message: "Invalid contact reason" });
    }

    if (reason === "other" && !trimmedOtherReason) {
      return res.status(400).json({ message: "Please specify what 'Other' means" });
    }

    const submission = await ContactSubmission.create({
      name: trimmedName,
      email: normalizedEmail,
      reason,
      otherReason: reason === "other" ? trimmedOtherReason : "",
      message: trimmedMessage,
    });

    await notifyAdminWorkflowEvent({
      title: "New Contact Query Received",
      section: "queries",
      message: `A new contact query was submitted by ${trimmedName} (${normalizedEmail}).`,
      metadata: {
        queryId: submission._id,
        reason,
        otherReason: submission.otherReason || undefined,
        email: normalizedEmail,
      },
    });

    return res.status(201).json({
      message: "Contact request submitted successfully",
      id: submission._id,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit contact request" });
  }
};