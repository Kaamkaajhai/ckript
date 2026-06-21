import Stripe from "stripe";
import mongoose from "mongoose";
import User from "../models/User.js";
import {
  hasActiveFilmIndustryProfessionalAccess,
  isFilmIndustryProfessionalRole,
  hasRevealedContact,
  hasReachedContactLimit,
  getRevealedContactCount,
  getContactsLimit,
  getRemainingContacts,
  hasMessagedWriter,
  hasReachedMessageWritersLimit,
  getMessagedWritersCount,
  getMessageWritersLimit,
  getRemainingMessageWriters,
} from "../utils/industryAccess.js";

import crypto from "crypto";

// Initialize Stripe only if the secret key is provided
const stripe = process.env.STRIPE_SECRET
  ? new Stripe(process.env.STRIPE_SECRET)
  : null;

const FILM_INDUSTRY_PRO_MODEL = {
  plan: "pro",
  amount: 199900,
  currency: "INR",
  durationDays: 30,
  checkoutProvider: "razorpay",
  checkoutMode: "live",
  accessTier: "film_industry_professional",
};

const getRazorpayInstance = async () => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
    const { default: Razorpay } = await import("razorpay");
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } catch (err) {
    console.error("Error initializing Razorpay:", err);
    return null;
  }
};

const normalizeReturnPath = (value = "") => {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/")) return "";
  if (path.startsWith("//")) return "";
  if (path.startsWith("/login") || path.startsWith("/signup")) return "";
  return path;
};

export const createCheckout = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: "Payment service not configured. Please add STRIPE_SECRET to .env file." });
    }
    
    const { amount, scriptId } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: "Script Unlock" },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success?scriptId=${scriptId}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFilmIndustryProfessionalTestCheckoutStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      access: {
        hasAccess: hasActiveFilmIndustryProfessionalAccess(user),
        isEligibleRole: isFilmIndustryProfessionalRole(user),
      },
      subscription: user.subscription || {},
      user: user.toObject(),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load pricing status" });
  }
};

