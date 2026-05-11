import crypto from "crypto";
import Razorpay from "razorpay";
import EventRegistration from "../models/EventRegistration.js";
import EventSubmission from "../models/EventSubmission.js";

const EVENT_SLUGS = new Set(["ckript-global-scriptathon-2026"]);
const EVENT_DETAILS = {
  slug: "ckript-global-scriptathon-2026",
  title: "Ckript Global Scriptathon 2026",
  subtitle: "You’re competing with writers across the world.",
  startAt: "2026-05-23T18:00:00+05:30",
  endAt: "2026-05-25T18:00:00+05:30",
  supportEmail: "support@ckript.com",
};
let razorpayInstance = null;

const normalizeString = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeString(value).toLowerCase();
const WORDS_PER_PAGE = 250;
const VALID_EVENT_GENRES = new Set(["Thriller", "Drama", "Sci-Fi", "Romance", "Horror", "Fantasy", "Anime", "Comedy", "Action", "Other"]);

const generateParticipantId = () => {
  const token = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CKRIPT-2026-${token}`;
};

const ensureEventSlug = (slug) => {
  const normalized = normalizeString(slug);
  if (!EVENT_SLUGS.has(normalized)) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }
  return normalized;
};

const getEventStatus = (now = new Date()) => {
  const startAt = new Date(EVENT_DETAILS.startAt);
  const endAt = new Date(EVENT_DETAILS.endAt);

  if (now < startAt) return "upcoming";
  if (now <= endAt) return "live";
  return "completed";
};

const normalizeContentText = (value) => normalizeString(value).replace(/\s+/g, " ");
const countWords = (value) => {
  const text = normalizeContentText(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

const getRegistrationOrThrow = async ({ userId, eventSlug }) => {
  const registration = await EventRegistration.findOne({ user: userId, eventSlug });
  if (!registration) {
    const error = new Error("Registration not found");
    error.statusCode = 404;
    throw error;
  }
  return registration;
};

const toSubmissionSummary = (submission) => {
  if (!submission) return null;
  return {
    _id: submission._id,
    title: submission.title || "",
    genre: submission.genre || "",
    logline: submission.logline || "",
    contentHtml: submission.contentHtml || "",
    contentText: submission.contentText || "",
    status: submission.status || "draft",
    wordCount: submission.wordCount || 0,
    estimatedPages: submission.estimatedPages || 0,
    updatedAt: submission.updatedAt,
    submittedAt: submission.submittedAt,
  };
};

const getRazorpay = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

const getEventPricing = (user = {}) => {
  const country = normalizeString(user.address?.country).toLowerCase();
  const isIndia = !country || country === "india" || country === "in";
  return {
    amount: isIndia ? 99 : 5,
    currency: isIndia ? "INR" : "USD",
  };
};

const buildRegistrationPayload = (req, overrides = {}) => {
  const user = req.user || {};
  const userAddress = user.address || {};
  const pricing = getEventPricing(user);

  return {
    fullName: normalizeString(user.name || req.body.fullName),
    username: normalizeString(user.writerProfile?.username || req.body.username),
    email: normalizeEmail(user.email || req.body.email),
    phoneNumber: normalizeString(user.phone || req.body.phoneNumber),
    country: normalizeString(userAddress.country || req.body.country),
    city: normalizeString(userAddress.city || req.body.city),
    bio: normalizeString(user.bio || req.body.bio),
    socialLinks: normalizeString(req.body.socialLinks),
    experienceLevel: normalizeString(req.body.experienceLevel),
    preferredGenre: normalizeString(req.body.preferredGenre),
    participationReason: normalizeString(req.body.participationReason),
    storyPlan: normalizeString(req.body.storyPlan),
    agreedOriginal: true,
    agreedRules: true,
    paymentStatus: normalizeString(overrides.paymentStatus || req.body.paymentStatus) || "pending",
    paymentAmount: Number(overrides.paymentAmount || req.body.paymentAmount) || pricing.amount,
    paymentCurrency: normalizeString(overrides.paymentCurrency || req.body.paymentCurrency) || pricing.currency,
    paymentProvider: normalizeString(overrides.paymentProvider || req.body.paymentProvider) || "manual",
    paymentReference: normalizeString(overrides.paymentReference || req.body.paymentReference),
  };
};

const createRegistrationForUser = async ({ req, eventSlug, payload }) => {
  if (!payload.fullName || !payload.email) {
    const error = new Error("Your account must have a name and email before registration.");
    error.statusCode = 400;
    throw error;
  }

  let registration = await EventRegistration.findOne({
    user: req.user._id,
    eventSlug,
  });

  if (registration) {
    return { registration, alreadyRegistered: true, statusCode: 200 };
  }

  registration = await EventRegistration.create({
    user: req.user._id,
    eventSlug,
    participantId: generateParticipantId(),
    ...payload,
  });

  return { registration, alreadyRegistered: false, statusCode: 201 };
};

export const registerForEvent = async (req, res) => {
  try {
    ensureEventSlug(req.params.slug);
    return res.status(400).json({ message: "Complete payment verification to register for this event." });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to register for event" });
  }
};

export const createEventPaymentOrder = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const existingRegistration = await EventRegistration.findOne({
      user: req.user._id,
      eventSlug,
    });

    if (existingRegistration) {
      return res.status(200).json({
        alreadyRegistered: true,
        registration: existingRegistration,
      });
    }

    const pricing = getEventPricing(req.user);
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(pricing.amount * 100),
      currency: pricing.currency,
      receipt: `event_${Date.now()}`,
      notes: {
        type: "event_registration",
        eventSlug,
        userId: req.user._id.toString(),
      },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      eventDetails: {
        slug: eventSlug,
        title: "Ckript Global Scriptathon 2026",
        amount: pricing.amount,
        currency: pricing.currency,
      },
    });
  } catch (error) {
    const status = error.message === "Razorpay credentials not configured" ? 503 : 500;
    return res.status(status).json({ message: error.message || "Failed to create event payment order" });
  }
};

export const verifyEventPayment = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing payment verification details." });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ message: "Payment verification is not configured." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed." });
    }

    const razorpay = getRazorpay();
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);
    const pricing = getEventPricing(req.user);

    if (
      order.id !== razorpay_order_id ||
      payment.order_id !== razorpay_order_id ||
      order.notes?.eventSlug !== eventSlug ||
      order.notes?.userId !== req.user._id.toString() ||
      Number(order.amount) !== Math.round(pricing.amount * 100) ||
      String(order.currency || "").toUpperCase() !== pricing.currency
    ) {
      return res.status(400).json({ message: "Payment does not match this event registration." });
    }

    if (payment.status !== "captured") {
      return res.status(400).json({ message: "Payment has not been completed." });
    }

    const payload = buildRegistrationPayload(req, {
      paymentStatus: "paid",
      paymentAmount: pricing.amount,
      paymentCurrency: pricing.currency,
      paymentProvider: "razorpay",
      paymentReference: razorpay_payment_id,
    });
    const result = await createRegistrationForUser({ req, eventSlug, payload });

    return res.status(result.statusCode).json({
      registration: result.registration,
      alreadyRegistered: result.alreadyRegistered,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to verify event payment" });
  }
};

export const getMyEventRegistration = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const registration = await EventRegistration.findOne({
      user: req.user._id,
      eventSlug,
    }).populate("user", "name email role");
    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    return res.json({ registration });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to load registration" });
  }
};

export const getMyEventDashboard = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const registration = await EventRegistration.findOne({
      user: req.user._id,
      eventSlug,
    }).populate("user", "name email role");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    const [participantCount, submission] = await Promise.all([
      EventRegistration.countDocuments({ eventSlug }),
      EventSubmission.findOne({ user: req.user._id, eventSlug }),
    ]);
    const serverTime = new Date();

    return res.json({
      serverTime: serverTime.toISOString(),
      event: {
        ...EVENT_DETAILS,
        status: getEventStatus(serverTime),
        participantCount,
      },
      registration,
      competition: {
        submission: toSubmissionSummary(submission),
        ranking: null,
        leaderboard: [],
        aiInsights: null,
        announcements: [],
        achievements: [],
        globalActivity: [],
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to load event dashboard" });
  }
};

export const getMyEventEditor = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const registration = await getRegistrationOrThrow({ userId: req.user._id, eventSlug });
    const submission = await EventSubmission.findOne({ user: req.user._id, eventSlug });
    const participantCount = await EventRegistration.countDocuments({ eventSlug });
    const serverTime = new Date();

    return res.json({
      serverTime: serverTime.toISOString(),
      event: {
        ...EVENT_DETAILS,
        status: getEventStatus(serverTime),
        participantCount,
      },
      registration,
      submission: toSubmissionSummary(submission),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to load event editor" });
  }
};

export const saveMyEventDraft = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const registration = await getRegistrationOrThrow({ userId: req.user._id, eventSlug });
    const existing = await EventSubmission.findOne({ user: req.user._id, eventSlug });

    if (existing?.status === "submitted") {
      return res.status(409).json({ message: "This event script has already been submitted and is locked." });
    }

    const title = normalizeString(req.body.title).slice(0, 160);
    const genreInput = normalizeString(req.body.genre);
    const genre = VALID_EVENT_GENRES.has(genreInput) ? genreInput : "";
    const logline = normalizeString(req.body.logline).slice(0, 300);
    const contentHtml = String(req.body.contentHtml || "");
    const contentText = normalizeContentText(req.body.contentText);
    const wordCount = countWords(contentText);
    const estimatedPages = Math.ceil(wordCount / WORDS_PER_PAGE);

    const submission = await EventSubmission.findOneAndUpdate(
      { user: req.user._id, eventSlug },
      {
        $set: {
          user: req.user._id,
          registration: registration._id,
          eventSlug,
          title,
          genre,
          logline,
          contentHtml,
          contentText,
          wordCount,
          estimatedPages,
          status: "draft",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ submission: toSubmissionSummary(submission) });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to save event draft" });
  }
};

export const submitMyEventScript = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);
    const submission = await EventSubmission.findOne({ user: req.user._id, eventSlug });

    if (!submission) {
      return res.status(400).json({ message: "Save a draft before submitting." });
    }

    if (submission.status === "submitted") {
      return res.json({ submission: toSubmissionSummary(submission) });
    }

    const confirmedOriginal = Boolean(req.body.confirmedOriginal);
    const acceptedEditLock = Boolean(req.body.acceptedEditLock);
    const acceptedRules = Boolean(req.body.acceptedRules);

    if (!confirmedOriginal || !acceptedEditLock || !acceptedRules) {
      return res.status(400).json({ message: "Please confirm originality, edit lock, and competition rules before submitting." });
    }

    if (!submission.title || !submission.genre || !submission.contentText) {
      return res.status(400).json({ message: "Title, genre, and script content are required before final submission." });
    }

    const now = new Date();
    submission.status = "submitted";
    submission.submittedAt = now;
    submission.originalityConfirmedAt = now;
    submission.editLockAcceptedAt = now;
    submission.rulesAcceptedAt = now;
    await submission.save();

    return res.json({ submission: toSubmissionSummary(submission) });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to submit event script" });
  }
};

export const getEventRegistrationsAdmin = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.query.slug);
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const search = normalizeString(req.query.search).toLowerCase();

    const filters = { eventSlug };
    if (search) {
      filters.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { participantId: { $regex: search, $options: "i" } },
      ];
    }

    const total = await EventRegistration.countDocuments(filters);
    const registrations = await EventRegistration.find(filters)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email role");

    return res.json({
      registrations,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to load registrations" });
  }
};
