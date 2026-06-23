import mongoose from "mongoose";
import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import Script from "../models/Script.js";
import {
  hasActiveFilmIndustryProfessionalAccess,
  hasReachedMeetingsLimit,
  getRemainingMeetings,
  getMeetingsLimit,
  getScheduledMeetingsCount,
} from "../utils/industryAccess.js";
import {
  sendMeetingInvitationEmail,
  sendMeetingAcceptedEmail,
  sendMeetingRejectedEmail,
} from "../utils/emailService.js";

// Generates a secure, random meeting ID
const generateMeetingId = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `ckript-${timestamp}-${randomStr}`;
};

export const requestMeeting = async (req, res) => {
  try {
    const producerId = req.user._id;
    const { writerId, scriptId, title, scheduledDate, scheduledTime, duration, message } = req.body;

    if (!writerId || !scriptId || !title || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({ message: "All fields except message are required." });
    }

    if (!mongoose.Types.ObjectId.isValid(writerId) || !mongoose.Types.ObjectId.isValid(scriptId)) {
      return res.status(400).json({ message: "Invalid writer or script ID format." });
    }

    const producer = await User.findById(producerId).select("name subscription email role").lean();
    if (!producer) return res.status(404).json({ message: "Producer not found." });

    if (!hasActiveFilmIndustryProfessionalAccess(producer)) {
      return res.status(403).json({ message: "Active film industry professional access is required." });
    }

    if (hasReachedMeetingsLimit(producer)) {
      return res.status(403).json({
        message: "You have reached your scheduled meetings limit for this subscription period.",
        limitReached: true,
        meetingsUsed: getScheduledMeetingsCount(producer),
        meetingsLimit: getMeetingsLimit(producer),
        remainingMeetings: 0,
      });
    }

    const writer = await User.findById(writerId).select("name email").lean();
    if (!writer) return res.status(404).json({ message: "Writer not found." });

    const script = await Script.findById(scriptId).select("title").lean();
    if (!script) return res.status(404).json({ message: "Script not found." });

    // Generate Jitsi link
    const roomId = generateMeetingId();
    const meetingLink = `https://meet.jit.si/${roomId}`;

    // Create the meeting
    const newMeeting = new Meeting({
      producer: producerId,
      writer: writerId,
      script: scriptId,
      producer_name: producer.name,
      writer_name: writer.name,
      script_name: script.title,
      title,
      message,
      meetingLink,
      scheduledDate,
      scheduledTime,
      duration,
      status: "pending",
    });

    await newMeeting.save();

    // Consume producer quota
    await User.updateOne(
      { _id: producerId },
      {
        $push: {
          "subscription.scheduledMeetings": {
            writerId: new mongoose.Types.ObjectId(writerId),
            meetingId: newMeeting._id,
            scheduledAt: new Date(),
          },
        },
      }
    );

    // Send email to writer
    await sendMeetingInvitationEmail(writer.email, {
      producerName: producer.name,
      scriptName: script.title,
      date: new Date(scheduledDate).toLocaleDateString(),
      time: scheduledTime,
      duration,
      meetingId: newMeeting._id,
      clientBaseUrl: process.env.CLIENT_URL,
    });

    const refreshedUser = await User.findById(producerId).select("subscription").lean();

    return res.status(201).json({
      message: "Meeting requested successfully.",
      meeting: newMeeting,
      meetingsUsed: getScheduledMeetingsCount(refreshedUser),
      meetingsLimit: getMeetingsLimit(refreshedUser),
      remainingMeetings: getRemainingMeetings(refreshedUser),
    });
  } catch (error) {
    console.error("Error requesting meeting:", error);
    return res.status(500).json({ message: "Failed to request meeting." });
  }
};

export const getMeetings = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role; // e.g. "admin", "writer", "producer"

    let query = {};
    if (userRole === "admin") {
      // Admin sees everything
    } else {
      query = { $or: [{ producer: userId }, { writer: userId }] };
    }

    const meetings = await Meeting.find(query).sort({ createdAt: -1 });

    return res.status(200).json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return res.status(500).json({ message: "Failed to fetch meetings." });
  }
};

export const updateMeetingStatus = async (req, res) => {
  try {
    const writerId = req.user._id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found." });

    if (String(meeting.writer) !== String(writerId)) {
      return res.status(403).json({ message: "Not authorized to update this meeting." });
    }

    if (meeting.status !== "pending") {
      return res.status(400).json({ message: "Meeting is no longer pending." });
    }

    meeting.status = status;
    await meeting.save();

    const producer = await User.findById(meeting.producer).select("email name").lean();
    const writer = await User.findById(writerId).select("name").lean();

    if (status === "accepted") {
      await sendMeetingAcceptedEmail(producer.email, {
        writerName: writer.name,
        scriptName: meeting.script_name,
        date: new Date(meeting.scheduledDate).toLocaleDateString(),
        time: meeting.scheduledTime,
        meetingLink: meeting.meetingLink,
        clientBaseUrl: process.env.CLIENT_URL,
      });
    } else if (status === "rejected") {
      await sendMeetingRejectedEmail(producer.email, {
        writerName: writer.name,
        scriptName: meeting.script_name,
        clientBaseUrl: process.env.CLIENT_URL,
      });
    }

    return res.status(200).json({ message: `Meeting ${status} successfully.`, meeting });
  } catch (error) {
    console.error("Error updating meeting status:", error);
    return res.status(500).json({ message: "Failed to update meeting status." });
  }
};
