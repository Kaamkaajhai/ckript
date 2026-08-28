import mongoose from "mongoose";
import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import Script from "../models/Script.js";
import { decryptToken } from "../utils/tokenCrypto.js";
import {
  getAccessTokenFromRefresh,
  createMeetingEvent,
  ReconnectRequired,
} from "../utils/googleCalendar.js";
import {
  hasActiveFilmIndustryProfessionalAccess,
  hasReachedMeetingsLimit,
  getRemainingMeetings,
  getMeetingsLimit,
  getScheduledMeetingsCount,
  isWriterRole,
} from "../utils/industryAccess.js";
import { normalizeMeetingRequest } from "../utils/meetingRequest.js";
import {
  sendMeetingInvitationEmail,
  sendMeetingAcceptedEmail,
  sendMeetingAcceptedWriterEmail,
  sendMeetingRejectedEmail,
} from "../utils/emailService.js";

export const requestMeeting = async (req, res) => {
  try {
    const producerId = req.user._id;
    const normalized = normalizeMeetingRequest(req.body);
    if (!normalized.ok) return res.status(400).json({ message: normalized.message });
    const {
      writerId, scriptId, title, scheduledDate, scheduledTime, duration, message, timeZone,
      startAt, startISO, endISO,
    } = normalized.value;

    if (!mongoose.Types.ObjectId.isValid(writerId) || !mongoose.Types.ObjectId.isValid(scriptId)) {
      return res.status(400).json({ message: "Invalid writer or script ID format." });
    }

    // "+…refreshTokenEnc" un-hides just that select:false field on top of the default projection —
    // do NOT also list `googleCalendar` here or Mongo throws a parent/child path collision.
    const producer = await User.findById(producerId)
      .select("+googleCalendar.refreshTokenEnc")
      .lean();
    if (!producer) return res.status(404).json({ message: "Producer not found." });

    if (!hasActiveFilmIndustryProfessionalAccess(producer)) {
      return res.status(403).json({ message: "Active film industry professional access is required." });
    }

    // Meetings are Google Calendar events on the producer's calendar — require a connected calendar.
    if (!producer.googleCalendar?.connected || !producer.googleCalendar?.refreshTokenEnc) {
      return res.status(428).json({
        message: "Connect your Google Calendar to schedule meetings.",
        needsCalendar: true,
      });
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

    const writer = await User.findById(writerId).select("name email role").lean();
    if (!writer) return res.status(404).json({ message: "Writer not found." });
    if (!isWriterRole(writer)) {
      return res.status(400).json({ message: "Meetings can only be requested with a writer." });
    }

    const script = await Script.findById(scriptId)
      .select("title creator status isDeleted isSold unlockedBy purchasedBy")
      .lean();
    if (!script) return res.status(404).json({ message: "Script not found." });
    if (String(script.creator) !== String(writerId)) {
      return res.status(403).json({ message: "This project does not belong to that writer." });
    }
    const requesterHasProject = [...(script.unlockedBy || []), ...(script.purchasedBy || [])]
      .some((id) => String(id) === String(producerId));
    const projectIsPublic = script.status === "published" && !script.isDeleted && !script.isSold;
    if (!projectIsPublic && !requesterHasProject) {
      return res.status(403).json({ message: "This project is not available for a meeting request." });
    }

    // Create the Google Calendar event (with a Meet link) on the producer's calendar. Google emails
    // both attendees the invite and localizes the time per-attendee via `timeZone`.
    let meetingLink = "";
    let googleEventId = "";
    try {
      const refreshToken = decryptToken(producer.googleCalendar.refreshTokenEnc);
      const { accessToken } = await getAccessTokenFromRefresh(refreshToken);
      const event = await createMeetingEvent({
        accessToken,
        summary: title,
        description: [
          `Ckript meeting about "${script.title}".`,
          `Producer: ${producer.name}`,
          `Writer: ${writer.name}`,
          message ? `\nNote: ${message}` : "",
        ].filter(Boolean).join("\n"),
        startISO,
        endISO,
        timeZone,
        attendees: [producer.email, writer.email],
      });
      meetingLink = event.meetLink;
      googleEventId = event.eventId;
    } catch (err) {
      if (err instanceof ReconnectRequired) {
        // Stored token is dead — flip the flag so the UI re-prompts to connect.
        await User.updateOne({ _id: producerId }, { $set: { "googleCalendar.connected": false } });
        return res.status(428).json({
          message: "Your Google Calendar connection expired. Please reconnect and try again.",
          needsCalendar: true,
        });
      }
      console.error("Error creating Google Calendar event:", err?.message || err);
      return res.status(502).json({ message: "Failed to create the calendar event. Please try again." });
    }

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
      googleEventId,
      scheduledDate,
      scheduledTime,
      timeZone,
      startAt,
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
    const writer = await User.findById(writerId).select("name email").lean();

    if (status === "accepted") {
      await sendMeetingAcceptedEmail(producer.email, {
        writerName: writer.name,
        scriptName: meeting.script_name,
        date: new Date(meeting.scheduledDate).toLocaleDateString(),
        time: meeting.scheduledTime,
        meetingLink: meeting.meetingLink,
        clientBaseUrl: process.env.CLIENT_URL,
      });
      
      await sendMeetingAcceptedWriterEmail(writer.email, {
        writerName: writer.name,
        producerName: producer.name,
        scriptName: meeting.script_name,
        date: new Date(meeting.scheduledDate).toLocaleDateString(),
        time: meeting.scheduledTime,
        meetingLink: meeting.meetingLink,
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
