import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { encryptToken, decryptToken } from "../utils/tokenCrypto.js";
import {
  getAuthUrl,
  exchangeCode,
  revokeToken,
  isGoogleCalendarConfigured,
} from "../utils/googleCalendar.js";

const STATE_TTL = "10m";

// Only allow same-app relative paths as the post-connect return target (prevents open-redirect).
const sanitizeReturnTo = (value) => {
  const v = String(value || "").trim();
  if (!v.startsWith("/") || v.startsWith("//")) return "/";
  return v;
};

const clientRedirect = (res, returnTo, status) => {
  const base = String(process.env.CLIENT_URL || "").replace(/\/$/, "");
  const path = sanitizeReturnTo(returnTo);
  const sep = path.includes("?") ? "&" : "?";
  return res.redirect(`${base}${path}${sep}calendar=${status}`);
};

// POST /api/google-calendar/auth-url (protect) → { url }
// Returns the Google consent URL. `state` is a short-lived signed JWT that correlates the header-less
// browser callback back to this user (auth is stateless bearer, so we cannot rely on a session).
export const getGoogleCalendarAuthUrl = async (req, res) => {
  try {
    if (!isGoogleCalendarConfigured()) {
      return res.status(503).json({ message: "Google Calendar is not configured on the server." });
    }
    const returnTo = sanitizeReturnTo(req.body?.returnTo);
    const state = jwt.sign({ uid: String(req.user._id), returnTo, purpose: "gcal" }, process.env.JWT_SECRET, {
      expiresIn: STATE_TTL,
    });
    return res.json({ url: getAuthUrl(state) });
  } catch (error) {
    console.error("[googleCalendar] auth-url failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to start Google Calendar connection." });
  }
};

// GET /api/google-calendar/callback (public — Google redirects the browser here with ?code&state)
export const handleGoogleCalendarCallback = async (req, res) => {
  const { code, state, error: googleError } = req.query;
  let returnTo = "/";
  try {
    if (!state) return clientRedirect(res, returnTo, "error");
    let decoded;
    try {
      decoded = jwt.verify(String(state), process.env.JWT_SECRET);
    } catch {
      return clientRedirect(res, returnTo, "error");
    }
    returnTo = sanitizeReturnTo(decoded?.returnTo);
    if (decoded?.purpose !== "gcal" || !decoded?.uid) return clientRedirect(res, returnTo, "error");
    if (googleError || !code) return clientRedirect(res, returnTo, "error");

    const tokens = await exchangeCode(String(code));
    if (!tokens.refreshToken) {
      // No refresh token returned (rare — usually a prior consent without revoke). Ask to retry.
      return clientRedirect(res, returnTo, "error");
    }

    await User.updateOne(
      { _id: decoded.uid },
      {
        $set: {
          "googleCalendar.connected": true,
          "googleCalendar.connectedAt": new Date(),
          "googleCalendar.calendarEmail": tokens.email || "",
          "googleCalendar.refreshTokenEnc": encryptToken(tokens.refreshToken),
          "googleCalendar.accessToken": tokens.accessToken || "",
          "googleCalendar.accessTokenExpiry": tokens.accessTokenExpiry || null,
          "googleCalendar.scopes": tokens.scopes || [],
        },
      }
    );

    return clientRedirect(res, returnTo, "connected");
  } catch (error) {
    console.error("[googleCalendar] callback failed:", error?.message || error);
    return clientRedirect(res, returnTo, "error");
  }
};

// GET /api/google-calendar/status (protect) → { connected, calendarEmail }
export const getGoogleCalendarStatus = async (req, res) => {
  const gc = req.user?.googleCalendar || {};
  return res.json({
    connected: Boolean(gc.connected),
    calendarEmail: gc.calendarEmail || "",
    configured: isGoogleCalendarConfigured(),
  });
};

// DELETE /api/google-calendar (protect) → disconnect + best-effort revoke at Google
export const disconnectGoogleCalendar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+googleCalendar.refreshTokenEnc");
    if (user?.googleCalendar?.refreshTokenEnc) {
      try {
        await revokeToken(decryptToken(user.googleCalendar.refreshTokenEnc));
      } catch {
        /* best effort */
      }
    }
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          "googleCalendar.connected": false,
          "googleCalendar.calendarEmail": "",
          "googleCalendar.refreshTokenEnc": "",
          "googleCalendar.accessToken": "",
          "googleCalendar.accessTokenExpiry": null,
          "googleCalendar.scopes": [],
        },
      }
    );
    return res.json({ message: "Google Calendar disconnected.", connected: false });
  } catch (error) {
    console.error("[googleCalendar] disconnect failed:", error?.message || error);
    return res.status(500).json({ message: "Failed to disconnect Google Calendar." });
  }
};
