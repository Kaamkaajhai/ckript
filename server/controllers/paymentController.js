import mongoose from "mongoose";
import User from "../models/User.js";
import {
  hasActiveFilmIndustryProfessionalAccess,
  hasAnyFipAccess,
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
  isWriterRole,
} from "../utils/industryAccess.js";

import crypto from "crypto";
import { resolveCurrency } from "../utils/currencyFx.js";
import { createOrderWithUsdFallback } from "../utils/razorpayOrder.js";
import { PLAN_PRICES, WRITER_PLAN_KEY } from "../config/pricing.js";
import { planOrderNotes, readVerifiedPlanOrder, planAmountMinor } from "../utils/planCheckout.js";
import { recordPayment, recordGrant } from "../utils/ledger.js";
import { issueInvoice, totalRow, gatewayRow, formatInvoiceMoney } from "../utils/invoiceIssue.js";

const FILM_INDUSTRY_PRO_MODEL = {
  plan: "pro",
  amount: 199900,
  currency: "INR",
  durationDays: 30,
  checkoutProvider: "razorpay",
  checkoutMode: "live",
  accessTier: "film_industry_professional",
};

const WRITER_SILVER_MODEL = {
  plan: "silver",
  amount: 39900, // 399 INR in paise
  currency: "INR",
  durationDays: 30,
  checkoutProvider: "razorpay",
  checkoutMode: "live",
  accessTier: "writer_silver",
};

const WRITER_GOLD_MODEL = {
  plan: "gold",
  amount: 69900, // 699 INR in paise
  currency: "INR",
  durationDays: 30,
  checkoutProvider: "razorpay",
  checkoutMode: "live",
  accessTier: "writer_gold",
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
        "subscription.aiImagesGeneratedTotal": 0,
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
        "subscription.meetingsLimit": 10,
      },
    };

    await User.updateOne({ _id: currentUser._id }, update);

    // A free 30-day Diamond. It writes checkoutMode:"live" and checkoutProvider:"razorpay" onto the
    // user, so in that record it is indistinguishable from a ₹1,999 sale — this entry is the only
    // thing that tells the two apart, and carries the revenue foregone.
    await recordGrant({
      kind: "plan_subscription",
      user: currentUser._id,
      listPriceMinor: planAmountMinor("film_industry_professional", "INR", "monthly") || 0,
      subjectType: "Plan",
      label: "Film Industry Professional (test checkout)",
      reason: "self-serve test checkout",
      source: "paymentController.activateFilmIndustryProfessionalTestCheckout",
      metadata: { planKey: "film_industry_professional", checkoutReference },
    });

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
    const currentUser = await User.findById(req.user._id).select("role preferredCurrency");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    if (!isFilmIndustryProfessionalRole(currentUser)) {
      return res.status(403).json({ message: "Only film industry professionals can purchase this plan." });
    }

    const razorpay = await getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay is not configured. Keys are missing." });
    }

    // Amount is server-authoritative from the price matrix; only the currency comes from the client.
    const currency = resolveCurrency(req.body?.currency, currentUser.preferredCurrency);
    const { cycle } = req.body;
    
    const prices = PLAN_PRICES.film_industry_professional;
    let inrAmount = prices.INR;
    let finalAmount = prices[currency];

    if (cycle === "annual") {
      inrAmount = Math.round((inrAmount / 100) * 12 * 0.85) * 100;
      finalAmount = Math.round((finalAmount / 100) * 12 * 0.85) * 100;
    }

    const { order, fellBackToINR } = await createOrderWithUsdFallback(razorpay, {
      amount: finalAmount,
      currency,
      inrAmount,
      receipt: `rcpt_${currentUser._id.toString().substring(18)}_${Date.now()}`,
      // The billing cycle is decided HERE, where the price is computed, and read back from the order
      // at verification. Previously `cycle` was taken from the verify request body, so a monthly
      // payment could be verified as annual and grant 365 days instead of 30.
      notes: planOrderNotes({
        userId: currentUser._id,
        planKey: "film_industry_professional",
        cycle,
      }),
    });
    if (!order) return res.status(500).json({ message: "Failed to create Razorpay order" });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      fellBackToINR,
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    return res.status(500).json({ message: error.message || error.description || "Failed to create order" });
  }
};

