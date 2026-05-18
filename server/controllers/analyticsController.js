import jwt from "jsonwebtoken";
import AnonymousVisitor from "../models/AnonymousVisitor.js";
import UserActivity from "../models/UserActivity.js";
import User from "../models/User.js";
import Script from "../models/Script.js";

const SESSION_LIMIT = 40;
const EVENT_LIMIT_PER_SESSION = 400;
const PAGE_LIMIT_PER_SESSION = 200;
const CLICK_LIMIT_PER_SESSION = 300;
const ACTIVITY_LOG_LIMIT = 800;
const USER_SESSION_LIMIT = 80;
const USER_AUTH_EVENT_LIMIT = 160;
const USER_SESSION_EVENT_LIMIT = 500;
const USER_SESSION_PAGE_LIMIT = 240;
const USER_SESSION_CLICK_LIMIT = 400;
const LIVE_WINDOW_MS = 5 * 60 * 1000;
const RECENT_WINDOW_MS = 30 * 60 * 1000;
const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

const parseDate = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toTrimmedString = (value) => String(value || "").trim();

const sanitizeText = (value, max = 120) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const isPrivateIp = (ip) => {
  const value = toTrimmedString(ip);
  return (
    value.startsWith("10.") ||
    value.startsWith("172.16.") ||
    value.startsWith("172.17.") ||
    value.startsWith("172.18.") ||
    value.startsWith("172.19.") ||
    value.startsWith("172.2") ||
    value.startsWith("192.168.") ||
    value.startsWith("127.") ||
    value === "::1" ||
    value.startsWith("fc") ||
    value.startsWith("fd")
  );
};

const normalizeIpAddress = (value) => {
  const raw = toTrimmedString(value);
  if (!raw) return "";

  const first = raw.split(",")[0]?.trim() || "";
  const noPort = first.includes(":") && first.includes(".")
    ? first.replace(/:\d+$/, "")
    : first;

  if (noPort.startsWith("::ffff:")) return noPort.replace("::ffff:", "");
  return noPort;
};

const getRequestIp = (req) => {
  const forwarded = normalizeIpAddress(req.headers["x-forwarded-for"]);
  if (forwarded) {
    return forwarded;
  }

  const vercelIp = normalizeIpAddress(req.headers["x-vercel-forwarded-for"]);
  if (vercelIp) return vercelIp;

  const cfIp = normalizeIpAddress(req.headers["cf-connecting-ip"]);
  if (cfIp) return cfIp;

  const realIp = normalizeIpAddress(req.headers["x-real-ip"]);
  if (realIp) return realIp;

  const fastlyIp = normalizeIpAddress(req.headers["fastly-client-ip"]);
  if (fastlyIp) return fastlyIp;

  return normalizeIpAddress(req.ip || req.connection?.remoteAddress || "");
};

const pickEffectiveIp = (requestIp, clientIp = "") => {
  const normalizedRequestIp = normalizeIpAddress(requestIp);
  const normalizedClientIp = normalizeIpAddress(clientIp);

  if (!normalizedRequestIp) return normalizedClientIp;
  if (isPrivateIp(normalizedRequestIp) && normalizedClientIp && !isPrivateIp(normalizedClientIp)) {
    return normalizedClientIp;
  }

  return normalizedRequestIp;
};

const getOrCreateSession = (visitor, sessionId, startedAt) => {
  if (!Array.isArray(visitor.sessions)) {
    visitor.sessions = [];
  }

  let session = visitor.sessions.find((item) => item.sessionId === sessionId);

  if (!session) {
    session = {
      sessionId,
      startedAt: startedAt || new Date(),
      pages: [],
      clicks: [],
      events: [],
      scrollDepthMax: 0,
    };
    visitor.sessions.push(session);
  }

  if (visitor.sessions.length > SESSION_LIMIT) {
    visitor.sessions = visitor.sessions.slice(-SESSION_LIMIT);
  }

  return visitor.sessions.find((item) => item.sessionId === sessionId);
};

const upsertActivityLog = async ({ userId, anonymousId, email, phone, logEntry }) => {
  if (!userId) return;

  const activity = await UserActivity.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
      },
      $set: {
        anonymousId: anonymousId || "",
        email: email || "",
        phone: phone || "",
        lastActiveAt: logEntry.timestamp || new Date(),
      },
      $push: {
        activityLogs: {
          $each: [logEntry],
          $slice: -ACTIVITY_LOG_LIMIT,
        },
      },
    },
    { upsert: true, new: true }
  );

  return activity;
};

const buildSafeLocation = (location = {}) => ({
  city: sanitizeText(location?.city || "", 80),
  country: sanitizeText(location?.country || "", 80),
  region: sanitizeText(location?.region || "", 80),
  latitude: Number.isFinite(Number(location?.latitude)) ? Number(location.latitude) : undefined,
  longitude: Number.isFinite(Number(location?.longitude)) ? Number(location.longitude) : undefined,
  source: sanitizeText(location?.source || "", 40),
});