export const activateFilmIndustryProfessionalTestCheckout = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select("role subscription");
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isFilmIndustryProfessionalRole(currentUser)) {
      return res.status(403).json({
        message: "Only film industry professionals can activate this pricing plan.",
      });
    }

    const returnTo = normalizeReturnPath(req.body?.returnTo || req.get("referer") || "");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + FILM_INDUSTRY_PRO_MODEL.durationDays * 24 * 60 * 60 * 1000);
    const checkoutReference = `razorpay_test_${currentUser._id.toString()}_${Date.now()}`;

    const update = {
      $set: {
        "subscription.plan": FILM_INDUSTRY_PRO_MODEL.plan,
        "subscription.expiresAt": expiresAt,
        "subscription.accessTier": FILM_INDUSTRY_PRO_MODEL.accessTier,
        "subscription.accessStatus": "active",
        "subscription.accessActivatedAt": now,
        "subscription.accessExpiresAt": expiresAt,
        "subscription.checkoutMode": FILM_INDUSTRY_PRO_MODEL.checkoutMode,
        "subscription.checkoutProvider": FILM_INDUSTRY_PRO_MODEL.checkoutProvider,
        "subscription.checkoutReference": checkoutReference,
        "subscription.sourcePath": returnTo || "/home",
        "subscription.revealedContacts": [],
        "subscription.messagedWriters": [],
        "subscription.contactsLimit": 10,
        "subscription.messageWritersLimit": 10,
      },
    };

    await User.updateOne({ _id: currentUser._id }, update);

    const refreshedUser = await User.findById(currentUser._id).select("-password");

    return res.json({
      message: "Test checkout activated successfully.",
      redirectTo: "/home",
      access: {
        hasAccess: true,
        isEligibleRole: true,
      },
      subscription: refreshedUser?.subscription || currentUser.subscription,
      user: refreshedUser?.toObject ? refreshedUser.toObject() : refreshedUser,
      plan: FILM_INDUSTRY_PRO_MODEL,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to activate test checkout" });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select("role");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    if (!isFilmIndustryProfessionalRole(currentUser)) {
      return res.status(403).json({ message: "Only film industry professionals can purchase this plan." });
    }

    console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);
    console.log("RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET);

    const razorpay = await getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({ 
        message: "Razorpay is not configured. Keys are missing.",
        debug: {
          keyId: process.env.RAZORPAY_KEY_ID || "undefined",
          keySecret: process.env.RAZORPAY_KEY_SECRET ? "exists" : "undefined",
        }
      });
    }

    const options = {
      amount: FILM_INDUSTRY_PRO_MODEL.amount,
      currency: FILM_INDUSTRY_PRO_MODEL.currency,
      receipt: `rcpt_${currentUser._id.toString().substring(18)}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).json({ message: "Failed to create Razorpay order" });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    return res.status(500).json({ message: error.message || error.description || "Failed to create order" });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, returnTo } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing required payment details" });
    }

    const currentUser = await User.findById(req.user._id).select("role subscription");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // Verify signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed: Invalid signature" });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + FILM_INDUSTRY_PRO_MODEL.durationDays * 24 * 60 * 60 * 1000);

    const update = {
      $set: {
        "subscription.plan": FILM_INDUSTRY_PRO_MODEL.plan,
        "subscription.expiresAt": expiresAt,
        "subscription.accessTier": FILM_INDUSTRY_PRO_MODEL.accessTier,
        "subscription.accessStatus": "active",
        "subscription.accessActivatedAt": now,
        "subscription.accessExpiresAt": expiresAt,
        "subscription.checkoutMode": "live",
        "subscription.checkoutProvider": "razorpay",
        "subscription.checkoutReference": razorpay_payment_id,
        "subscription.sourcePath": normalizeReturnPath(returnTo) || "/home",
        "subscription.revealedContacts": [],
        "subscription.messagedWriters": [],
        "subscription.contactsLimit": 10,
        "subscription.messageWritersLimit": 10,
      },
    };

    await User.updateOne({ _id: currentUser._id }, update);

    const refreshedUser = await User.findById(currentUser._id).select("-password");

    return res.json({
      message: "Payment verified and subscription activated.",
      redirectTo: normalizeReturnPath(returnTo) || "/home",
      access: {
        hasAccess: true,
        isEligibleRole: true,
      },
      subscription: refreshedUser?.subscription || currentUser.subscription,
      user: refreshedUser?.toObject ? refreshedUser.toObject() : refreshedUser,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Payment verification failed" });
  }
};

export const revealWriterContact = async (req, res) => {
  try {
    const { writerId } = req.params;

    if (!writerId || !mongoose.Types.ObjectId.isValid(writerId)) {
      return res.status(400).json({ message: "Invalid writer ID" });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!hasActiveFilmIndustryProfessionalAccess(user)) {
      return res.status(403).json({
        message: "Film Industry Professional subscription required to reveal writer contacts.",
        requiresUpgrade: true,
      });
    }

    const writerObjectId = String(writerId);
    const alreadyRevealed = hasRevealedContact(user, writerObjectId);

    if (!alreadyRevealed) {
      if (hasReachedContactLimit(user)) {
        return res.status(403).json({
          message: "You've reached your 15 writer contact limit for this subscription period.",
          limitReached: true,
          contactsUsed: getRevealedContactCount(user),
          contactsLimit: getContactsLimit(user),
          remainingContacts: 0,
        });
      }

      await User.updateOne(
        { _id: user._id },
        {
          $push: {
            "subscription.revealedContacts": {
              writerId: new mongoose.Types.ObjectId(writerId),
              revealedAt: new Date(),
            },
          },
        }
      );
    }

    const writer = await User.findById(writerId)
      .select("email phone writerProfile.links name username")
      .lean();
    if (!writer) return res.status(404).json({ message: "Writer not found" });

    const refreshedUser = await User.findById(user._id).select("subscription").lean();
    const contactsUsed = getRevealedContactCount(refreshedUser || user);
    const contactsLimit = getContactsLimit(refreshedUser || user);
    const remainingContacts = getRemainingContacts(refreshedUser || user);

    return res.json({
      contact: {
        email: String(writer.email || "").trim(),
        phone: String(writer.phone || "").trim(),
        links: writer.writerProfile?.links || {},
      },
      alreadyRevealed,
      contactsUsed,
      contactsLimit,
      remainingContacts,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to reveal contact" });
  }
};

export const consumeMessageWriterSlot = async (req, res) => {
  try {
    const { writerId } = req.params;
    if (!writerId) return res.status(400).json({ message: "writerId is required" });

    const user = await User.findById(req.user._id).select("subscription role isPremium").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const alreadyMessaged = hasMessagedWriter(user, writerId);
    
    if (!alreadyMessaged) {
      if (hasReachedMessageWritersLimit(user)) {
        return res.status(403).json({
          message: "You've reached your message limit for this subscription period.",
          limitReached: true,
          messagesUsed: getMessagedWritersCount(user),
          messageWritersLimit: getMessageWritersLimit(user),
          remainingMessageWriters: 0,
        });
      }

      await User.updateOne(
        { _id: user._id },
        {
          $push: {
            "subscription.messagedWriters": {
              writerId: new mongoose.Types.ObjectId(writerId),
              messagedAt: new Date(),
            },
          },
        }
      );
    }

    const refreshedUser = await User.findById(user._id).select("subscription").lean();
    const messagesUsed = getMessagedWritersCount(refreshedUser || user);
    const messageWritersLimit = getMessageWritersLimit(refreshedUser || user);
    const remainingMessageWriters = getRemainingMessageWriters(refreshedUser || user);

    return res.json({
      alreadyMessaged,
      messagesUsed,
      messageWritersLimit,
      remainingMessageWriters,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to consume message slot" });
  }
};
