import User from "../models/User.js";
import CreditPackage from "../models/CreditPackage.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import DiscountCode from "../models/DiscountCode.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendAdminCreditsGrantedEmail } from "../utils/emailService.js";

// Lazy initialization of Razorpay
let razorpayInstance = null;

const CUSTOM_CREDIT_PRICE = 9;

const STANDARD_CREDIT_PLANS = [
  {
    code: "plan_50",
    name: "50 Credits",
    credits: 50,
    price: 400,
    currency: "INR",
    popular: false,
    description: "Starter pack for quick usage",
    features: ["50 credits", "Instant top-up"],
    bonusCredits: 0,
  },
  {
    code: "plan_100",
    name: "100 Credits",
    credits: 100,
    price: 749,
    currency: "INR",
    popular: true,
    description: "Best value for regular creators",
    features: ["100 credits", "Instant top-up"],
    bonusCredits: 0,
  },
  {
    code: "plan_400",
    name: "400 Credits",
    credits: 400,
    price: 2999,
    currency: "INR",
    popular: false,
    description: "Maximum savings for power users",
    features: ["400 credits", "Instant top-up"],
    bonusCredits: 0,
  },
];

const getStandardPlanByCode = (planCode) =>
  STANDARD_CREDIT_PLANS.find((plan) => plan.code === planCode);

const isValidCustomCredits = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 10000;

const getBankPurchaseEligibility = (user) => {
  const reviewStatus = user?.bankDetailsReview?.status || "not_submitted";
  return { allowed: true, reviewStatus, message: "" };
};

const buildPurchaseDetails = async ({ packageId, customCredits }) => {
  const parsedCustomCredits =
    customCredits === undefined ? undefined : Number(customCredits);

  if (parsedCustomCredits !== undefined) {
    if (!isValidCustomCredits(parsedCustomCredits)) {
      return { error: "Custom credits must be an integer between 1 and 10000" };
    }

    return {
      planCode: "custom",
      name: `Custom ${parsedCustomCredits} Credits`,
      credits: parsedCustomCredits,
      bonusCredits: 0,
      totalCredits: parsedCustomCredits,
      price: parsedCustomCredits * CUSTOM_CREDIT_PRICE,
      currency: "INR",
      isCustom: true,
      packageRef: null,
    };
  }

  const standardPlan = getStandardPlanByCode(packageId);
  if (standardPlan) {
    return {
      planCode: standardPlan.code,
      name: standardPlan.name,
      credits: standardPlan.credits,
      bonusCredits: standardPlan.bonusCredits || 0,
      totalCredits: standardPlan.credits + (standardPlan.bonusCredits || 0),
      price: standardPlan.price,
      currency: standardPlan.currency || "INR",
      isCustom: false,
      packageRef: null,
    };
  }

  const creditPackage = await CreditPackage.findById(packageId);
  if (!creditPackage) {
    return { error: "Credit package not found" };
  }

  return {
    planCode: creditPackage._id.toString(),
    name: creditPackage.name,
    credits: creditPackage.credits,
    bonusCredits: creditPackage.bonusCredits || 0,
    totalCredits: creditPackage.credits + (creditPackage.bonusCredits || 0),
    price: creditPackage.price,
    currency: creditPackage.currency || "INR",
    isCustom: false,
    packageRef: creditPackage._id,
  };
};

const parseOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toPaise = (amount) => Math.round(Number(amount || 0) * 100);

