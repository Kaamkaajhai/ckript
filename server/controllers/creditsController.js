import User from "../models/User.js";
import CreditPackage from "../models/CreditPackage.js";
import Transaction from "../models/Transaction.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// Lazy initialization of Razorpay
let razorpayInstance = null;

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

// Credit pricing for different services
export const CREDIT_PRICES = {
  AI_EVALUATION: 10,        // 10 credits for AI script evaluation
  AI_TRAILER: 15,           // 15 credits for AI trailer generation
  SCRIPT_ANALYSIS: 5,       // 5 credits for basic analysis
  PREMIUM_REPORT: 20,       // 20 credits for premium report
  CONSULTATION: 50          // 50 credits for consultation booking
};

// @desc    Get all credit packages
// @route   GET /api/credits/packages
// @access  Public
export const getCreditPackages = async (req, res) => {
  try {
    const packages = await CreditPackage.find({ active: true }).sort({ price: 1 });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user credit balance
// @route   GET /api/credits/balance
// @access  Private
export const getCreditBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("credits");
    res.json({
      balance: user.credits?.balance || 0,
      totalPurchased: user.credits?.totalPurchased || 0,
      totalSpent: user.credits?.totalSpent || 0,
      lastPurchase: user.credits?.lastPurchase
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
    const { packageId, paymentMethod = "stripe" } = req.body;
    
    const creditPackage = await CreditPackage.findById(packageId);
    if (!creditPackage) {
      return res.status(404).json({ message: "Credit package not found" });
    }
    
    const user = await User.findById(req.user._id);
    
    // In a real app, this is where you'd process Stripe payment
    // For now, we'll simulate successful payment
    
    const totalCredits = creditPackage.credits + (creditPackage.bonusCredits || 0);
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
      description: `Purchased ${creditPackage.name}`,
      reference,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "payment",
      amount: -creditPackage.price,
      currency: creditPackage.currency,
      status: "completed",
      description: `Credit purchase: ${creditPackage.name} (${totalCredits} credits)`,
      reference,
      paymentMethod,
      metadata: {
        packageId: creditPackage._id,
        credits: totalCredits
      }
    });
    
    res.json({
      message: "Credits purchased successfully",
      credits: {
        balance: user.credits.balance,
        purchased: totalCredits,
        package: creditPackage.name
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
    
    // TODO: Add admin check here
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.credits) {
      user.credits = {
        balance: 0,
        totalPurchased: 0,
        totalSpent: 0,
        transactions: []
      };
    }
    
    user.credits.balance += amount;
    user.credits.transactions.push({
      type: "bonus",
      amount,
      description: reason || "Bonus credits",
      reference: `BONUS-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date()
    });
    
    await user.save();
    
    res.json({
      message: "Bonus credits granted successfully",
      balance: user.credits.balance,
      granted: amount
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
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Payment service is not configured on server",
        error: "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in server environment"
      });
    }
    
    const { packageId } = req.body;
    
    const creditPackage = await CreditPackage.findById(packageId);
    if (!creditPackage) {
      return res.status(404).json({ message: "Credit package not found" });
    }
    
    // Create Razorpay order
    const options = {
      amount: Math.round(creditPackage.price * 100), // Amount in paise (INR)
      currency: creditPackage.currency || "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        packageId: packageId,
        packageName: creditPackage.name,
        credits: creditPackage.credits + (creditPackage.bonusCredits || 0)
      }
    };
    
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      packageDetails: {
        name: creditPackage.name,
        credits: creditPackage.credits,
        bonusCredits: creditPackage.bonusCredits || 0,
        totalCredits: creditPackage.credits + (creditPackage.bonusCredits || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
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
      packageId 
    } = req.body;
    
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
    
    // Payment verified successfully, credit the user
    const creditPackage = await CreditPackage.findById(packageId);
    if (!creditPackage) {
      return res.status(404).json({ 
        message: "Credit package not found",
        success: false 
      });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        message: "User not found",
        success: false 
      });
    }
    
    const totalCredits = creditPackage.credits + (creditPackage.bonusCredits || 0);
    const reference = `RAZORPAY-${razorpay_payment_id}`;
    
    // Initialize credits if not exists
    if (!user.credits) {
      user.credits = {
        balance: 0,
        totalPurchased: 0,
        totalSpent: 0,
        transactions: []
      };
    }
    
    // Update user credits
    user.credits.balance += totalCredits;
    user.credits.totalPurchased += totalCredits;
    user.credits.lastPurchase = new Date();
    user.credits.transactions.push({
      type: "purchase",
      amount: totalCredits,
      description: `Purchased ${creditPackage.name} via Razorpay`,
      reference,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      user: user._id,
      type: "payment",
      amount: -creditPackage.price,
      currency: creditPackage.currency || "INR",
      status: "completed",
      description: `Credit purchase: ${creditPackage.name} (${totalCredits} credits)`,
      reference,
      paymentMethod: "razorpay",
      metadata: {
        packageId: creditPackage._id,
        credits: totalCredits,
        razorpay_order_id,
        razorpay_payment_id
      }
    });
    
    res.json({
      success: true,
      message: "Payment verified and credits added successfully",
      credits: {
        balance: user.credits.balance,
        purchased: totalCredits,
        package: creditPackage.name
      },
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