const buildSafeLocationFromClientGeo = (clientGeo = {}) => {
  if (!clientGeo || typeof clientGeo !== "object") return null;

  const latitude = Number(clientGeo.latitude);
  const longitude = Number(clientGeo.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return buildSafeLocation({
    city: sanitizeText(clientGeo.city || "", 80),
    country: sanitizeText(clientGeo.country || "", 80),
    region: sanitizeText(clientGeo.region || "", 80),
    latitude,
    longitude,
    source: sanitizeText(clientGeo.source || "browser_geolocation", 40),
  });
};

const hasLocationSignal = (location = {}) => {
  if (!location || typeof location !== "object") return false;

  return Boolean(
    sanitizeText(location.city || "", 10)
    || sanitizeText(location.country || "", 10)
    || sanitizeText(location.region || "", 10)
    || Number.isFinite(Number(location.latitude))
    || Number.isFinite(Number(location.longitude))
  );
};

const pickBestLocation = (...candidates) => {
  const found = candidates.find((candidate) => hasLocationSignal(candidate));
  return buildSafeLocation(found || {});
};

const getOrCreateUserSession = (activity, sessionId, startedAt) => {
  if (!Array.isArray(activity.sessions)) {
    activity.sessions = [];
  }

  let session = activity.sessions.find((item) => item.sessionId === sessionId);

  if (!session) {
    session = {
      sessionId,
      startedAt: startedAt || new Date(),
      pages: [],
      clicks: [],
      actions: [],
    };
    activity.sessions.push(session);
  }

  if (activity.sessions.length > USER_SESSION_LIMIT) {
    activity.sessions = activity.sessions.slice(-USER_SESSION_LIMIT);
  }

  return activity.sessions.find((item) => item.sessionId === sessionId);
};

const getOrCreateUserActivityDoc = async ({ userId, anonymousId, email, phone }) => {
  if (!userId) return null;

  let activity = await UserActivity.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        anonymousId: anonymousId || "",
        email: email || "",
        phone: phone || "",
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (anonymousId) activity.anonymousId = anonymousId;
  if (email) activity.email = email;
  if (phone) activity.phone = phone;

  return activity;
};

const appendAuthEvent = (activity, { type, source = "tracking", sessionId = "", timestamp = new Date(), metadata = {} }) => {
  if (!activity || !type) return;
  if (!Array.isArray(activity.authEvents)) {
    activity.authEvents = [];
  }

  activity.authEvents.push({
    type: sanitizeText(type, 80),
    source: sanitizeText(source, 80),
    sessionId: sanitizeText(sessionId, 120),
    timestamp,
    metadata,
  });

  if (activity.authEvents.length > USER_AUTH_EVENT_LIMIT) {
    activity.authEvents = activity.authEvents.slice(-USER_AUTH_EVENT_LIMIT);
  }

  const normalized = String(type).toLowerCase();
  if (normalized.includes("signup")) {
    activity.signupAt = activity.signupAt || timestamp;
  }

  if (normalized.includes("login") || normalized.includes("session_restored")) {
    activity.firstLoginAt = activity.firstLoginAt || timestamp;
    activity.lastLoginAt = timestamp;
  }
};

const applyEventToUserSession = (session, payload) => {
  const now = payload.timestamp || new Date();
  const path = sanitizeText(payload.path || "", 300);

  if (!Array.isArray(session.pages)) session.pages = [];
  if (!Array.isArray(session.clicks)) session.clicks = [];
  if (!Array.isArray(session.actions)) session.actions = [];

  if (payload.eventType === "page_enter") {
    if (!session.entryPath) session.entryPath = path;

    session.pages.push({
      path,
      title: sanitizeText(payload.title || "", 200),
      enteredAt: now,
      timeSpentSeconds: 0,
    });

    if (session.pages.length > USER_SESSION_PAGE_LIMIT) {
      session.pages = session.pages.slice(-USER_SESSION_PAGE_LIMIT);
    }
  }

  if (payload.eventType === "page_exit") {
    const latestOpenPage = [...session.pages].reverse().find((page) => page.path === path && !page.exitedAt);
    if (latestOpenPage) {
      latestOpenPage.exitedAt = now;
      latestOpenPage.timeSpentSeconds = Math.max(Number(payload.timeSpentSeconds || 0), latestOpenPage.timeSpentSeconds || 0);
    }

    session.exitPath = path || session.exitPath;
    session.durationSeconds = Math.max(Number(payload.sessionDurationSeconds || 0), session.durationSeconds || 0);
  }

  if (payload.eventType === "click") {
    session.clicks.push({
      element: sanitizeText(payload.element || "unknown", 240),
      text: sanitizeText(payload.elementText || "", 120),
      label: sanitizeText(payload.clickLabel || payload.elementText || "", 140),
      section: sanitizeText(payload.sectionLabel || "", 120),
      path,
      x: Number(payload.x || 0),
      y: Number(payload.y || 0),
      timestamp: now,
    });

    if (session.clicks.length > USER_SESSION_CLICK_LIMIT) {
      session.clicks = session.clicks.slice(-USER_SESSION_CLICK_LIMIT);
    }
  }

  session.actions.push({
    eventType: sanitizeText(payload.eventType || "event", 80),
    action: sanitizeText(payload.action || "", 120),
    path,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined,
    timestamp: now,
  });

  if (session.actions.length > USER_SESSION_EVENT_LIMIT) {
    session.actions = session.actions.slice(-USER_SESSION_EVENT_LIMIT);
  }
};

const resolveAuthEventType = ({ eventType, action }) => {
  const normalizedEventType = String(eventType || "").toLowerCase();
  const normalizedAction = String(action || "").toLowerCase();

  if (normalizedEventType === "auth") {
    if (normalizedAction.includes("signup")) return "signup";
    if (normalizedAction.includes("login")) return "login";
    if (normalizedAction.includes("restore")) return "session_restored";
  }

  return "";
};

const getAuthUserFromRequest = async (req) => {
  const rawHeader = toTrimmedString(req.headers.authorization);
  if (!rawHeader.toLowerCase().startsWith("bearer ")) return null;

  try {
    const token = rawHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return null;

    const user = await User.findById(decoded.id).select("_id email phone").lean();
    return user || null;
  } catch {
    return null;
  }
};

const fetchRoughLocation = async (ipAddress) => {
  const normalizedIp = normalizeIpAddress(ipAddress);
  if (!normalizedIp || isPrivateIp(normalizedIp)) {
    return { city: "", country: "", region: "", source: "private_ip" };
  }

  const providerKey = toTrimmedString(process.env.IP_API_KEY);
  const providers = [
    providerKey
      ? {
        url: `https://api.ipgeolocation.io/ipgeo?apiKey=${encodeURIComponent(providerKey)}&ip=${encodeURIComponent(normalizedIp)}`,
        source: "ipgeolocation",
      }
      : null,
    {
      url: `https://ipapi.co/${encodeURIComponent(normalizedIp)}/json/`,
      source: "ipapi",
    },
    {
      url: `https://ipwho.is/${encodeURIComponent(normalizedIp)}`,
      source: "ipwhois",
    },
    {
      url: `https://ipinfo.io/${encodeURIComponent(normalizedIp)}/json`,
      source: "ipinfo",
    },
  ].filter(Boolean);

  for (const provider of providers) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch(provider.url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const city = sanitizeText(data.city || data.city_name || "", 80);
      const country = sanitizeText(data.country_name || data.country || "", 80);
      const region = sanitizeText(data.state_prov || data.region || data.region_name || "", 80);
      const latitude = Number(data.latitude || data.lat || "");
      const longitude = Number(data.longitude || data.lon || "");

      if (!city && !country && !region && !Number.isFinite(latitude) && !Number.isFinite(longitude)) {
        continue;
      }

      return {
        city,
        country,
        region,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        source: provider.source,
      };
    } catch {
      // Try next provider.
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return { city: "", country: "", region: "", source: "ip_lookup_failed" };
};

const detectReturningFlag = (existingVisitor, providedReturning) => {
  if (typeof providedReturning === "boolean") return providedReturning;
  return Boolean(existingVisitor);
};

const buildSafeDevice = (device = {}, req) => {
  const userAgent = sanitizeText(device.userAgent || req.headers["user-agent"] || "", 500);
  return {
    deviceType: sanitizeText(device.deviceType || "unknown", 40),
    browser: sanitizeText(device.browser || "", 80),
    os: sanitizeText(device.os || "", 80),
    userAgent,
  };
};

const applyEventToSession = (session, payload) => {
  const now = payload.timestamp || new Date();
  const path = sanitizeText(payload.path || "", 300);

  if (!Array.isArray(session.pages)) session.pages = [];
  if (!Array.isArray(session.clicks)) session.clicks = [];
  if (!Array.isArray(session.events)) session.events = [];

  if (payload.eventType === "page_enter") {
    if (!session.entryPath) session.entryPath = path;

    session.pages.push({
      path,
      title: sanitizeText(payload.title || "", 200),
      referrer: sanitizeText(payload.referrer || "", 300),
      enteredAt: now,
      timeSpentSeconds: 0,
    });

    if (session.pages.length > PAGE_LIMIT_PER_SESSION) {
      session.pages = session.pages.slice(-PAGE_LIMIT_PER_SESSION);
    }
  }

  if (payload.eventType === "page_exit") {
    const latestOpenPage = [...session.pages].reverse().find((page) => page.path === path && !page.exitedAt);
    if (latestOpenPage) {
      latestOpenPage.exitedAt = now;
      latestOpenPage.timeSpentSeconds = Math.max(Number(payload.timeSpentSeconds || 0), latestOpenPage.timeSpentSeconds || 0);
    }

    session.exitPath = path || session.exitPath;
    session.durationSeconds = Math.max(Number(payload.sessionDurationSeconds || 0), session.durationSeconds || 0);
  }

  if (payload.eventType === "click") {
    session.clicks.push({
      element: sanitizeText(payload.element || "unknown", 240),
      text: sanitizeText(payload.elementText || "", 120),
      label: sanitizeText(payload.clickLabel || payload.elementText || "", 140),
      section: sanitizeText(payload.sectionLabel || "", 120),
      path,
      x: Number(payload.x || 0),
      y: Number(payload.y || 0),
      timestamp: now,
    });

    if (session.clicks.length > CLICK_LIMIT_PER_SESSION) {
      session.clicks = session.clicks.slice(-CLICK_LIMIT_PER_SESSION);
    }
  }

  if (payload.eventType === "scroll_depth") {
    const depth = Math.min(Math.max(Number(payload.scrollDepth || 0), 0), 100);
    session.scrollDepthMax = Math.max(session.scrollDepthMax || 0, depth);
  }

  session.events.push({
    eventType: sanitizeText(payload.eventType || "event", 80),
    action: sanitizeText(payload.action || "", 120),
    path,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : undefined,
    timestamp: now,
  });

  if (session.events.length > EVENT_LIMIT_PER_SESSION) {
    session.events = session.events.slice(-EVENT_LIMIT_PER_SESSION);
  }
};

export const trackEvent = async (req, res) => {
  try {
    const {
      anonymousId,
      sessionId,
      eventType,
      path,
      timestamp,
      element,
      elementText,
      clickLabel,
      sectionLabel,
      x,
      y,
      scrollDepth,
      action,
      metadata,
      timeSpentSeconds,
      sessionDurationSeconds,
      title,
      referrer,
      isReturning,
      device,
      clientGeo,
      clientIp,
      userContext,
      consent,
    } = req.body || {};

    if (consent !== true) {
      return res.status(400).json({ message: "Consent is required before tracking." });
    }

    if (!anonymousId || !sessionId || !eventType) {
      return res.status(400).json({ message: "anonymousId, sessionId, and eventType are required." });
    }

    const ipAddress = pickEffectiveIp(getRequestIp(req), clientIp);
    const authUser = await getAuthUserFromRequest(req);
    const now = parseDate(timestamp);
    const safeDevice = buildSafeDevice(device, req);
    const clientLocation = buildSafeLocationFromClientGeo(clientGeo);

    let visitor = await AnonymousVisitor.findOneAndUpdate(
      { anonymousId },
      {
        $setOnInsert: {
          anonymousId,
          firstVisit: now,
          sessions: [],
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const isReturningVisitor = detectReturningFlag(visitor, isReturning);
    const shouldUseIpLookup = !hasLocationSignal(clientLocation) && !hasLocationSignal(visitor?.location || {});
    const ipLocation = shouldUseIpLookup ? await fetchRoughLocation(ipAddress) : {};
    const location = pickBestLocation(clientLocation, visitor?.location, ipLocation);

    visitor.ipAddress = ipAddress || visitor.ipAddress;
    visitor.device = safeDevice;
    visitor.location = location;
    visitor.isReturning = Boolean(visitor.isReturning || isReturningVisitor);
    visitor.lastVisit = now;
    visitor.lastEventAt = now;

    const session = getOrCreateSession(visitor, sessionId, now);
  session.device = safeDevice;
  session.location = location;

    applyEventToSession(session, {
      eventType,
      path,
      timestamp: now,
      element,
      elementText,
      clickLabel,
      sectionLabel,
      x,
      y,
      scrollDepth,
      action,
      metadata,
      timeSpentSeconds,
      sessionDurationSeconds,
      title,
      referrer,
    });

    await visitor.save();

    const effectiveUserId = authUser?._id || userContext?.userId;
    const effectiveEmail = authUser?.email || userContext?.email || "";
    const effectivePhone = authUser?.phone || userContext?.phone || "";
    const authEventType = resolveAuthEventType({ eventType, action });

    if (effectiveUserId) {
      const activityDoc = await getOrCreateUserActivityDoc({
        userId: effectiveUserId,
        anonymousId,
        email: effectiveEmail,
        phone: effectivePhone,
      });
      if (!Array.isArray(activityDoc.activityLogs)) {
        activityDoc.activityLogs = [];
      }

      const userSession = getOrCreateUserSession(activityDoc, sessionId, now);
      userSession.device = safeDevice;
      userSession.location = buildSafeLocation(location);

      applyEventToUserSession(userSession, {
        eventType,
        path,
        timestamp: now,
        element,
        elementText,
        clickLabel,
        sectionLabel,
        x,
        y,
        action,
        metadata,
        timeSpentSeconds,
        sessionDurationSeconds,
        title,
      });

      activityDoc.activityLogs.push({
        sessionId,
        eventType: sanitizeText(eventType, 80),
        action: sanitizeText(action || "", 120),
        page: sanitizeText(path || "", 300),
        clickElement: sanitizeText(clickLabel || element || "", 240),
        timeSpentSeconds: Number(timeSpentSeconds || 0),
        ipAddress,
        location: buildSafeLocation(location),
        device: safeDevice,
        authState: "registered",
        metadata: metadata && typeof metadata === "object" ? metadata : undefined,
        timestamp: now,
      });

      if (activityDoc.activityLogs.length > ACTIVITY_LOG_LIMIT) {
        activityDoc.activityLogs = activityDoc.activityLogs.slice(-ACTIVITY_LOG_LIMIT);
      }

      if (authEventType) {
        appendAuthEvent(activityDoc, {
          type: authEventType,
          source: "event",
          sessionId,
          timestamp: now,
          metadata: {
            action: sanitizeText(action || "", 120),
            path: sanitizeText(path || "", 300),
          },
        });
      }

      activityDoc.lastActiveAt = now;
      await activityDoc.save();
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to track event.", stack: error.stack });
  }
};

export const trackSession = async (req, res) => {
  try {
    const {
      anonymousId,
      sessionId,
      action,
      startedAt,
      endedAt,
      path,
      isReturning,
      consent,
      device,
      clientGeo,
      clientIp,
      metadata,
      userContext,
    } = req.body || {};

    if (consent !== true) {
      return res.status(400).json({ message: "Consent is required before tracking." });
    }

    if (!anonymousId || !sessionId) {
      return res.status(400).json({ message: "anonymousId and sessionId are required." });
    }

    const ipAddress = pickEffectiveIp(getRequestIp(req), clientIp);
    const authUser = await getAuthUserFromRequest(req);
    const sessionStart = parseDate(startedAt);
    const sessionEnd = endedAt ? parseDate(endedAt) : null;
    const safeDevice = buildSafeDevice(device, req);
    const clientLocation = buildSafeLocationFromClientGeo(clientGeo);

    let visitor = await AnonymousVisitor.findOneAndUpdate(
      { anonymousId },
      {
        $setOnInsert: {
          anonymousId,
          firstVisit: sessionStart,
          sessions: [],
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const isReturningVisitor = detectReturningFlag(visitor, isReturning);
    const shouldUseIpLookup = !hasLocationSignal(clientLocation) && !hasLocationSignal(visitor?.location || {});
    const ipLocation = shouldUseIpLookup ? await fetchRoughLocation(ipAddress) : {};
    const location = pickBestLocation(clientLocation, visitor?.location, ipLocation);

    visitor.ipAddress = ipAddress || visitor.ipAddress;
    visitor.device = safeDevice;
    visitor.location = location;
    visitor.isReturning = Boolean(visitor.isReturning || isReturningVisitor);
    visitor.lastVisit = new Date();
    visitor.lastEventAt = new Date();

    const session = getOrCreateSession(visitor, sessionId, sessionStart);
  session.device = safeDevice;
  session.location = location;

    if (action === "session_end") {
      session.endedAt = sessionEnd || new Date();
      if (path) session.exitPath = sanitizeText(path, 300);
      session.durationSeconds = Math.max(
        session.durationSeconds || 0,
        Math.floor((session.endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000)
      );
    }

    if (action === "session_start" && path) {
      session.entryPath = sanitizeText(path, 300);
    }

    if (action === "user_returned") {
      session.events.push({
        eventType: "user_returned",
        action: "visitor_returned",
        path: sanitizeText(path || "", 300),
        metadata: metadata && typeof metadata === "object" ? metadata : undefined,
        timestamp: new Date(),
      });
      visitor.isReturning = true;
    }

    const effectiveUserId = authUser?._id || userContext?.userId;
    const effectiveEmail = authUser?.email || userContext?.email || "";
    const effectivePhone = authUser?.phone || userContext?.phone || "";

    if (effectiveUserId) {
      const activityDoc = await getOrCreateUserActivityDoc({
        userId: effectiveUserId,
        anonymousId,
        email: effectiveEmail,
        phone: effectivePhone,
      });
      if (!Array.isArray(activityDoc.activityLogs)) {
        activityDoc.activityLogs = [];
      }

      const userSession = getOrCreateUserSession(activityDoc, sessionId, sessionStart);
      userSession.device = safeDevice;
      userSession.location = buildSafeLocation(location);

      if (action === "session_start" && path) {
        userSession.entryPath = sanitizeText(path, 300);
      }

      if (action === "session_end") {
        userSession.endedAt = sessionEnd || new Date();
        if (path) userSession.exitPath = sanitizeText(path, 300);
        userSession.durationSeconds = Math.max(
          userSession.durationSeconds || 0,
          Math.floor((userSession.endedAt.getTime() - new Date(userSession.startedAt).getTime()) / 1000)
        );
      }

      const normalizedAction = String(action || "").toLowerCase();
      if (normalizedAction === "link_user") {
        appendAuthEvent(activityDoc, {
          type: "link_user",
          source: "session",
          sessionId,
          timestamp: new Date(),
          metadata: {
            linkedAt: new Date().toISOString(),
            sessionCount: visitor.sessions.length,
          },
        });
      }

      if (normalizedAction === "auth_login") {
        appendAuthEvent(activityDoc, {
          type: "login",
          source: "session",
          sessionId,
          timestamp: new Date(),
          metadata,
        });
      }

      if (normalizedAction === "auth_signup") {
        appendAuthEvent(activityDoc, {
          type: "signup",
          source: "session",
          sessionId,
          timestamp: new Date(),
          metadata,
        });
      }

      activityDoc.activityLogs.push({
        sessionId,
        eventType: sanitizeText(action || "session", 80),
        action: sanitizeText(action || "session", 120),
        page: sanitizeText(path || "", 300),
        ipAddress,
        location: buildSafeLocation(location),
        device: safeDevice,
        authState: "registered",
        metadata: metadata && typeof metadata === "object" ? metadata : undefined,
        timestamp: new Date(),
      });

      if (activityDoc.activityLogs.length > ACTIVITY_LOG_LIMIT) {
        activityDoc.activityLogs = activityDoc.activityLogs.slice(-ACTIVITY_LOG_LIMIT);
      }

      activityDoc.lastActiveAt = new Date();
      await activityDoc.save();
    }

    await visitor.save();

    return res.status(200).json({ ok: true, isReturning: visitor.isReturning });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to track session." });
  }
};

const maskPhone = (phone = "") => {
  const value = String(phone || "").trim();
  if (value.length < 4) return value;
  return `${"*".repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
};

const formatLocationLabel = (location = {}) => {
  const city = sanitizeText(location?.city || "", 80);
  const country = sanitizeText(location?.country || "", 80);
  const region = sanitizeText(location?.region || "", 80);
  const lat = Number.isFinite(Number(location?.latitude)) ? Number(location.latitude).toFixed(4) : "";
  const lng = Number.isFinite(Number(location?.longitude)) ? Number(location.longitude).toFixed(4) : "";

  if (city || country) {
    const regionPart = region ? `${region}, ` : "";
    return `${regionPart}${city || "Unknown"}, ${country || "Unknown"}`;
  }

  if (lat && lng) return `${lat}, ${lng}`;
  return "Unknown";
};

const normalizeDeviceInfo = (device = {}) => ({
  deviceType: sanitizeText(device?.deviceType || "unknown", 40) || "unknown",
  browser: sanitizeText(device?.browser || "Unknown", 80) || "Unknown",
  os: sanitizeText(device?.os || "Unknown", 80) || "Unknown",
});

const parseDeviceKey = (key = "") => {
  try {
    const parsed = JSON.parse(key);
    return normalizeDeviceInfo(parsed || {});
  } catch {
    return normalizeDeviceInfo({});
  }
};

const getTimeValue = (value) => {
  const date = value ? new Date(value) : null;
  const ts = date?.getTime?.() || 0;
  return Number.isFinite(ts) ? ts : 0;
};

const pickLatestTimestamp = (...values) => {
  const validValues = values.filter(Boolean);
  if (validValues.length === 0) return null;

  return validValues.reduce((latest, current) => (
    getTimeValue(current) > getTimeValue(latest) ? current : latest
  ), validValues[0]);
};

const getRegisteredUserStatus = (lastActiveAt) => {
  const ageMs = Date.now() - getTimeValue(lastActiveAt);

  if (ageMs <= LIVE_WINDOW_MS) return { key: "live", label: "Live now" };
  if (ageMs <= RECENT_WINDOW_MS) return { key: "recent", label: "Recently online" };
  if (ageMs <= DAY_WINDOW_MS) return { key: "today", label: "Active today" };
  return { key: "offline", label: "Offline" };
};

const buildProjectSummary = (scripts = []) => {
  const safeScripts = Array.isArray(scripts) ? scripts : [];
  const statusCounts = safeScripts.reduce((acc, script) => {
    const status = String(script?.status || "draft").toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {
    draft: 0,
    pending_approval: 0,
    published: 0,
    rejected: 0,
  });

  return {
    totalProjects: safeScripts.length,
    draftProjects: statusCounts.draft || 0,
    pendingProjects: statusCounts.pending_approval || 0,
    publishedProjects: statusCounts.published || 0,
    rejectedProjects: statusCounts.rejected || 0,
    soldProjects: safeScripts.filter((script) => Boolean(script?.isSold)).length,
    aiTrailerProjects: safeScripts.filter((script) => Boolean(script?.services?.aiTrailer)).length,
    evaluationProjects: safeScripts.filter((script) => Boolean(script?.services?.evaluation)).length,
    spotlightProjects: safeScripts.filter((script) => Boolean(script?.services?.spotlight)).length,
    recentProjects: [...safeScripts]
      .sort((a, b) => getTimeValue(b?.updatedAt || b?.createdAt) - getTimeValue(a?.updatedAt || a?.createdAt))
      .slice(0, 4)
      .map((script) => ({
        _id: script?._id,
        sid: script?.sid || "",
        title: script?.title || "Untitled project",
        status: script?.status || "draft",
        genre: script?.genre || script?.primaryGenre || "",
        contentType: script?.contentType || "",
        updatedAt: script?.updatedAt || script?.createdAt || null,
        isSold: Boolean(script?.isSold),
      })),
  };
};

const getLatestSessionSnapshot = (sessions = []) => {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const latestSession = [...safeSessions]
    .sort((a, b) => getTimeValue(b?.endedAt || b?.startedAt) - getTimeValue(a?.endedAt || a?.startedAt))[0];

  if (!latestSession) return null;

  return {
    sessionId: latestSession.sessionId || "",
    startedAt: latestSession.startedAt || null,
    endedAt: latestSession.endedAt || null,
    durationSeconds: Number(latestSession.durationSeconds || 0),
    entryPath: latestSession.entryPath || "",
    exitPath: latestSession.exitPath || "",
    location: latestSession.location || {},
    device: latestSession.device || {},
  };
};

const getLatestUserActivitySignal = (activity = {}) => {
  const logs = Array.isArray(activity?.activityLogs) ? activity.activityLogs : [];
  const sessions = Array.isArray(activity?.sessions) ? activity.sessions : [];
  const latestSession = getLatestSessionSnapshot(sessions);

  const latestLog = [...logs]
    .sort((a, b) => getTimeValue(b?.timestamp) - getTimeValue(a?.timestamp))[0];

  const latestSessionAction = sessions
    .flatMap((session) => (session?.actions || []).map((action) => ({
      ...action,
      sessionId: session?.sessionId || "",
    })))
    .sort((a, b) => getTimeValue(b?.timestamp) - getTimeValue(a?.timestamp))[0];

  const latestPage = sessions
    .flatMap((session) => (session?.pages || []).map((page) => ({
      ...page,
      sessionId: session?.sessionId || "",
      sessionStartedAt: session?.startedAt || null,
    })))
    .sort((a, b) => getTimeValue(pickLatestTimestamp(b?.exitedAt, b?.enteredAt, b?.sessionStartedAt)) - getTimeValue(pickLatestTimestamp(a?.exitedAt, a?.enteredAt, a?.sessionStartedAt)))[0];

  const latestActionAt = pickLatestTimestamp(
    latestLog?.timestamp,
    latestSessionAction?.timestamp,
    latestPage?.exitedAt,
    latestPage?.enteredAt,
    activity?.lastActiveAt
  );

  const latestPath = sanitizeText(
    latestLog?.page
      || latestSessionAction?.path
      || latestPage?.path
      || latestSession?.exitPath
      || latestSession?.entryPath
      || "",
    300
  );

  const latestAction = sanitizeText(
    latestLog?.action
      || latestSessionAction?.action
      || latestSessionAction?.eventType
      || latestLog?.eventType
      || "",
    120
  );

  return {
    latestPath,
    latestAction,
    latestActionAt,
    latestSession,
  };
};

const buildCsv = ({ visitors, users }) => {
  const visitorHeader = [
    "type",
    "id",
    "isReturning",
    "city",
    "country",
    "deviceType",
    "browser",
    "os",
    "firstVisit",
    "lastVisit",
  ];

  const userHeader = ["type", "userId", "email", "phone", "lastActiveAt", "activityCount"];

  const visitorRows = visitors.map((visitor) => [
    "anonymous",
    visitor.anonymousId,
    visitor.isReturning ? "yes" : "no",
    visitor.location?.city || "",
    visitor.location?.country || "",
    visitor.device?.deviceType || "",
    visitor.device?.browser || "",
    visitor.device?.os || "",
    visitor.firstVisit ? new Date(visitor.firstVisit).toISOString() : "",
    visitor.lastVisit ? new Date(visitor.lastVisit).toISOString() : "",
  ]);

  const userRows = users.map((item) => [
    "registered",
    item.userId?._id?.toString() || "",
    item.email || item.userId?.email || "",
    item.phone || "",
    item.lastActiveAt ? new Date(item.lastActiveAt).toISOString() : "",
    Array.isArray(item.activityLogs) ? item.activityLogs.length : 0,
  ]);

  const lines = [visitorHeader.join(","), ...visitorRows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")), userHeader.join(","), ...userRows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))];

  return lines.join("\n");
};

export const getAdminAnalytics = async (req, res) => {
  try {
    const [visitors, registeredActivities] = await Promise.all([
      AnonymousVisitor.find({}).lean(),
      UserActivity.find({}).populate("userId", "_id name email phone sid role createdAt").lean(),
    ]);

    const trackedUserIds = registeredActivities
      .map((activity) => activity?.userId?._id)
      .filter(Boolean);

    const scripts = trackedUserIds.length > 0
      ? await Script.find({ creator: { $in: trackedUserIds } })
        .select("_id sid creator title status genre primaryGenre contentType isSold services createdAt updatedAt")
        .lean()
      : [];

    const scriptsByCreator = scripts.reduce((acc, script) => {
      const creatorId = script?.creator?.toString?.();
      if (!creatorId) return acc;
      if (!acc.has(creatorId)) acc.set(creatorId, []);
      acc.get(creatorId).push(script);
      return acc;
    }, new Map());

    const totalVisitors = visitors.length;
    const returningVisitors = visitors.filter((visitor) => visitor.isReturning).length;
    const newVisitors = totalVisitors - returningVisitors;

    const deviceBreakdown = visitors.reduce(
      (acc, visitor) => {
        const type = (visitor.device?.deviceType || "unknown").toLowerCase();
        if (type === "mobile") acc.mobile += 1;
        else if (type === "tablet") acc.tablet += 1;
        else if (type === "desktop") acc.desktop += 1;
        else acc.unknown += 1;
        return acc;
      },
      { mobile: 0, tablet: 0, desktop: 0, unknown: 0 }
    );

    const locationMap = new Map();
    const pageMap = new Map();
    const clickHeatmap = [];
    const returnAlerts = [];
    const anonymousUsers = [];

    visitors.forEach((visitor) => {
      const city = visitor.location?.city || "Unknown";
      const country = visitor.location?.country || "Unknown";
      const region = visitor.location?.region || "Unknown";
      const key = `${region}|${city}|${country}`;
      locationMap.set(key, (locationMap.get(key) || 0) + 1);

      let totalPageVisits = 0;
      let totalClicks = 0;
      let totalTimeSeconds = 0;
      let latestPath = "";

      (visitor.sessions || []).forEach((session) => {
        (session.pages || []).forEach((page) => {
          const pageKey = page.path || "unknown";
          const current = pageMap.get(pageKey) || { page: pageKey, visits: 0, totalTimeSeconds: 0 };
          current.visits += 1;
          current.totalTimeSeconds += Number(page.timeSpentSeconds || 0);
          pageMap.set(pageKey, current);

          totalPageVisits += 1;
          totalTimeSeconds += Number(page.timeSpentSeconds || 0);
          latestPath = page.path || latestPath;
        });

        (session.clicks || []).forEach((click) => {
          clickHeatmap.push({
            path: click.path || "",
            element: click.element || "",
            label: click.label || click.text || "",
            section: click.section || "",
            x: Number(click.x || 0),
            y: Number(click.y || 0),
            timestamp: click.timestamp,
          });

          totalClicks += 1;
          latestPath = click.path || latestPath;
        });

        const latestReturnEvent = (session.events || []).find((event) => event.eventType === "user_returned");
        if (latestReturnEvent) {
          returnAlerts.push({
            anonymousId: visitor.anonymousId,
            timestamp: latestReturnEvent.timestamp,
            path: latestReturnEvent.path || "",
            city,
            country,
          });
        }
      });

      anonymousUsers.push({
        anonymousId: visitor.anonymousId,
        firstVisit: visitor.firstVisit,
        lastVisit: visitor.lastVisit,
        lastEventAt: visitor.lastEventAt,
        isReturning: Boolean(visitor.isReturning),
        deviceType: visitor.device?.deviceType || "unknown",
        browser: visitor.device?.browser || "Unknown",
        os: visitor.device?.os || "Unknown",
        location: formatLocationLabel(visitor.location),
        totalSessions: Array.isArray(visitor.sessions) ? visitor.sessions.length : 0,
        totalPageVisits,
        totalClicks,
        totalTimeSeconds,
        latestPath,
      });
    });

    const locationBreakdown = [...locationMap.entries()]
      .map(([key, count]) => {
        const [region, city, country] = key.split("|");
        return { region, city, country, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const pageVisits = [...pageMap.values()]
      .map((entry) => ({
        ...entry,
        avgTimeSeconds: entry.visits > 0 ? Number((entry.totalTimeSeconds / entry.visits).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 100);

    let totalLoginEvents = 0;
    let totalSignupEvents = 0;
    const roleBreakdown = {};

    const registeredUsers = registeredActivities
      .map((activity) => {
        const sessionList = Array.isArray(activity.sessions) ? activity.sessions : [];
        const authEvents = Array.isArray(activity.authEvents) ? activity.authEvents : [];
        const userId = activity.userId?._id?.toString?.() || "";
        const userRole = String(activity.userId?.role || "").trim().toLowerCase() || "unknown";
        const projectSummary = buildProjectSummary(scriptsByCreator.get(userId) || []);
        const activitySignal = getLatestUserActivitySignal(activity);
        const status = getRegisteredUserStatus(activity.lastActiveAt);

        const deviceSet = new Set();
        const locationSet = new Set();

        sessionList.forEach((session) => {
          if (session?.device?.deviceType) deviceSet.add(session.device.deviceType);
          const city = session?.location?.city || "Unknown";
          const country = session?.location?.country || "Unknown";
          locationSet.add(`${city}, ${country}`);
        });

        const loginEvents = authEvents.filter((event) => String(event.type || "").toLowerCase().includes("login")).length;
        const signupEvents = authEvents.filter((event) => String(event.type || "").toLowerCase().includes("signup")).length;
        totalLoginEvents += loginEvents;
        totalSignupEvents += signupEvents;
        roleBreakdown[userRole] = (roleBreakdown[userRole] || 0) + 1;

        return {
          userId: activity.userId?._id,
          sid: activity.userId?.sid || "",
          name: activity.userId?.name || "Unknown",
          email: activity.email || activity.userId?.email || "",
          role: activity.userId?.role || "",
          phone: activity.phone || activity.userId?.phone || "",
          phoneMasked: maskPhone(activity.phone || activity.userId?.phone || ""),
          anonymousId: activity.anonymousId || "",
          currentStatus: status,
          lastActiveAt: activity.lastActiveAt,
          activityCount: Array.isArray(activity.activityLogs) ? activity.activityLogs.length : 0,
          sessionCount: sessionList.length,
          devicesUsed: Array.from(deviceSet),
          locationsVisited: Array.from(locationSet),
          loginEvents,
          signupEvents,
          lastAuthEventAt: authEvents.length ? authEvents[authEvents.length - 1].timestamp : null,
          latestPath: activitySignal.latestPath,
          latestAction: activitySignal.latestAction,
          latestActionAt: activitySignal.latestActionAt,
          latestSession: activitySignal.latestSession,
          projectSummary,
        };
      })
      .sort((a, b) => getTimeValue(b.lastActiveAt) - getTimeValue(a.lastActiveAt));

    const recentAuthEvents = registeredActivities
      .flatMap((activity) => {
        const userName = activity.userId?.name || "Unknown";
        const userEmail = activity.email || activity.userId?.email || "";
        return (activity.authEvents || []).map((event) => ({
          userId: activity.userId?._id,
          userName,
          userEmail,
          type: event.type,
          source: event.source,
          sessionId: event.sessionId,
          timestamp: event.timestamp,
          metadata: event.metadata,
        }));
      })
      .sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp))
      .slice(0, 120);

    const recentlyOnlineUsers = registeredUsers
      .filter((user) => ["live", "recent", "today"].includes(user.currentStatus?.key))
      .slice(0, 8);

    const liveActivity = {
      activeAnonymousUsers: visitors.filter((visitor) => {
        const ts = getTimeValue(visitor.lastEventAt);
        return Date.now() - ts <= LIVE_WINDOW_MS;
      }).length,
      activeRegisteredUsers: registeredUsers.filter((user) => {
        const ts = getTimeValue(user.lastActiveAt);
        return Date.now() - ts <= LIVE_WINDOW_MS;
      }).length,
    };

    const registeredActivitySummary = {
      activeInLast30Minutes: registeredUsers.filter((user) => {
        const ts = getTimeValue(user.lastActiveAt);
        return Date.now() - ts <= RECENT_WINDOW_MS;
      }).length,
      activeInLast24Hours: registeredUsers.filter((user) => {
        const ts = getTimeValue(user.lastActiveAt);
        return Date.now() - ts <= DAY_WINDOW_MS;
      }).length,
      usersWithProjects: registeredUsers.filter((user) => (user.projectSummary?.totalProjects || 0) > 0).length,
      usersWithPendingProjects: registeredUsers.filter((user) => (user.projectSummary?.pendingProjects || 0) > 0).length,
      usersWithDraftProjects: registeredUsers.filter((user) => (user.projectSummary?.draftProjects || 0) > 0).length,
    };

    if (String(req.query.format || "").toLowerCase() === "csv") {
      const csv = buildCsv({ visitors, users: registeredActivities });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=analytics-${Date.now()}.csv`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({
      anonymousVisitors: {
        totalVisitors,
        newVisitors,
        returningVisitors,
        deviceBreakdown,
        locationBreakdown,
        pageVisits,
        clickHeatmap,
        anonymousUsers: anonymousUsers
          .sort((a, b) => new Date(b.lastEventAt || 0).getTime() - new Date(a.lastEventAt || 0).getTime())
          .slice(0, 200),
      },
      registeredUsers: {
        totalUsers: registeredUsers.length,
        users: registeredUsers,
        roleBreakdown,
        activitySummary: registeredActivitySummary,
        recentlyOnlineUsers,
        authSummary: {
          totalLoginEvents,
          totalSignupEvents,
          usersWithSignupEvent: registeredUsers.filter((item) => item.signupEvents > 0).length,
          usersWithLoginEvent: registeredUsers.filter((item) => item.loginEvents > 0).length,
        },
        recentAuthEvents,
      },
      liveActivity,
      alerts: {
        returnedUsers: returnAlerts
          .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
          .slice(0, 50),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch admin analytics." });
  }
};

export const getAdminAnalyticsAnonymousDetail = async (req, res) => {
  try {
    const anonymousId = sanitizeText(req.params?.anonymousId || "", 160);
    if (!anonymousId) {
      return res.status(400).json({ message: "anonymousId is required." });
    }

    const visitor = await AnonymousVisitor.findOne({ anonymousId }).lean();
    if (!visitor) {
      return res.status(404).json({ message: "No analytics data found for this temporary user ID yet." });
    }

    const sessions = Array.isArray(visitor.sessions) ? visitor.sessions : [];

    const pageMap = new Map();
    const deviceMap = new Map();
    const locationMap = new Map();
    let totalClicks = 0;
    let totalTimeSeconds = 0;

    const latestEvents = [];
    const latestClicks = [];

    sessions.forEach((session) => {
      const deviceInfo = normalizeDeviceInfo(session?.device || visitor.device || {});
      const deviceKey = JSON.stringify(deviceInfo);
      deviceMap.set(deviceKey, (deviceMap.get(deviceKey) || 0) + 1);

      const locationLabel = formatLocationLabel(session?.location || visitor.location || {});
      locationMap.set(locationLabel, (locationMap.get(locationLabel) || 0) + 1);

      (session.pages || []).forEach((page) => {
        const pageKey = page.path || "unknown";
        const current = pageMap.get(pageKey) || {
          path: pageKey,
          visits: 0,
          totalTimeSeconds: 0,
        };
        current.visits += 1;
        current.totalTimeSeconds += Number(page.timeSpentSeconds || 0);
        totalTimeSeconds += Number(page.timeSpentSeconds || 0);
        pageMap.set(pageKey, current);
      });

      (session.clicks || []).forEach((click) => {
        totalClicks += 1;
        latestClicks.push({
          sessionId: session.sessionId,
          path: click.path || "",
          element: click.element || "",
          text: click.text || "",
          label: click.label || click.text || "",
          section: click.section || "",
          x: Number(click.x || 0),
          y: Number(click.y || 0),
          timestamp: click.timestamp,
        });
      });

      (session.events || []).forEach((event) => {
        latestEvents.push({
          sessionId: session.sessionId,
          eventType: event.eventType || "event",
          action: event.action || "",
          path: event.path || "",
          timestamp: event.timestamp,
          metadata: event.metadata,
        });
      });
    });

    const pages = [...pageMap.values()]
      .map((entry) => ({
        ...entry,
        avgTimeSeconds: entry.visits ? Number((entry.totalTimeSeconds / entry.visits).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 150);

    return res.status(200).json({
      anonymous: {
        temporaryId: visitor.anonymousId,
        isReturning: Boolean(visitor.isReturning),
        firstVisit: visitor.firstVisit,
        lastVisit: visitor.lastVisit,
        lastEventAt: visitor.lastEventAt,
        ipAddress: visitor.ipAddress || "",
        device: visitor.device || {},
        location: visitor.location || {},
      },
      summary: {
        totalSessions: sessions.length,
        totalEvents: latestEvents.length,
        totalPageVisits: pages.reduce((sum, page) => sum + page.visits, 0),
        totalClicks,
        totalTimeSeconds,
      },
      devices: [...deviceMap.entries()]
        .map(([deviceKey, count]) => {
          const deviceInfo = parseDeviceKey(deviceKey);
          return {
            ...deviceInfo,
            label: `${deviceInfo.deviceType} / ${deviceInfo.browser} / ${deviceInfo.os}`,
            count,
          };
        })
        .sort((a, b) => b.count - a.count),
      locations: [...locationMap.entries()]
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count),
      pages,
      sessions: [...sessions].sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()),
      latestEvents: latestEvents
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 400),
      latestClicks: latestClicks
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 300),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch anonymous user analytics details." });
  }
};

export const getAdminAnalyticsUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const [activity, userScripts] = await Promise.all([
      UserActivity.findOne({ userId }).populate("userId", "_id name email phone sid role createdAt").lean(),
      Script.find({ creator: userId })
        .select("_id sid title status genre primaryGenre contentType isSold services createdAt updatedAt")
        .lean(),
    ]);

    if (!activity) {
      return res.status(404).json({ message: "No analytics data found for this user yet." });
    }

    const sessions = Array.isArray(activity.sessions) ? activity.sessions : [];
    const logs = Array.isArray(activity.activityLogs) ? activity.activityLogs : [];
    const authEvents = Array.isArray(activity.authEvents) ? activity.authEvents : [];
    const projectSummary = buildProjectSummary(userScripts);
    const currentStatus = getRegisteredUserStatus(activity.lastActiveAt);
    const activitySignal = getLatestUserActivitySignal(activity);

    const pageAggregateMap = new Map();
    const deviceMap = new Map();
    const locationMap = new Map();
    let totalClicks = 0;
    let totalTimeSeconds = 0;

    sessions.forEach((session) => {
      const deviceInfo = normalizeDeviceInfo(session?.device || {});
      const deviceKey = JSON.stringify(deviceInfo);
      deviceMap.set(deviceKey, (deviceMap.get(deviceKey) || 0) + 1);

      const city = session?.location?.city || "Unknown";
      const country = session?.location?.country || "Unknown";
      const locationKey = `${city}, ${country}`;
      locationMap.set(locationKey, (locationMap.get(locationKey) || 0) + 1);

      totalClicks += (session.clicks || []).length;

      (session.pages || []).forEach((page) => {
        const pageKey = page.path || "unknown";
        const current = pageAggregateMap.get(pageKey) || {
          path: pageKey,
          visits: 0,
          totalTimeSeconds: 0,
        };
        current.visits += 1;
        current.totalTimeSeconds += Number(page.timeSpentSeconds || 0);
        totalTimeSeconds += Number(page.timeSpentSeconds || 0);
        pageAggregateMap.set(pageKey, current);
      });
    });

    const pages = [...pageAggregateMap.values()]
      .map((entry) => ({
        ...entry,
        avgTimeSeconds: entry.visits ? Number((entry.totalTimeSeconds / entry.visits).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.visits - a.visits);

    const latestActions = [...logs]
      .sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp))
      .slice(0, 300);

    return res.status(200).json({
      user: {
        id: activity.userId?._id,
        sid: activity.userId?.sid,
        name: activity.userId?.name || "Unknown",
        email: activity.email || activity.userId?.email || "",
        phoneMasked: maskPhone(activity.phone || activity.userId?.phone || ""),
        role: activity.userId?.role || "",
        currentStatus,
        latestPath: activitySignal.latestPath,
        latestAction: activitySignal.latestAction,
        latestActionAt: activitySignal.latestActionAt,
      },
      summary: {
        totalSessions: sessions.length,
        totalActions: logs.length,
        totalPageVisits: pages.reduce((sum, item) => sum + item.visits, 0),
        totalClicks,
        totalTimeSeconds,
        firstSeenAt: activity.createdAt,
        lastActiveAt: activity.lastActiveAt,
        signupAt: activity.signupAt,
        firstLoginAt: activity.firstLoginAt,
        lastLoginAt: activity.lastLoginAt,
        projectsTracked: projectSummary.totalProjects || 0,
      },
      projectSummary,
      latestSession: activitySignal.latestSession,
      devices: [...deviceMap.entries()]
        .map(([deviceKey, count]) => {
          const deviceInfo = parseDeviceKey(deviceKey);
          return {
            ...deviceInfo,
            label: `${deviceInfo.deviceType} / ${deviceInfo.browser} / ${deviceInfo.os}`,
            count,
          };
        })
        .sort((a, b) => b.count - a.count),
      locations: [...locationMap.entries()]
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count),
      authEvents: [...authEvents].sort((a, b) => getTimeValue(b.timestamp) - getTimeValue(a.timestamp)),
      pages,
      sessions: [...sessions].sort((a, b) => getTimeValue(b.startedAt) - getTimeValue(a.startedAt)),
      latestActions,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch user analytics details." });
  }
};
