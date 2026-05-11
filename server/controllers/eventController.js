import EventRegistration from "../models/EventRegistration.js";

const EVENT_SLUGS = new Set(["ckript-global-scriptathon-2026"]);

const normalizeString = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeString(value).toLowerCase();

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

export const registerForEvent = async (req, res) => {
  try {
    const eventSlug = ensureEventSlug(req.params.slug);

    const payload = {
      fullName: normalizeString(req.body.fullName),
      username: normalizeString(req.body.username),
      email: normalizeEmail(req.body.email),
      phoneNumber: normalizeString(req.body.phoneNumber),
      country: normalizeString(req.body.country),
      city: normalizeString(req.body.city),
      bio: normalizeString(req.body.bio),
      socialLinks: normalizeString(req.body.socialLinks),
      experienceLevel: normalizeString(req.body.experienceLevel),
      preferredGenre: normalizeString(req.body.preferredGenre),
      participationReason: normalizeString(req.body.participationReason),
      storyPlan: normalizeString(req.body.storyPlan),
      agreedOriginal: Boolean(req.body.agreedOriginal),
      agreedRules: Boolean(req.body.agreedRules),
      paymentStatus: normalizeString(req.body.paymentStatus) || "pending",
      paymentAmount: Number(req.body.paymentAmount) || 0,
      paymentCurrency: normalizeString(req.body.paymentCurrency) || "INR",
      paymentProvider: normalizeString(req.body.paymentProvider) || "manual",
      paymentReference: normalizeString(req.body.paymentReference),
    };

    const requiredFields = [
      "fullName",
      "email",
      "phoneNumber",
      "country",
      "city",
      "experienceLevel",
      "preferredGenre",
      "participationReason",
      "storyPlan",
    ];

    const missing = requiredFields.filter((field) => !payload[field]);
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(", ")}` });
    }

    if (!payload.agreedOriginal || !payload.agreedRules) {
      return res.status(400).json({ message: "You must accept the originality and rules agreement." });
    }

    if (payload.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Payment is required to complete registration." });
    }

    let registration = await EventRegistration.findOne({
      user: req.user._id,
      eventSlug,
    });

    if (registration) {
      return res.status(200).json({
        registration,
        alreadyRegistered: true,
      });
    }

    registration = await EventRegistration.create({
      user: req.user._id,
      eventSlug,
      participantId: generateParticipantId(),
      ...payload,
    });

    return res.status(201).json({ registration });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to register for event" });
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