export const activateTestWriterSubscription = async (req, res) => {
  try {
    const { tier } = req.body;
    
    if (!tier || !["silver", "gold"].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier for test subscription." });
    }

    const currentUser = await User.findById(req.user._id).select("role subscription");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const model = tier === "gold" ? WRITER_GOLD_MODEL : WRITER_SILVER_MODEL;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + model.durationDays * 24 * 60 * 60 * 1000);

    const update = {
      $set: {
        "subscription.plan": model.plan,
        "subscription.aiImagesGeneratedTotal": 0,
        "subscription.expiresAt": expiresAt,
        "subscription.accessTier": model.accessTier,
        "subscription.accessStatus": "active",
        "subscription.accessActivatedAt": now,
        "subscription.accessExpiresAt": expiresAt,
        "subscription.checkoutMode": "test",
        "subscription.checkoutProvider": "mock",
        "subscription.checkoutReference": `mock_${Date.now()}`,
      },
    };

    await User.updateOne({ _id: currentUser._id }, update);

    await recordGrant({
      kind: "plan_subscription",
      user: currentUser._id,
      listPriceMinor: planAmountMinor(WRITER_PLAN_KEY[tier], "INR", "monthly") || 0,
      subjectType: "Plan",
      label: "Writer " + tier + " (test subscription)",
      reason: "self-serve test subscription",
      source: "paymentController.activateTestWriterSubscription",
      metadata: { planKey: WRITER_PLAN_KEY[tier], tier },
    });

    const refreshedUser = await User.findById(currentUser._id).select("-password");

    return res.status(200).json({ 
      success: true, 
      message: "Test Silver plan activated successfully!",
      user: refreshedUser
    });
  } catch (error) {
    console.error("Test Writer Payment Error:", error);
    return res.status(500).json({ message: error.message || "Test payment failed" });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    // `cycle` is deliberately NOT read from the body — see below.
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

    // The signature only proves SOME payment on this account succeeded. Read the order back to learn
    // which plan was bought, for how long, and for how much — and to prove it was this user's.
    const razorpayClient = await getRazorpayInstance();
    if (!razorpayClient) {
      return res.status(503).json({ message: "Razorpay is not configured. Keys are missing." });
    }
    const verified = await readVerifiedPlanOrder(razorpayClient, razorpay_order_id, currentUser._id);
    if (verified.error) return res.status(verified.status).json({ message: verified.error });

    const cycle = verified.cycle;
    const now = new Date();
    const durationDays = cycle === "annual" ? 365 : FILM_INDUSTRY_PRO_MODEL.durationDays;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const update = {
      $set: {
        "subscription.plan": FILM_INDUSTRY_PRO_MODEL.plan,
        "subscription.aiImagesGeneratedTotal": 0,
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
        "subscription.scheduledMeetings": [],
        "subscription.contactsLimit": 10,
        "subscription.messageWritersLimit": 10,
        "subscription.meetingsLimit": 10,
      },
    };

    await User.updateOne({ _id: currentUser._id }, update);

    // Written AFTER the entitlement lands and never allowed to fail the request: the money is
    // already captured, so an error here would tell a paying user their payment failed.
    await recordPayment({
      kind: "plan_subscription",
      user: currentUser._id,
      amountMinor: verified.paidMinor,
      currency: verified.currency,
      listPriceMinor: planAmountMinor("film_industry_professional", verified.currency, cycle) || 0,
      providerOrderId: razorpay_order_id,
      providerPaymentId: razorpay_payment_id,
      subjectType: "Plan",
      label: "Film Industry Professional (" + cycle + ")",
      source: "paymentController.verifyRazorpayPayment",
      metadata: { planKey: "film_industry_professional", cycle, durationDays },
    });

    // The buyer's copy. Non-fatal like the ledger row above and for the same reason — the charge has
    // already gone through, so a document that cannot be written is skipped, never surfaced as a
    // failed payment. The PDF itself renders on first download.
    const paidMajor = Number(verified.paidMinor || 0) / 100;
    await issueInvoice({
      kind: "plan_subscription",
      user: currentUser,
      paymentReference: razorpay_payment_id,
      currency: verified.currency,
      amountCharged: paidMajor,
      detailLines: [
        "Film Industry Professional",
        `Billing: ${cycle}`,
        `Access: ${durationDays} days`,
        `Payment Ref: ${razorpay_payment_id}`,
      ],
      rows: [
        {
          item: "Film Industry Professional",
          type: "Subscription",
          detail: `${cycle} plan, ${durationDays} days of full access.`,
          amountLabel: formatInvoiceMoney(paidMajor, verified.currency),
          amountValue: paidMajor,
        },
        totalRow(paidMajor, verified.currency),
        gatewayRow(razorpay_payment_id),
      ],
      source: "paymentController.verifyRazorpayPayment",
    });

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

    if (!hasAnyFipAccess(user)) {
      return res.status(403).json({
        message: "Film Industry Professional subscription or a verified company email is required to reveal writer contacts.",
        requiresUpgrade: true,
      });
    }

    const writer = await User.findById(writerId)
      .select("email phone writerProfile.links name username allowIndustryContact role")
      .lean();
    if (!writer) return res.status(404).json({ message: "Writer not found" });

    /*
     * DEF-29: this endpoint reveals a WRITER's contact details, and until now it would reveal
     * anyone's.
     *
     * The id comes from the URL, and nothing checked what kind of account it pointed at — so any
     * account with FIP access could POST an arbitrary user id and read that person's email and
     * phone: another producer, an admin, a reader. Every real caller passes a writer
     * (`script.creator._id`, a writer profile, a deal's writer), so narrowing this refuses only
     * the calls the product never makes.
     *
     * The opt-out check below was already writer-shaped and depended on the same role list, which
     * is what made the gap visible: a non-writer could not opt out of a disclosure the product
     * says is about writers.
     */
    if (!isWriterRole(writer.role)) {
      return res.status(404).json({ message: "Writer not found" });
    }

    if (writer.allowIndustryContact === false) {
      return res.status(403).json({
        message: "This writer has opted out of sharing contact details with industry professionals.",
        optedOut: true
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
    // DEF-30: an id that is not an ObjectId reached `new mongoose.Types.ObjectId(writerId)` below
    // and threw, so a malformed URL answered 500 — a server error for what is a bad request. Its
    // sibling `revealWriterContact` has always validated here.
    if (!writerId || !mongoose.Types.ObjectId.isValid(writerId)) {
      return res.status(400).json({ message: "Invalid writer ID" });
    }

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

export const createWriterRazorpayOrder = async (req, res) => {
  try {
    const { tier, cycle } = req.body;
    if (!tier || !["silver", "gold"].includes(tier)) {
      return res.status(400).json({ message: "Invalid tier for subscription." });
    }

    const currentUser = await User.findById(req.user._id).select("role preferredCurrency");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    if (!["writer", "creator"].includes(String(currentUser.role).toLowerCase())) {
      return res.status(403).json({ message: "Only writers and creators can purchase this plan." });
    }

    const razorpay = await getRazorpayInstance();
    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay is not configured. Keys are missing." });
    }

    const currency = resolveCurrency(req.body?.currency, currentUser.preferredCurrency);
    const prices = PLAN_PRICES[WRITER_PLAN_KEY[tier]];
    
    let baseAmount = prices[currency];
    let baseInrAmount = prices.INR;

    if (cycle === "annual") {
      baseAmount = Math.round((baseAmount / 100) * 12 * 0.85) * 100;
      baseInrAmount = Math.round((baseInrAmount / 100) * 12 * 0.85) * 100;
    }

    const { order, fellBackToINR } = await createOrderWithUsdFallback(razorpay, {
      amount: baseAmount,
      currency,
      inrAmount: baseInrAmount,
      receipt: `rcpt_${currentUser._id.toString().substring(18)}_${tier}_${Date.now()}`,
      // The tier and cycle are fixed HERE, alongside the price they determine, and read back at
      // verification. They used to come from the verify request body, so a paid Silver order could
      // be verified as `tier: "gold", cycle: "annual"` — ₹399 for ₹7,130 of access.
      notes: planOrderNotes({
        userId: currentUser._id,
        planKey: WRITER_PLAN_KEY[tier],
        tier,
        cycle,
      }),
    });
    if (!order) return res.status(500).json({ message: "Failed to create Razorpay order" });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      fellBackToINR,
    });
  } catch (error) {
    console.error("Writer Razorpay Create Order Error:", error);
    return res.status(500).json({ message: error.message || "Failed to create order" });
  }
};

export const verifyWriterRazorpayPayment = async (req, res) => {
  try {
    // `tier` and `cycle` are deliberately NOT read from the body — they come from the order.
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing required payment details" });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const currentUser = await User.findById(req.user._id).select("role subscription");
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // What was actually bought and paid for, straight from Razorpay.
    const razorpayClient = await getRazorpayInstance();
    if (!razorpayClient) {
      return res.status(503).json({ message: "Razorpay is not configured. Keys are missing." });
    }
    const verified = await readVerifiedPlanOrder(razorpayClient, razorpay_order_id, currentUser._id);
    if (verified.error) return res.status(verified.status).json({ message: verified.error });

    const { tier, cycle } = verified;
    if (!["silver", "gold"].includes(tier)) {
      return res.status(400).json({ message: "This order is not a writer plan." });
    }

    const model = tier === "gold" ? WRITER_GOLD_MODEL : WRITER_SILVER_MODEL;
    const now = new Date();
    const durationDays = cycle === "annual" ? 365 : model.durationDays;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const update = {
      $set: {
        "subscription.plan": model.plan,
        "subscription.aiImagesGeneratedTotal": 0,
        "subscription.expiresAt": expiresAt,
        "subscription.accessTier": model.accessTier,
        "subscription.accessStatus": "active",
        "subscription.accessActivatedAt": now,
        "subscription.accessExpiresAt": expiresAt,
        "subscription.checkoutMode": "live",
        "subscription.checkoutProvider": "razorpay",
        "subscription.checkoutReference": razorpay_order_id,
        "subscription.paymentId": razorpay_payment_id,   // now a real schema path — see User.js
      },
    };

    await User.updateOne({ _id: currentUser._id }, update);

    await recordPayment({
      kind: "plan_subscription",
      user: currentUser._id,
      amountMinor: verified.paidMinor,
      currency: verified.currency,
      listPriceMinor: planAmountMinor(WRITER_PLAN_KEY[tier], verified.currency, cycle) || 0,
      providerOrderId: razorpay_order_id,
      providerPaymentId: razorpay_payment_id,
      subjectType: "Plan",
      label: "Writer " + tier + " (" + cycle + ")",
      source: "paymentController.verifyWriterRazorpayPayment",
      metadata: { planKey: WRITER_PLAN_KEY[tier], tier, cycle, durationDays },
    });

    const writerPaidMajor = Number(verified.paidMinor || 0) / 100;
    const tierLabel = `Writer ${String(tier).charAt(0).toUpperCase()}${String(tier).slice(1)}`;
    await issueInvoice({
      kind: "plan_subscription",
      user: currentUser,
      paymentReference: razorpay_payment_id,
      currency: verified.currency,
      amountCharged: writerPaidMajor,
      detailLines: [
        tierLabel,
        `Billing: ${cycle}`,
        `Access: ${durationDays} days`,
        `Payment Ref: ${razorpay_payment_id}`,
      ],
      rows: [
        {
          item: tierLabel,
          type: "Subscription",
          detail: `${cycle} plan, ${durationDays} days of writer tools.`,
          amountLabel: formatInvoiceMoney(writerPaidMajor, verified.currency),
          amountValue: writerPaidMajor,
        },
        totalRow(writerPaidMajor, verified.currency),
        gatewayRow(razorpay_payment_id),
      ],
      source: "paymentController.verifyWriterRazorpayPayment",
    });

    const refreshedUser = await User.findById(currentUser._id).select("-password");

    return res.status(200).json({
      success: true,
      message: `${model.plan.charAt(0).toUpperCase() + model.plan.slice(1)} Model activated successfully!`,
      user: refreshedUser
    });
  } catch (error) {
    console.error("Writer Razorpay Verification Error:", error);
    return res.status(500).json({ message: error.message || "Payment verification failed" });
  }
};