const removeUndefinedValues = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const ensureCreditsLedger = (user) => {
  if (!user.credits || typeof user.credits !== "object") {
    user.credits = {
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      transactions: [],
    };
    return;
  }

  if (!Array.isArray(user.credits.transactions)) {
    user.credits.transactions = [];
  }

  if (!Number.isFinite(Number(user.credits.balance))) user.credits.balance = 0;
  if (!Number.isFinite(Number(user.credits.totalPurchased))) user.credits.totalPurchased = 0;
  if (!Number.isFinite(Number(user.credits.totalSpent))) user.credits.totalSpent = 0;
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

const createCreditPurchaseNotifications = async ({ user, purchase, totalCredits, paymentMethod }) => {
  const currency = (purchase.currency || "INR").toUpperCase();
  const amountLabel = `${currency} ${Number(purchase.price || 0).toLocaleString("en-IN")}`;

  const buyerNotification = {
    user: user._id,
    type: "purchase",
    message: `Credits added: ${totalCredits} credits purchased successfully (${purchase.name}) for ${amountLabel}.`,
  };

  const adminUsers = await User.find({ role: "admin" }).select("_id").lean();
  const adminNotifications = adminUsers.map((admin) => ({
    user: admin._id,
    type: "admin_alert",
    from: user._id,
    message: `${user.name || "A writer"} purchased ${totalCredits} credits via ${paymentMethod}.`,
  }));

  const payload = [buyerNotification, ...adminNotifications];
  if (payload.length > 0) {
    await Notification.insertMany(payload);
  }
};

// Credit pricing for different services
export const CREDIT_PRICES = {
  AI_EVALUATION: 50,        // 50 credits for AI script evaluation
  AI_TRAILER: 120,          // 120 credits for AI trailer generation
  SCRIPT_ANALYSIS: 5,       // 5 credits for basic analysis
  PREMIUM_REPORT: 20,       // 20 credits for premium report
  CONSULTATION: 50,         // 50 credits for consultation booking
  AI_GRAMMAR: 5,            // 5 credits for AI grammar fix
  AI_PROSE: 20,             // 20 credits for AI prose sample generation
};

// @desc    Get all credit packages
// @route   GET /api/credits/packages
// @access  Public
export const getCreditPackages = async (req, res) => {
  try {
    const packages = STANDARD_CREDIT_PLANS.map((plan) => ({
      _id: plan.code,
      name: plan.name,
      credits: plan.credits,
      price: plan.price,
      currency: plan.currency,
      discount: 0,
      popular: plan.popular,
      active: true,
      description: plan.description,
      features: plan.features,
      bonusCredits: plan.bonusCredits || 0,
    }));

    res.json({
      packages,
      customPricing: {
        pricePerCredit: CUSTOM_CREDIT_PRICE,
        minCredits: 1,
        maxCredits: 10000,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user credit balance
// @route   GET /api/credits/balance
// @access  Private
export const getCreditBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("credits role bankDetails bankDetailsReview");
    const bankEligibility = getBankPurchaseEligibility(user);
    res.json({
      balance: user.credits?.balance || 0,
      totalPurchased: user.credits?.totalPurchased || 0,
      totalSpent: user.credits?.totalSpent || 0,
      lastPurchase: user.credits?.lastPurchase,
      canPurchaseCredits: bankEligibility.allowed,
      bankReviewStatus: bankEligibility.reviewStatus,
      bankPurchaseMessage: bankEligibility.message,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get credit transaction history
// @route   GET /api/credits/history
// @access  Private
export const getCreditHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id).select("credits");
    
    const transactions = user.credits?.transactions || [];
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);
    
    res.json({
      transactions: paginatedTransactions,
      total: transactions.length,
      page: parseInt(page),
      totalPages: Math.ceil(transactions.length / limit)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Purchase credits
// @route   POST /api/credits/purchase
// @access  Private
export const purchaseCredits = async (req, res) => {
  try {
    const { packageId, customCredits, paymentMethod = "stripe" } = req.body;

    const purchase = await buildPurchaseDetails({ packageId, customCredits });
    if (purchase.error) {
      return res.status(400).json({ message: purchase.error });
    }
    
    const user = await User.findById(req.user._id);
    const bankEligibility = getBankPurchaseEligibility(user);
    if (!bankEligibility.allowed) {
      return res.status(403).json({ message: bankEligibility.message, bankReviewStatus: bankEligibility.reviewStatus });
    }
    
    // In a real app, this is where you'd process Stripe payment
    // For now, we'll simulate successful payment
    
    const totalCredits = purchase.totalCredits;
    const reference = `CREDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Update user credits
    if (!user.credits) {
      user.credits = {
        balance: 0,
        totalPurchased: 0,
        totalSpent: 0,
        transactions: []
      };
    }
    
    user.credits.balance += totalCredits;
    user.credits.totalPurchased += totalCredits;
    user.credits.lastPurchase = new Date();
    user.credits.transactions.push({
      type: "purchase",
      amount: totalCredits,
      description: `Purchased ${purchase.name}`,
      reference,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "payment",
      amount: -purchase.price,
      currency: purchase.currency,
      status: "completed",
      description: `Credit purchase: ${purchase.name} (${totalCredits} credits)`,
      reference,
      paymentMethod,
      metadata: {
        packageId: purchase.packageRef,
        planCode: purchase.planCode,
        isCustom: purchase.isCustom,
        credits: totalCredits,
        customCredits: purchase.isCustom ? purchase.credits : undefined,
      }
    });

    try {
      await createCreditPurchaseNotifications({
        user,
        purchase,
        totalCredits,
        paymentMethod,
      });
    } catch (notificationError) {
      console.error("Credit purchase notification error:", notificationError.message);
    }
    
    res.json({
      message: "Credits purchased successfully",
      credits: {
        balance: user.credits.balance,
        purchased: totalCredits,
        package: purchase.name
      },
      reference
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Use credits for a service
// @route   POST /api/credits/use
// @access  Private
export const useCredits = async (req, res) => {
  try {
    const { service, amount, description } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user.credits || user.credits.balance < amount) {
      return res.status(400).json({ 
        message: "Insufficient credits",
        balance: user.credits?.balance || 0,
        required: amount
      });
    }
    
    // Deduct credits
    user.credits.balance -= amount;
    user.credits.totalSpent += amount;
    user.credits.transactions.push({
      type: "spent",
      amount: -amount,
      description: description || `Used credits for ${service}`,
      reference: `USE-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date()
    });
    
    await user.save();
    
    res.json({
      message: "Credits used successfully",
      credits: {
        balance: user.credits.balance,
        spent: amount,
        service
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Check if user has enough credits
// @route   GET /api/credits/check/:amount
// @access  Private
export const checkCredits = async (req, res) => {
  try {
    const amount = parseInt(req.params.amount);
    const user = await User.findById(req.user._id).select("credits");
    
    const balance = user.credits?.balance || 0;
    const hasEnough = balance >= amount;
    
    res.json({
      hasEnough,
      balance,
      required: amount,
      shortfall: hasEnough ? 0 : amount - balance
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get service pricing
// @route   GET /api/credits/pricing
// @access  Public
export const getServicePricing = async (req, res) => {
  try {
    res.json({
      services: {
        aiEvaluation: {
          name: "AI Script Evaluation",
          credits: CREDIT_PRICES.AI_EVALUATION,
          description: "Comprehensive AI-powered script analysis with detailed feedback"
        },
        aiTrailer: {
          name: "AI Trailer Generation",
          credits: CREDIT_PRICES.AI_TRAILER,
          description: "Generate professional trailer script using AI"
        },
        scriptAnalysis: {
          name: "Basic Script Analysis",
          credits: CREDIT_PRICES.SCRIPT_ANALYSIS,
          description: "Quick script overview and genre classification"
        },
        premiumReport: {
          name: "Premium Report",
          credits: CREDIT_PRICES.PREMIUM_REPORT,
          description: "In-depth analysis with market insights and recommendations"
        },
        consultation: {
          name: "Expert Consultation",
          credits: CREDIT_PRICES.CONSULTATION,
          description: "One-on-one consultation with industry professional"
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Grant bonus credits (admin only)
// @route   POST /api/credits/bonus
// @access  Private/Admin
export const grantBonusCredits = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!String(user.email || "").trim()) {
      return res.status(400).json({ message: "User email is missing. Cannot send credit notification email." });
    }

    if (user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Credits cannot be granted to admin accounts" });
    }

    if (user.isDeactivated) {
      return res
        .status(400)
        .json({ message: "Cannot grant credits to a deleted account" });
    }
    
    if (!user.credits) {
      user.credits = {
        balance: 0,
        totalPurchased: 0,
        totalSpent: 0,
        transactions: []
      };
    }

    const currentBalance = Number(user.credits.balance || 0);
    user.credits.balance = currentBalance + parsedAmount;
    user.credits.transactions.push({
      type: "bonus",
      amount: parsedAmount,
      description: typeof reason === "string" && reason.trim() ? reason.trim() : "Bonus credits",
      reference: `BONUS-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date()
    });
    
    await user.save();

    await Notification.create({
      user: user._id,
      type: "admin_alert",
      from: req.user?._id,
      message: `Admin added ${parsedAmount} credits to your account.`,
    }).catch(() => null);

    let emailResult = await sendAdminCreditsGrantedEmail(user.email, user.name, {
      amount: parsedAmount,
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : "Bonus credits",
      balanceAfter: user.credits.balance,
      adminName: req.user?.name || "Admin",
      clientBaseUrl: String(req.get("origin") || "").trim(),
    });

    if (!emailResult?.success) {
      emailResult = await sendAdminCreditsGrantedEmail(user.email, user.name, {
        amount: parsedAmount,
        reason: typeof reason === "string" && reason.trim() ? reason.trim() : "Bonus credits",
        balanceAfter: user.credits.balance,
        adminName: req.user?.name || "Admin",
        clientBaseUrl: String(req.get("origin") || "").trim(),
      });
    }
    
    res.json({
      message: emailResult?.success
        ? "Bonus credits granted successfully and email notification sent"
        : "Bonus credits granted successfully, but email notification could not be sent",
      balance: user.credits.balance,
      granted: parsedAmount,
      emailSent: Boolean(emailResult?.success),
      emailError: emailResult?.success ? undefined : (emailResult?.error || "Email send failed"),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper: validate a discount code for a given user + purchase price
const validateDiscountForPurchase = async (code, userId, purchasePrice) => {
  const discountCode = await DiscountCode.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!discountCode) return { error: "Invalid discount code" };

  const now = new Date();
  if (discountCode.validFrom && now < discountCode.validFrom) return { error: "This discount code is not yet active" };
  if (discountCode.validUntil && now > discountCode.validUntil) return { error: "This discount code has expired" };
  if (discountCode.maxUses > 0 && discountCode.usedCount >= discountCode.maxUses) return { error: "This discount code has reached its maximum usage limit" };
  if (discountCode.minPurchaseAmount > 0 && purchasePrice < discountCode.minPurchaseAmount) {
    return { error: `Minimum purchase amount is \u20B9${discountCode.minPurchaseAmount}` };
  }

  // Per-user limit check
  if (discountCode.maxUsesPerUser > 0 && userId) {
    const userUseCount = discountCode.usedBy.filter((u) => u.user.toString() === userId.toString()).length;
    if (userUseCount >= discountCode.maxUsesPerUser) return { error: "You have already used this discount code" };
  }

  // Calculate discount
  let discountAmount = 0;
  if (discountCode.discountType === "percentage") {
    discountAmount = Math.round((purchasePrice * discountCode.discountValue) / 100);
    if (discountCode.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, discountCode.maxDiscountAmount);
    }
  } else {
    discountAmount = Math.min(discountCode.discountValue, purchasePrice);
  }

  const finalPrice = Math.max(purchasePrice - discountAmount, 0);

  return {
    discountCode,
    discountAmount,
    finalPrice,
    discountType: discountCode.discountType,
    discountValue: discountCode.discountValue,
    codeId: discountCode._id,
  };
};

// @desc    Validate a discount code (writer-facing)
// @route   POST /api/credits/validate-discount
// @access  Private
export const validateDiscount = async (req, res) => {
  try {
    const { code, packageId, customCredits } = req.body;
    if (!code) return res.status(400).json({ message: "Discount code is required" });

    const purchase = await buildPurchaseDetails({ packageId, customCredits });
    if (purchase.error) return res.status(400).json({ message: purchase.error });

    const result = await validateDiscountForPurchase(code, req.user._id, purchase.price);
    if (result.error) return res.status(400).json({ message: result.error });

    res.json({
      valid: true,
      code: result.discountCode.code,
      discountType: result.discountType,
      discountValue: result.discountValue,
      discountAmount: result.discountAmount,
      originalPrice: purchase.price,
      finalPrice: result.finalPrice,
      description: result.discountCode.description,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// @desc    Create Razorpay order for credit purchase
// @route   POST /api/credits/create-order
// @access  Private
export const createRazorpayOrder = async (req, res) => {
  try {
    const { packageId, customCredits, discountCode: discountCodeStr } = req.body;
    const user = await User.findById(req.user._id).select("role bankDetails bankDetailsReview");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bankEligibility = getBankPurchaseEligibility(user);
    if (!bankEligibility.allowed) {
      return res.status(403).json({ message: bankEligibility.message, bankReviewStatus: bankEligibility.reviewStatus });
    }

    const purchase = await buildPurchaseDetails({ packageId, customCredits });
    if (purchase.error) {
      return res.status(400).json({ message: purchase.error });
    }

    // Apply discount if code provided
    let discountInfo = null;
    let finalPrice = purchase.price;
    if (discountCodeStr) {
      const discountResult = await validateDiscountForPurchase(discountCodeStr, req.user._id, purchase.price);
      if (discountResult.error) {
        return res.status(400).json({ message: discountResult.error });
      }
      discountInfo = discountResult;
      finalPrice = discountResult.finalPrice;
    }

    if (finalPrice <= 0) {
      if (discountInfo && discountCodeStr) {
        const discountDoc = await DiscountCode.findOne({ code: discountCodeStr.toUpperCase() });
        if (discountDoc) {
          if (!Array.isArray(discountDoc.usedBy)) {
            discountDoc.usedBy = [];
          }
          if (!Number.isFinite(Number(discountDoc.usedCount))) {
            discountDoc.usedCount = 0;
          }
          discountDoc.usedCount += 1;
          discountDoc.usedBy.push({ user: req.user._id, usedAt: new Date() });
          await discountDoc.save();
        }
      }

      const totalCredits = purchase.totalCredits;

      ensureCreditsLedger(user);

      const reference = `DIRECT-${Date.now().toString(36).toUpperCase()}`;

      user.credits.balance += totalCredits;
      user.credits.totalPurchased += totalCredits;
      user.credits.lastPurchase = new Date();
      user.credits.transactions.push({
        type: "purchase",
        amount: totalCredits,
        description: `Purchased ${purchase.name} directly (Price 0)${discountInfo ? ` (Code: ${discountInfo.discountCode.code})` : ""}`,
        reference,
        createdAt: new Date()
      });

      await user.save();

      await Transaction.create({
        user: user._id,
        type: "payment",
        amount: 0,
        currency: purchase.currency || "INR",
        status: "completed",
        description: `Credit purchase: ${purchase.name} (${totalCredits} credits)${discountInfo ? ` — Discount ${discountInfo.discountCode.code}` : ""}`,
        reference,
        paymentMethod: "manual",
        metadata: {
          packageId: purchase.packageRef,
          planCode: purchase.planCode,
          isCustom: purchase.isCustom,
          credits: totalCredits,
          customCredits: purchase.isCustom ? purchase.credits : undefined,
          discountCode: discountCodeStr || undefined,
          discountAmount: discountInfo ? discountInfo.discountAmount : undefined,
          originalPrice: discountInfo ? purchase.price : undefined,
        }
      });

      try {
        await createCreditPurchaseNotifications({
          user,
          purchase,
          totalCredits,
          paymentMethod: "direct discount",
        });
      } catch (notificationError) {
        console.error("Direct credit notification error:", notificationError.message);
      }

      return res.json({
        success: true,
        directPurchase: true,
        message: "Credits added directly as price is zero",
        credits: {
          balance: user.credits.balance,
          purchased: totalCredits,
          package: purchase.name,
        },
        discount: discountInfo ? {
          code: discountInfo.discountCode.code,
          discountAmount: discountInfo.discountAmount,
          originalPrice: purchase.price,
          finalPrice: 0,
        } : null,
      });
    }

    // Razorpay requires at least 1 rupee (100 paise)
    if (finalPrice < 1) finalPrice = 1;

    // Razorpay is only needed for paid orders.
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Payment service is not configured on server",
        error: "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in server environment"
      });
    }
    
    // Create Razorpay order
    const notes = removeUndefinedValues({
      userId: req.user._id.toString(),
      packageId: packageId || "custom",
      planCode: purchase.planCode,
      packageName: purchase.name,
      credits: String(purchase.totalCredits),
      customCredits: purchase.isCustom ? String(purchase.credits) : undefined,
      discountCode: discountCodeStr || undefined,
      discountAmount: discountInfo ? String(discountInfo.discountAmount) : undefined,
      originalPrice: discountInfo ? String(purchase.price) : undefined,
      finalPrice: String(finalPrice),
    });

    const options = {
      amount: Math.round(finalPrice * 100), // Amount in paise (INR)
      currency: purchase.currency || "INR",
      receipt: `receipt_${Date.now()}`,
      notes,
    };
    
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      packageDetails: {
        name: purchase.name,
        credits: purchase.credits,
        bonusCredits: purchase.bonusCredits,
        totalCredits: purchase.totalCredits,
        price: purchase.price,
        isCustom: purchase.isCustom,
        pricePerCredit: purchase.isCustom ? CUSTOM_CREDIT_PRICE : Number((purchase.price / purchase.totalCredits).toFixed(2)),
      },
      discount: discountInfo ? {
        code: discountInfo.discountCode.code,
        discountAmount: discountInfo.discountAmount,
        originalPrice: purchase.price,
        finalPrice: finalPrice,
      } : null,
    });
  } catch (error) {
    const statusCode = Number(
      error?.statusCode ||
      error?.status ||
      error?.error?.statusCode ||
      error?.error?.status_code ||
      0
    );
    const isGatewayError = statusCode >= 400 && statusCode < 600;
    return res.status(isGatewayError ? 502 : 500).json({
      message: isGatewayError ? "Payment provider rejected order request" : "Failed to create payment order",
      error: error?.error?.description || error.message,
    });
  }
};

// @desc    Verify Razorpay payment and credit user account
// @route   POST /api/credits/verify-payment
// @access  Private
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Missing Razorpay verification parameters",
        success: false,
      });
    }
    
    // Check if Razorpay key secret is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Payment service is not configured on server",
        error: "Missing RAZORPAY_KEY_SECRET in server environment",
        success: false 
      });
    }
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (!isAuthentic) {
      return res.status(400).json({ 
        message: "Payment verification failed - Invalid signature",
        success: false 
      });
    }

    const razorpay = getRazorpay();
    const [order, payment] = await Promise.all([
      razorpay.orders.fetch(razorpay_order_id),
      razorpay.payments.fetch(razorpay_payment_id),
    ]);

    if (!order || !payment) {
      return res.status(400).json({
        message: "Unable to fetch payment details from Razorpay",
        success: false,
      });
    }

    if (payment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        message: "Payment verification failed - Order mismatch",
        success: false,
      });
    }

    if (String(payment.status || "").toLowerCase() !== "captured") {
      return res.status(400).json({
        message: "Payment not captured yet",
        success: false,
      });
    }

    const orderNotes = order.notes || {};
    const orderUserId = String(orderNotes.userId || "").trim();
    if (!orderUserId || orderUserId !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Payment does not belong to authenticated user",
        success: false,
      });
    }

    const notesPackageId = String(orderNotes.packageId || "").trim();
    if (!notesPackageId) {
      return res.status(400).json({
        message: "Order metadata is missing package information",
        success: false,
      });
    }

    const notesCustomCredits = parseOptionalNumber(orderNotes.customCredits);
    if (notesPackageId === "custom" && !Number.isInteger(notesCustomCredits)) {
      return res.status(400).json({
        message: "Order metadata is invalid for custom credits",
        success: false,
      });
    }

    const purchase = await buildPurchaseDetails({
      packageId: notesPackageId === "custom" ? undefined : notesPackageId,
      customCredits: notesPackageId === "custom" ? notesCustomCredits : undefined,
    });
    if (purchase.error) {
      return res.status(400).json({
        message: "Unable to validate purchased plan",
        success: false,
      });
    }

    const notesPlanCode = String(orderNotes.planCode || "").trim();
    if (notesPlanCode && notesPlanCode !== purchase.planCode) {
      return res.status(400).json({
        message: "Order metadata plan does not match backend plan",
        success: false,
      });
    }

    const notesCredits = parseOptionalNumber(orderNotes.credits);
    if (notesCredits !== undefined && notesCredits !== purchase.totalCredits) {
      return res.status(400).json({
        message: "Order metadata credits do not match backend plan",
        success: false,
      });
    }

    const expectedCurrency = (purchase.currency || "INR").toUpperCase();
    if (
      String(order.currency || "").toUpperCase() !== expectedCurrency ||
      String(payment.currency || "").toUpperCase() !== expectedCurrency
    ) {
      return res.status(400).json({
        message: "Currency mismatch in payment verification",
        success: false,
      });
    }

    const notesOriginalPrice = parseOptionalNumber(orderNotes.originalPrice);
    if (notesOriginalPrice !== undefined && toPaise(notesOriginalPrice) !== toPaise(purchase.price)) {
      return res.status(400).json({
        message: "Order metadata price does not match backend plan",
        success: false,
      });
    }

    const notesDiscountAmount = parseOptionalNumber(orderNotes.discountAmount) || 0;
    if (notesDiscountAmount < 0) {
      return res.status(400).json({
        message: "Invalid discount metadata in order",
        success: false,
      });
    }

    const discountAmount = Math.min(notesDiscountAmount, purchase.price);
    const discountCodeFromOrder = String(orderNotes.discountCode || "").trim();
    if (discountAmount > 0 && !discountCodeFromOrder) {
      return res.status(400).json({
        message: "Discount metadata missing code",
        success: false,
      });
    }

    let expectedFinalPrice = Math.max(purchase.price - discountAmount, 0);
    if (expectedFinalPrice < 1) expectedFinalPrice = 1;
    const expectedAmountPaise = toPaise(expectedFinalPrice);

    const orderAmountPaise = Number(order.amount || 0);
    const paymentAmountPaise = Number(payment.amount || 0);
    const orderAmountPaidPaise = Number(order.amount_paid || 0);
    if (
      orderAmountPaise !== expectedAmountPaise ||
      paymentAmountPaise !== expectedAmountPaise ||
      orderAmountPaidPaise < expectedAmountPaise
    ) {
      return res.status(400).json({
        message: "Paid amount does not match expected backend amount",
        success: false,
      });
    }

    const reference = `RAZORPAY-${razorpay_payment_id}`;
    const existingTransaction = await Transaction.findOne({ reference }).select("user");
    if (existingTransaction) {
      if (existingTransaction.user?.toString() !== req.user._id.toString()) {
        return res.status(409).json({
          message: "Payment reference already linked to another account",
          success: false,
        });
      }

      const existingUser = await User.findById(req.user._id).select("credits");
      return res.json({
        success: true,
        alreadyProcessed: true,
        message: "Payment already verified and credits were previously added",
        credits: {
          balance: existingUser?.credits?.balance || 0,
          purchased: 0,
          package: purchase.name,
        },
        discount: discountCodeFromOrder
          ? {
              code: discountCodeFromOrder,
              discountAmount,
              originalPrice: purchase.price,
              finalPrice: expectedFinalPrice,
            }
          : null,
        reference,
      });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        message: "User not found",
        success: false 
      });
    }
    const bankEligibility = getBankPurchaseEligibility(user);
    if (!bankEligibility.allowed) {
      return res.status(403).json({
        message: bankEligibility.message,
        bankReviewStatus: bankEligibility.reviewStatus,
        success: false,
      });
    }

    // Record discount usage from order metadata (server-side order notes)
    let discountInfo = null;
    if (discountCodeFromOrder) {
      discountInfo = {
        discountCode: { code: discountCodeFromOrder },
        discountAmount,
        finalPrice: expectedFinalPrice,
      };

      const discountDoc = await DiscountCode.findOne({ code: discountCodeFromOrder.toUpperCase() });
      if (discountDoc) {
        discountDoc.usedCount += 1;
        discountDoc.usedBy.push({ user: req.user._id, usedAt: new Date() });
        await discountDoc.save();
      }
    }
    
    const totalCredits = purchase.totalCredits;
    
    // Initialize credits if not exists
    if (!user.credits) {
      user.credits = {
        balance: 0,
        totalPurchased: 0,
        totalSpent: 0,
        transactions: []
      };
    }
    
    // Update user credits (full credits, regardless of discount)
    user.credits.balance += totalCredits;
    user.credits.totalPurchased += totalCredits;
    user.credits.lastPurchase = new Date();
    user.credits.transactions.push({
      type: "purchase",
      amount: totalCredits,
      description: `Purchased ${purchase.name} via Razorpay${discountInfo ? ` (Code: ${discountInfo.discountCode.code})` : ""}`,
      reference,
      createdAt: new Date()
    });
    
    await user.save();

    const actualPaid = expectedAmountPaise / 100;
    
    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "payment",
      amount: -actualPaid,
      currency: purchase.currency || "INR",
      status: "completed",
      description: `Credit purchase: ${purchase.name} (${totalCredits} credits)${discountInfo ? ` — Discount ${discountInfo.discountCode.code}` : ""}`,
      reference,
      paymentMethod: "razorpay",
      metadata: {
        packageId: purchase.packageRef,
        planCode: purchase.planCode,
        isCustom: purchase.isCustom,
        credits: totalCredits,
        customCredits: purchase.isCustom ? purchase.credits : undefined,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_order_amount_paise: orderAmountPaise,
        razorpay_payment_amount_paise: paymentAmountPaise,
        razorpay_payment_status: payment.status,
        discountCode: discountInfo?.discountCode?.code || undefined,
        discountAmount: discountInfo?.discountAmount || undefined,
        originalPrice: discountInfo ? purchase.price : undefined,
      }
    });

    try {
      await createCreditPurchaseNotifications({
        user,
        purchase,
        totalCredits,
        paymentMethod: "razorpay",
      });
    } catch (notificationError) {
      console.error("Razorpay credit notification error:", notificationError.message);
    }
    
    res.json({
      success: true,
      message: "Payment verified and credits added successfully",
      credits: {
        balance: user.credits.balance,
        purchased: totalCredits,
        package: purchase.name
      },
      discount: discountInfo ? {
        code: discountInfo.discountCode.code,
        discountAmount: discountInfo.discountAmount,
        originalPrice: purchase.price,
        finalPrice: discountInfo.finalPrice,
      } : null,
      reference
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Payment verification failed", 
      error: error.message,
      success: false 
    });
  }
};
