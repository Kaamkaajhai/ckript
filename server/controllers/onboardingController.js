import User from "../models/User.js";
import Script from "../models/Script.js";
import Subscription from "../models/Subscription.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

// @desc    Update writer profile (Phase 2: Identity)
// @route   PUT /api/onboarding/writer-profile
// @access  Private
export const updateWriterProfile = async (req, res) => {
  try {
    const { 
      bio, 
      representationStatus, 
      agencyName, 
      wgaMember,
      diversity 
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Update writer profile
    user.bio = bio || user.bio;
    user.writerProfile.representationStatus = representationStatus || user.writerProfile.representationStatus;
    user.writerProfile.agencyName = agencyName || user.writerProfile.agencyName;
    user.writerProfile.wgaMember = wgaMember !== undefined ? wgaMember : user.writerProfile.wgaMember;
    
    if (diversity) {
      user.writerProfile.diversity = {
        ...user.writerProfile.diversity,
        ...diversity
      };
    }
    
    // Update onboarding step
    if (user.writerProfile.onboardingStep < 2) {
      user.writerProfile.onboardingStep = 2;
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        writerProfile: user.writerProfile
      }
    });
  } catch (error) {
    console.error("Error updating writer profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Upload script with metadata (Phase 3 & 4)
// @route   POST /api/onboarding/upload-script
// @access  Private
export const uploadScript = async (req, res) => {
  try {
    const {
      title,
      logline,
      description,
      format,
      primaryGenre,
      subGenres,
      tagIds,
      contentIndicators,
      fileUrl,
      pageCount
    } = req.body;
    
    // Validate required fields
    if (!title || !logline || !fileUrl) {
      return res.status(400).json({ 
        success: false, 
        message: "Title, logline, and script file are required" 
      });
    }
    
    // Create the script
    const script = await Script.create({
      creator: req.user._id,
      title,
      logline,
      description,
      format,
      primaryGenre,
      subGenres: subGenres || [],
      tagIds: tagIds || [],
      contentIndicators: contentIndicators || {},
      fileUrl,
      pageCount,
      contentType: format === "feature_film" ? "movie" : "tv_series"
    });
    
    // Update user's onboarding step
    const user = await User.findById(req.user._id);
    if (user.writerProfile.onboardingStep < 3) {
      user.writerProfile.onboardingStep = 3;
      await user.save();
    }
    
    res.status(201).json({ 
      success: true, 
      script,
      message: "Script uploaded successfully" 
    });
  } catch (error) {
    console.error("Error uploading script:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Accept submission agreement and create subscription (Phase 5)
// @desc    Complete writer onboarding
// @route   POST /api/onboarding/complete
// @access  Private
export const completeOnboarding = async (req, res) => {
  try {
    const {
      genres,
      tags,
      plan,
      agreementAccepted,
      stripePaymentMethodId
    } = req.body;
    
    if (!agreementAccepted) {
      return res.status(400).json({ 
        success: false, 
        message: "You must accept the terms and conditions" 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    // Update user profile with genres and tags
    if (genres && genres.length > 0) {
      user.writerProfile.genres = genres;
    }
    
    if (tags && tags.length > 0) {
      user.writerProfile.specializedTags = tags;
    }
    
    // Mark onboarding as complete
    user.writerProfile.onboardingComplete = true;
    user.writerProfile.onboardingStep = 4;
    user.writerProfile.plan = plan || "free";
    await user.save();
    
    // Create subscription record if paid plan
    let subscription = null;
    if (plan === "paid") {
      const baseAmount = 3000; // $30.00 in cents (hosting)
      const evaluationFee = 10000; // $100.00 in cents
      const totalAmount = baseAmount + evaluationFee;
      
      subscription = await Subscription.create({
        user: req.user._id,
        plan: "pro",
        amount: totalAmount,
        status: "pending", // Will be updated after Stripe payment
        billingCycle: "monthly",
        includesEvaluation: true,
        submissionAgreementAccepted: true,
        submissionAgreementAcceptedAt: new Date(),
        submissionAgreementIp: req.ip,
        stripePaymentMethodId
      });
      
      // TODO: Integrate with Stripe to process payment
      // This would create a Stripe customer and subscription
    }
    
    res.status(201).json({ 
      success: true, 
      subscription,
      message: "Onboarding completed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        writerProfile: user.writerProfile
      }
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Send email verification code
// @route   POST /api/onboarding/send-verification
// @access  Private
export const sendEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already verified" 
      });
    }
    
    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the code before storing
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    
    user.emailVerificationToken = hashedCode;
    user.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();
    
    // TODO: Send email with verification code
    // For development, we'll just return the code
    // In production, use nodemailer or a service like SendGrid
    
    console.log(`Verification code for ${user.email}: ${verificationCode}`);
    
    res.json({ 
      success: true, 
      message: "Verification code sent to your email",
      // Remove this in production:
      devCode: verificationCode 
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Verify email with code
// @route   POST /api/onboarding/verify-email
// @access  Private
export const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: "Verification code required" 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ 
        success: false, 
        message: "Email already verified" 
      });
    }
    
    // Hash the provided code
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    
    // Check if code matches and hasn't expired
    if (
      user.emailVerificationToken !== hashedCode ||
      user.emailVerificationExpires < Date.now()
    ) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired verification code" 
      });
    }
    
    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.writerProfile.onboardingStep = Math.max(user.writerProfile.onboardingStep, 1);
    await user.save();
    
    res.json({ 
      success: true, 
      message: "Email verified successfully" 
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update industry professional identity (Phase 2)
// @route   PUT /api/onboarding/professional-identity
// @access  Private
export const updateProfessionalIdentity = async (req, res) => {
  try {
    const { 
      company, 
      jobTitle, 
      imdbUrl, 
      linkedInUrl,
      previousCredits 
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.role !== "professional") {
      return res.status(403).json({ 
        success: false, 
        message: "This endpoint is for industry professionals only" 
      });
    }
    
    // Update industry profile
    user.industryProfile.company = company || user.industryProfile.company;
    user.industryProfile.jobTitle = jobTitle || user.industryProfile.jobTitle;
    user.industryProfile.imdbUrl = imdbUrl || user.industryProfile.imdbUrl;
    user.industryProfile.linkedInUrl = linkedInUrl || user.industryProfile.linkedInUrl;
    user.industryProfile.previousCredits = previousCredits || user.industryProfile.previousCredits;
    
    // Update onboarding step
    if (user.industryProfile.onboardingStep < 2) {
      user.industryProfile.onboardingStep = 2;
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        industryProfile: user.industryProfile
      }
    });
  } catch (error) {
    console.error("Error updating professional identity:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Complete industry professional onboarding
// @route   POST /api/onboarding/complete-industry
// @access  Private
export const completeIndustryOnboarding = async (req, res) => {
  try {
    const {
      mandates,
      agreementAccepted
    } = req.body;
    
    if (!agreementAccepted) {
      return res.status(400).json({ 
        success: false, 
        message: "You must accept the terms and conditions" 
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    if (user.role !== "professional") {
      return res.status(403).json({ 
        success: false, 
        message: "This endpoint is for industry professionals only" 
      });
    }
    
    // Update mandates
    if (mandates) {
      user.industryProfile.mandates = {
        formats: mandates.formats || [],
        budgetTiers: mandates.budgetTiers || [],
        genres: mandates.genres || [],
        excludeGenres: mandates.excludeGenres || [],
        specificHooks: mandates.specificHooks || []
      };
    }
    
    // Mark onboarding as complete
    user.industryProfile.onboardingComplete = true;
    user.industryProfile.onboardingStep = 4;
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Onboarding completed successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        industryProfile: user.industryProfile
      }
    });
  } catch (error) {
    console.error("Error completing industry onboarding:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get onboarding status
// @route   GET /api/onboarding/status
// @access  Private
export const getOnboardingStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }
    
    res.json({ 
      success: true, 
      onboarding: {
        emailVerified: user.emailVerified,
        currentStep: user.writerProfile.onboardingStep,
        complete: user.writerProfile.onboardingComplete,
        writerProfile: user.writerProfile
      }
    });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
