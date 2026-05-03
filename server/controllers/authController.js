import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail, sendWelcomeEmail } from "../utils/emailService.js";
import {
  generateOTP,
  generateOTPExpiry,
  generateOTPResendAvailableAt,
  getOTPExpirySeconds,
  getOTPResendCooldownSeconds,
  getRemainingResendCooldownSeconds,
  hashOTP,
  isHashedOTP,
  isOTPExpired,
  verifyHashedOTP,
} from "../utils/otpHelper.js";
import { notifyAdminWorkflowEvent } from "../utils/adminWorkflowAlerts.js";
import { getProfileCompletion } from "../utils/profileCompletion.js";
import { getAdminBranchAccessStatus } from "../utils/adminBranchAccess.js";

const DEFAULT_LANGUAGE = "en";
const DEFAULT_TIMEZONE = "Asia/Kolkata";
const SUPPORTED_LANGUAGE_CODES = new Set(["en", "hi", "es", "fr", "de", "ja", "ko", "zh-CN"]);
const LANGUAGE_CODE_ALIASES = {
  zh: "zh-CN",
  "zh-cn": "zh-CN",
};

const normalizeLanguagePreference = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_LANGUAGE;

  const mapped = LANGUAGE_CODE_ALIASES[raw.toLowerCase()] || raw;
  return SUPPORTED_LANGUAGE_CODES.has(mapped) ? mapped : DEFAULT_LANGUAGE;
};

const generateToken = (id) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "30d";
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
  // Decode to get the exact expiry timestamp
  const decoded = jwt.decode(token);
  return { token, expiresAt: decoded.exp * 1000 }; // ms epoch
};

// Comprehensive email validation
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // Trim and convert to lowercase
  email = email.trim().toLowerCase();
  
  // Check length
  if (email.length > 254 || email.length < 5) return false;
  
  // More comprehensive email regex (RFC 5322 Official Standard)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  
  // Additional checks
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domain] = parts;
  
  // Local part validation
  if (localPart.length > 64 || localPart.length === 0) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  
  // Domain validation
  if (domain.length === 0 || domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  
  // Check for valid TLD (at least 2 characters)
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  
  return true;
};

// Sanitize email
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

const normalizeOptionalDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeOtpInput = (otp) => String(otp || "").trim();

const isValidOtpInput = (otp) => /^\d{6}$/.test(otp);

const buildVerificationResponse = (email) => ({
  requiresVerification: true,
  email,
  otpExpirySeconds: getOTPExpirySeconds(),
  resendCooldownSeconds: getOTPResendCooldownSeconds(),
});

const CONTACT_REQUIRED_ROLES = new Set(["reader"]);
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const USERNAME_REQUIRED_ROLES = new Set([]);
const INDIA_COUNTRY_NAME = "India";
const INDIA_ZIP_REGEX = /^\d{6}$/;
const INTERNATIONAL_POSTAL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s-]{2,11}$/;
const REFERRAL_BONUS_CREDITS = 15;
const REFERRAL_INPUT_MAX_LENGTH = 40;
const DEFAULT_CLIENT_ORIGIN = "https://ckript.com";

const normalizeInputValue = (value = "") => String(value).trim();
const normalizeCountryName = (value = "") => normalizeInputValue(value);
const isIndiaCountry = (value = "") => normalizeCountryName(value).toLowerCase() === "india";
const normalizeReferralInput = (value = "") => normalizeInputValue(value).slice(0, REFERRAL_INPUT_MAX_LENGTH);
const normalizeReferralCode = (value = "") => normalizeReferralInput(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
const normalizeReferralUsername = (value = "") =>
  normalizeReferralInput(value)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

const buildReferralLink = (referralCode = "") => {
  const base = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || DEFAULT_CLIENT_ORIGIN)
    .trim()
    .replace(/\/$/, "");
  const safeCode = encodeURIComponent(String(referralCode || "").trim());
  return `${base}/${safeCode}`;
};

const buildReferralTransactionReference = () =>
  `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const buildReferralCreditTransaction = ({ amount, description, reference }) => ({
  type: "bonus",
  amount,
  description,
  reference,
  createdAt: new Date(),
});

const findReferrerByInput = async (rawReferralInput = "") => {
  const normalizedRaw = normalizeReferralInput(rawReferralInput);
  if (!normalizedRaw) return null;

  const referralCodeCandidate = normalizeReferralCode(normalizedRaw);
  if (referralCodeCandidate.length >= 4) {
    const matchedByCode = await User.findOne({ referralCode: referralCodeCandidate }).select(
      "_id name email role referralCode writerProfile.username"
    );
    if (matchedByCode) {
      return matchedByCode;
    }
  }

  const usernameCandidate = normalizeReferralUsername(normalizedRaw);
  if (usernameCandidate.length >= 3) {
    const matchedByUsername = await User.findOne({ "writerProfile.username": usernameCandidate }).select(
      "_id name email role referralCode writerProfile.username"
    );
    if (matchedByUsername) {
      return matchedByUsername;
    }
  }

  return null;
};

const hasReferralBeenUsedByEmail = async (rawEmail = "", options = {}) => {
  const email = sanitizeEmail(rawEmail);
  if (!email) return false;

  const filter = {
    $and: [
      {
        $or: [
          { email },
          { "accountDeletion.originalEmail": email },
        ],
      },
      {
        $or: [
          { referredBy: { $exists: true, $ne: null } },
          { hasReceivedReferralBonus: true },
          { referralBonusAwardedAt: { $exists: true, $ne: null } },
        ],
      },
    ],
  };

  if (options.excludeUserId) {
    filter._id = { $ne: options.excludeUserId };
  }

  const existing = await User.exists(filter);
  return Boolean(existing);
};

const awardReferralBonusForUser = async (userId) => {
  if (!userId) return { awarded: false };

  const referredUser = await User.findById(userId).select(
    "name referredBy hasReceivedReferralBonus referralBonusAwardedAt referralCode"
  );

  if (!referredUser || !referredUser.referredBy || referredUser.hasReceivedReferralBonus) {
    return { awarded: false };
  }

  if (String(referredUser.referredBy) === String(referredUser._id)) {
    await User.updateOne(
      { _id: referredUser._id, hasReceivedReferralBonus: false },
      {
        $set: {
          hasReceivedReferralBonus: true,
          referralBonusAwardedAt: new Date(),
        },
      }
    );
    return { awarded: false, reason: "self_referral_blocked" };
  }

  const referrer = await User.findById(referredUser.referredBy).select(
    "_id name email referralCode writerProfile.username"
  );

  if (!referrer) {
    return { awarded: false, reason: "referrer_not_found" };
  }

  if (String(referrer._id) === String(referredUser._id)) {
    return { awarded: false, reason: "self_referral_blocked" };
  }

  const reference = buildReferralTransactionReference();
  const now = new Date();

  const referredCreditUpdate = await User.updateOne(
    {
      _id: referredUser._id,
      referredBy: referrer._id,
      hasReceivedReferralBonus: false,
    },
    {
      $set: {
        hasReceivedReferralBonus: true,
        referralBonusAwardedAt: now,
      },
      $inc: {
        "credits.balance": REFERRAL_BONUS_CREDITS,
        "credits.totalPurchased": REFERRAL_BONUS_CREDITS,
      },
      $push: {
        "credits.transactions": buildReferralCreditTransaction({
          amount: REFERRAL_BONUS_CREDITS,
          description: `Referral bonus for joining via ${referrer.referralCode || "referral link"}`,
          reference,
        }),
      },
    }
  );

  if (!referredCreditUpdate.modifiedCount) {
    return { awarded: false, reason: "already_awarded" };
  }

  try {
    await User.updateOne(
      { _id: referrer._id },
      {
        $inc: {
          "credits.balance": REFERRAL_BONUS_CREDITS,
          "credits.totalPurchased": REFERRAL_BONUS_CREDITS,
          "referralStats.successfulReferrals": 1,
          "referralStats.totalBonusCredits": REFERRAL_BONUS_CREDITS,
        },
        $push: {
          "credits.transactions": buildReferralCreditTransaction({
            amount: REFERRAL_BONUS_CREDITS,
            description: `Referral bonus: ${referredUser.name || "A user"} joined successfully`,
            reference,
          }),
        },
      }
    );
  } catch (referrerCreditError) {
    // Best-effort rollback if referrer credit update fails after awarding referee credits.
    await User.updateOne(
      {
        _id: referredUser._id,
        "credits.transactions.reference": reference,
      },
      {
        $set: {
          hasReceivedReferralBonus: false,
          referralBonusAwardedAt: null,
        },
        $inc: {
          "credits.balance": -REFERRAL_BONUS_CREDITS,
          "credits.totalPurchased": -REFERRAL_BONUS_CREDITS,
        },
        $pull: {
          "credits.transactions": { reference },
        },
      }
    );

    throw referrerCreditError;
  }

  return {
    awarded: true,
    reference,
    bonusCredits: REFERRAL_BONUS_CREDITS,
    referrerName: referrer.name || "",
    referrerCode: referrer.referralCode || "",
  };
};

const buildFormattedAddress = ({ street = "", city = "", state = "", zipCode = "", country = "" } = {}) => {
  const normalizedCountry = normalizeCountryName(country);
  const parts = [street, city, state, zipCode];

  if (normalizedCountry && !isIndiaCountry(normalizedCountry)) {
    parts.push(normalizedCountry);
  }

  return parts.filter(Boolean).join(", ");
};

const normalizeAddressPayload = (addressPayload) => {
  if (!addressPayload || typeof addressPayload !== "object") return null;

  const street = normalizeInputValue(addressPayload.street);
  const city = normalizeInputValue(addressPayload.city);
  const state = normalizeInputValue(addressPayload.state);
  const zipCode = normalizeInputValue(addressPayload.zipCode);
  const countryInput = normalizeCountryName(addressPayload.country);
  const country = countryInput || INDIA_COUNTRY_NAME;
  const formattedInput = normalizeInputValue(addressPayload.formatted);

  return {
    street,
    city,
    state,
    zipCode,
    country,
    formatted: formattedInput || buildFormattedAddress({ street, city, state, zipCode, country }),
  };
};

const normalizeLocation = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();

const parseAddressForValidation = (address = "") => {
  if (!address || typeof address !== "string") return null;

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) return null;

  let zipIndex = parts.length - 1;
  let zipMatch = (parts[zipIndex] || "").match(/(\d{6})/);

  if (!zipMatch && parts.length >= 2) {
    zipIndex = parts.length - 2;
    zipMatch = (parts[zipIndex] || "").match(/(\d{6})/);
  }

  if (!zipMatch) return null;

  const zipCode = zipMatch[1];
  const state = parts[zipIndex - 1] || "";
  const city = parts[zipIndex - 2] || "";

  if (!state || !city) return null;

  return { city, state, zipCode };
};

const fetchJsonWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Postal API request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchPostalOfficesFromIndiaPost = async (zipCode) => {
  const data = await fetchJsonWithTimeout(`https://api.postalpincode.in/pincode/${zipCode}`);
  return Array.isArray(data) && data[0]?.PostOffice ? data[0].PostOffice : [];
};

const fetchPostalOfficesFromZippopotam = async (zipCode) => {
  const data = await fetchJsonWithTimeout(`https://api.zippopotam.us/IN/${zipCode}`);
  const places = Array.isArray(data?.places) ? data.places : [];

  return places.map((place) => ({
    Name: place["place name"] || "",
    District: place["place name"] || "",
    Block: place["place name"] || "",
    Division: "",
    State: place.state || "",
  }));
};

const fetchPostalOfficesByZip = async (zipCode) => {
  try {
    const offices = await fetchPostalOfficesFromIndiaPost(zipCode);
    if (offices.length) return offices;
  } catch (primaryError) {
    console.warn("Primary ZIP provider unavailable:", primaryError.message || primaryError);
  }

  try {
    return await fetchPostalOfficesFromZippopotam(zipCode);
  } catch (fallbackError) {
    throw new Error(fallbackError?.message || "All ZIP lookup providers failed");
  }
};

const extractCityStateFromOffices = (offices = []) => {
  if (!offices.length) return { city: "", state: "" };

  const firstOffice = offices[0] || {};
  const city = firstOffice.District || firstOffice.Name || firstOffice.Block || firstOffice.Division || "";
  const state = firstOffice.State || "";

  return { city, state };
};

const validateAddressWithPostalData = async ({ city, state, zipCode }) => {
  const strictAddressValidation =
    String(process.env.STRICT_ADDRESS_VALIDATION || "false").toLowerCase() === "true";

  let offices = [];
  try {
    offices = await fetchPostalOfficesByZip(zipCode);
  } catch (postalError) {
    console.warn("Postal API unavailable during signup address validation:", postalError.message || postalError);

    if (strictAddressValidation) {
      return {
        valid: false,
        statusCode: 503,
        message: "Address validation service is temporarily unavailable. Please try again.",
      };
    }

    return {
      valid: true,
      skipped: true,
      message: "Address format accepted. Live ZIP verification is temporarily unavailable.",
      normalized: {
        city,
        state,
        zipCode,
      },
    };
  }

  if (!offices.length) {
    return {
      valid: false,
      statusCode: 400,
      message: "Invalid ZIP code. No matching postal records found.",
    };
  }

  const normalizedInputState = normalizeLocation(state);
  const normalizedInputCity = normalizeLocation(city);

  const stateMatches = offices.some((office) => normalizeLocation(office.State) === normalizedInputState);

  const cityMatches = offices.some((office) => {
    const candidates = [office.District, office.Name, office.Block, office.Division]
      .filter(Boolean)
      .map((value) => normalizeLocation(value));

    return candidates.some((candidate) =>
      candidate === normalizedInputCity ||
      candidate.includes(normalizedInputCity) ||
      normalizedInputCity.includes(candidate)
    );
  });

  if (!stateMatches) {
    return {
      valid: false,
      statusCode: 400,
      message: "State does not match the entered ZIP code.",
    };
  }

  if (!cityMatches) {
    return {
      valid: false,
      statusCode: 400,
      message: "City does not match the entered ZIP code.",
    };
  }

  return {
    valid: true,
    normalized: {
      city,
      state,
      zipCode,
    },
  };
};

// Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
const isValidPassword = (password) => {
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain at least one uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain at least one lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain at least one number" };
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return { valid: false, message: "Password must contain at least one special character" };
  return { valid: true };
};

export const join = async (req, res) => {
  console.log('Join request received:', req.body);
  let { name, email, password, role, phone, address, username, referralCode, dateOfBirth, subRole } = req.body;
  try {
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    // Sanitize email
    email = sanitizeEmail(email);
    
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address. Ensure it has a valid format (e.g., user@example.com)" });
    }

    // Validate password strength
    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    role = normalizeInputValue(role).toLowerCase() || "creator";
    const normalizedUsername = normalizeInputValue(username).toLowerCase();
    const normalizedReferralInput = normalizeReferralInput(referralCode);
    const requiresUsername = USERNAME_REQUIRED_ROLES.has(role);

    if (requiresUsername && !normalizedUsername) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        message: "Username must be 3-30 characters and contain only lowercase letters, numbers, or underscores",
      });
    }

    let referrerUser = null;
    if (normalizedReferralInput) {
      const referralAlreadyUsedForEmail = await hasReferralBeenUsedByEmail(email);
      if (referralAlreadyUsedForEmail) {
        return res.status(400).json({
          message: "Referral already used for this email.",
        });
      }

      referrerUser = await findReferrerByInput(normalizedReferralInput);

      if (!referrerUser) {
        return res.status(400).json({
          message: "Invalid referral code or username",
        });
      }

      if (sanitizeEmail(referrerUser.email) === email) {
        return res.status(400).json({
          message: "You cannot use your own referral code",
        });
      }
    }

    const requiresContactDetails = CONTACT_REQUIRED_ROLES.has(role);
    const normalizedPhone = normalizeInputValue(phone);
    const normalizedAddress = normalizeAddressPayload(address);
    const shouldValidatePhone = requiresContactDetails || Boolean(normalizedPhone);
    const shouldValidateAddress = requiresContactDetails || Boolean(normalizedAddress);
    const normalizedDateOfBirth = normalizeOptionalDate(dateOfBirth);

    if (dateOfBirth !== undefined && dateOfBirth !== null && dateOfBirth !== "" && !normalizedDateOfBirth) {
      return res.status(400).json({ message: "Please provide a valid date of birth" });
    }

    if (shouldValidatePhone) {
      if (!normalizedPhone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      if (!/^[+]?[\d\s\-().]{7,15}$/.test(normalizedPhone)) {
        return res.status(400).json({ message: "Please enter a valid phone number (e.g. +91 00000 00000)" });
      }
      phone = normalizedPhone;
    }

    if (shouldValidateAddress) {
      if (!normalizedAddress) {
        return res.status(400).json({ message: "Address details are required" });
      }

      const { street, city, state, zipCode, country, formatted } = normalizedAddress;

      if (!street || !city || !state || !zipCode || !country) {
        return res.status(400).json({ message: "Street, city, state, postal code, and country are required" });
      }

      if (isIndiaCountry(country)) {
        if (!INDIA_ZIP_REGEX.test(zipCode)) {
          return res.status(400).json({ message: "ZIP code must be exactly 6 digits" });
        }
      } else if (!INTERNATIONAL_POSTAL_REGEX.test(zipCode)) {
        return res.status(400).json({ message: "Enter a valid postal code (3-12 letters, numbers, spaces, or hyphen)" });
      }

      const cityStatePattern = /^[a-zA-Z][a-zA-Z\s.'-]{1,}$/;
      if (!cityStatePattern.test(city) || !cityStatePattern.test(state)) {
        return res.status(400).json({ message: "Enter a valid city and state name" });
      }

      if (isIndiaCountry(country)) {
        const validationResult = await validateAddressWithPostalData({ city, state, zipCode });
        if (!validationResult.valid) {
          return res.status(validationResult.statusCode || 400).json({ message: validationResult.message });
        }
      }

      address = {
        street,
        city,
        state,
        zipCode,
        country,
        formatted: formatted || buildFormattedAddress({ street, city, state, zipCode, country }),
      };
    }

    let industryProfile;
    if (role === "professional") {
      const normalizedSubRole = normalizeInputValue(subRole).toLowerCase();
      industryProfile = normalizedSubRole ? { subRole: normalizedSubRole } : undefined;
    }

    if (normalizedUsername) {
      const existingUsernameForAnotherEmail = await User.exists({
        email: { $ne: email },
        "writerProfile.username": normalizedUsername,
      });

      if (existingUsernameForAnotherEmail) {
        return res.status(409).json({ message: "Username is already taken" });
      }
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      if (referrerUser && String(referrerUser._id) === String(userExists._id)) {
        return res.status(400).json({ message: "You cannot use your own referral code" });
      }

      if (requiresUsername && !normalizeInputValue(normalizedUsername || userExists.writerProfile?.username)) {
        return res.status(400).json({ message: "Username is required" });
      }

      if (normalizedUsername) {
        const usernameConflict = await User.exists({
          _id: { $ne: userExists._id },
          "writerProfile.username": normalizedUsername,
        });

        if (usernameConflict) {
          return res.status(409).json({ message: "Username is already taken" });
        }
      }

      // If user exists but not verified, allow resending OTP
      if (!userExists.emailVerified) {
        const remainingCooldownSeconds = getRemainingResendCooldownSeconds(
          userExists.emailVerificationResendAvailableAt
        );

        if (remainingCooldownSeconds > 0) {
          return res.status(429).json({
            message: `Please wait ${remainingCooldownSeconds} seconds before requesting a new verification code.`,
            cooldownRemainingSeconds: remainingCooldownSeconds,
            ...buildVerificationResponse(userExists.email),
          });
        }

        const otp = generateOTP();
        if (requiresContactDetails) {
          userExists.phone = phone;
          userExists.address = address;
          userExists.markModified("address");
        } else {
          if (phone) userExists.phone = phone;
          if (address) {
            userExists.address = address;
            userExists.markModified("address");
          }
        }
        if (industryProfile?.subRole) {
          if (!userExists.industryProfile) userExists.industryProfile = {};
          userExists.industryProfile.subRole = industryProfile.subRole;
          userExists.markModified("industryProfile");
        }
        if (normalizedUsername) {
          if (!userExists.writerProfile) userExists.writerProfile = {};
          userExists.writerProfile.username = normalizedUsername;
          userExists.markModified("writerProfile");
        }
        if (referrerUser && !userExists.referredBy) {
          userExists.referredBy = referrerUser._id;
        }
        userExists.emailVerificationToken = hashOTP(otp);
        userExists.emailVerificationExpires = generateOTPExpiry();
        userExists.emailVerificationResendAvailableAt = generateOTPResendAvailableAt();
        await userExists.save();
        
        const emailResult = await sendOTPEmail(email, userExists.name, otp);
        if (!emailResult.success) {
          console.error('Failed to resend OTP email:', emailResult.error);
          return res.status(500).json({ 
            message: emailResult.error?.includes('Invalid login') || emailResult.error?.includes('authentication') 
              ? "Email service configuration error. Please contact support." 
              : "Failed to send verification email. Please check your email address and try again."
          });
        }

        return res.status(200).json({ 
          message: "User already exists but not verified. New OTP sent to email.",
          ...buildVerificationResponse(email),
        });
      }
      return res.status(400).json({ message: "Email is already used. Please login." });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Check if email verification should be skipped (dev mode)
    const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';
    
    // Create user with OTP
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role,
      referredBy: referrerUser?._id,
      phone: shouldValidatePhone ? phone : undefined,
      address: shouldValidateAddress ? address : undefined,
      dateOfBirth: normalizedDateOfBirth,
      writerProfile: normalizedUsername ? { username: normalizedUsername } : undefined,
      industryProfile,
      emailVerified: skipEmailVerification, // Auto-verify if skipping email
      emailVerificationToken: skipEmailVerification ? undefined : hashOTP(otp),
      emailVerificationExpires: skipEmailVerification ? undefined : generateOTPExpiry(),
      emailVerificationResendAvailableAt: skipEmailVerification ? undefined : generateOTPResendAvailableAt(),
    });
    
    // If skipping email verification, return token directly
    if (skipEmailVerification) {
      const referralBonusResult = await awardReferralBonusForUser(user._id);
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      return res.status(201).json({
        _id: user._id,
        sid: user.sid,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        language: normalizeLanguagePreference(user.language),
        timezone: user.timezone || DEFAULT_TIMEZONE,
        referralBonusAwarded: referralBonusResult.awarded,
        referralBonusCredits: referralBonusResult.awarded ? REFERRAL_BONUS_CREDITS : 0,
        token,
        expiresAt,
        message: "Account created successfully (email verification skipped in dev mode)"
      });
    }
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, name, otp);
    if (!emailResult.success) {
      // Delete user if email fails
      await User.findByIdAndDelete(user._id);
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({ 
        message: emailResult.error?.includes('Invalid login') || emailResult.error?.includes('authentication') 
          ? "Email service configuration error. Please contact support." 
          : "Failed to send verification email. Please check your email address and try again."
      });
    }

    console.log('User created successfully, OTP sent:', user._id);
    res.status(201).json({
      message: "Account created successfully. Please check your email for verification code.",
      ...buildVerificationResponse(user.email),
    });
  } catch (error) {
    console.error('Join error:', error);
    if (error?.code === 11000 && error?.keyPattern?.["writerProfile.username"]) {
      return res.status(409).json({ message: "Username is already taken" });
    }
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  let { email, password, adminCode } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    email = sanitizeEmail(email);

    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      if (user.isDeactivated) {
        return res.status(403).json({
          message: "This account has been deleted",
          accountDeleted: true,
        });
      }

      if (user.isFrozen) {
        return res.status(403).json({
          message: user.frozenReason || "This account has been frozen by admin",
          accountFrozen: true,
        });
      }

      if (user.role === "admin") {
        const branchAccess = getAdminBranchAccessStatus();
        if (!branchAccess.allowed) {
          return res.status(403).json({
            message: branchAccess.message,
            currentBranch: branchAccess.currentBranch,
            allowedBranches: branchAccess.allowedBranches,
          });
        }

        const requiredAdminCode = String(process.env.ADMIN_PANEL_CODE || "24062004").trim();
        if (String(adminCode || "").trim() !== requiredAdminCode) {
          return res.status(403).json({ message: "Invalid admin access code" });
        }
      }

      if (!user.sid) {
        await user.save();
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in. Check your inbox for the verification code.",
          ...buildVerificationResponse(user.email),
        });
      }

      // Check admin approval for investors
      if (user.role === "investor" && user.approvalStatus === "pending") {
        return res.status(403).json({
          message: "Your account is pending admin approval. You will be notified once approved.",
          pendingApproval: true,
        });
      }
      if (user.role === "investor" && user.approvalStatus === "rejected") {
        return res.status(403).json({
          message: user.approvalNote
            ? `Your account has been rejected: ${user.approvalNote}. Please contact support.`
            : "Your investor account has been rejected. Please contact support.",
          rejected: true,
        });
      }
      
      const { token, expiresAt } = generateToken(user._id);
      res.json({
        _id: user._id,
        sid: user.sid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        language: normalizeLanguagePreference(user.language),
        timezone: user.timezone || DEFAULT_TIMEZONE,
        approvalStatus: user.approvalStatus,
        approvalNote: user.approvalNote,
        profileImage: user.profileImage || user.profilePicture || "",
        profileCompletion: getProfileCompletion(user),
        token,
        expiresAt,
      });
    } else {
      // Provide clearer guidance when the entered email is pending verification.
      const pendingUser = await User.findOne({ pendingEmail: email }).select("email pendingEmail");
      if (pendingUser) {
        return res.status(403).json({
          message: `This email is pending verification. Please verify it first or login with your current email (${pendingUser.email}).`,
          pendingEmail: pendingUser.pendingEmail,
          currentEmail: pendingUser.email,
          ...buildVerificationResponse(pendingUser.pendingEmail),
        });
      }

      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP and complete registration
export const verifyOTP = async (req, res) => {
  let { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and OTP" });
    }

    otp = normalizeOtpInput(otp);
    if (!isValidOtpInput(otp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Sanitize email
    email = sanitizeEmail(email);
    
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified. Please login." });
    }

    if (!user.emailVerificationToken) {
      return res.status(400).json({ message: "No verification code found. Please request a new one." });
    }

    if (!isHashedOTP(user.emailVerificationToken)) {
      user.emailVerificationToken = hashOTP(user.emailVerificationToken);
      await user.save();
    }

    if (user.isDeactivated) {
      return res.status(403).json({
        message: "This account has been deleted by admin",
        accountDeleted: true,
      });
    }

    if (user.isFrozen) {
      return res.status(403).json({
        message: user.frozenReason || "This account has been frozen by admin",
        accountFrozen: true,
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.emailVerificationExpires)) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.emailVerificationResendAvailableAt = undefined;
      await user.save();
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    // Check if OTP matches
    if (!verifyHashedOTP(user.emailVerificationToken, otp)) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationResendAvailableAt = undefined;

    // Investors require admin approval — set pending status
    if (user.role === "investor") {
      user.approvalStatus = "pending";
    }

    await user.save();

    if (user.role === "investor") {
      await notifyAdminWorkflowEvent({
        title: "Investor Profile Approval Request",
        section: "pending-investors",
        actorId: user._id,
        message: `Investor profile request received from ${user.name} (${user.email}).`,
        metadata: {
          investorId: user._id,
          investorEmail: user.email,
          status: "pending",
        },
      });
    }

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    const referralBonusResult = await awardReferralBonusForUser(user._id);

    // Investors cannot sign in from login until approved, but they should
    // still receive a session here to complete onboarding steps.
    if (user.role === "investor") {
      const { token, expiresAt } = generateToken(user._id);
      return res.json({
        message: "Email verified successfully! Complete your onboarding while your account is under admin review.",
        pendingApproval: true,
        email: user.email,
        role: user.role,
        _id: user._id,
        sid: user.sid,
        name: user.name,
        phone: user.phone,
        referralCode: user.referralCode,
        language: normalizeLanguagePreference(user.language),
        timezone: user.timezone || DEFAULT_TIMEZONE,
        approvalStatus: user.approvalStatus,
        approvalNote: user.approvalNote,
        profileCompletion: getProfileCompletion(user),
        referralBonusAwarded: referralBonusResult.awarded,
        referralBonusCredits: referralBonusResult.awarded ? REFERRAL_BONUS_CREDITS : 0,
        token,
        expiresAt,
      });
    }

    // Generate token and log user in
    const { token, expiresAt } = generateToken(user._id);
    
    res.json({
      message: "Email verified successfully!",
      _id: user._id,
      sid: user.sid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      referralCode: user.referralCode,
      language: normalizeLanguagePreference(user.language),
      timezone: user.timezone || DEFAULT_TIMEZONE,
      profileCompletion: getProfileCompletion(user),
      referralBonusAwarded: referralBonusResult.awarded,
      referralBonusCredits: referralBonusResult.awarded ? REFERRAL_BONUS_CREDITS : 0,
      token,
      expiresAt,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  let { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    // Sanitize email
    email = sanitizeEmail(email);
    
    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified. Please login." });
    }

    const remainingCooldownSeconds = getRemainingResendCooldownSeconds(
      user.emailVerificationResendAvailableAt
    );

    if (remainingCooldownSeconds > 0) {
      return res.status(429).json({
        message: `Please wait ${remainingCooldownSeconds} seconds before requesting a new verification code.`,
        cooldownRemainingSeconds: remainingCooldownSeconds,
        resendCooldownSeconds: getOTPResendCooldownSeconds(),
        otpExpirySeconds: getOTPExpirySeconds(),
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.emailVerificationToken = hashOTP(otp);
    user.emailVerificationExpires = generateOTPExpiry();
    user.emailVerificationResendAvailableAt = generateOTPResendAvailableAt();
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, user.name, otp);
    if (!emailResult.success) {
      console.error('Failed to resend OTP email:', emailResult.error);
      return res.status(500).json({ 
        message: emailResult.error?.includes('Invalid login') || emailResult.error?.includes('authentication') 
          ? "Email service configuration error. Please contact support." 
          : "Failed to send verification email. Please check your email address and try again."
      });
    }

    res.json({
      message: "Verification code sent to your email",
      resendCooldownSeconds: getOTPResendCooldownSeconds(),
      otpExpirySeconds: getOTPExpirySeconds(),
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Validate referral code/username without applying it
export const validateReferral = async (req, res) => {
  try {
    const rawInput = String(req.params?.referralInput || req.query?.ref || "").trim();
    const normalized = normalizeReferralInput(rawInput);

    if (!normalized) {
      return res.status(400).json({ valid: false, message: "Referral code is required" });
    }

    const referrer = await findReferrerByInput(normalized);
    if (!referrer) {
      return res.status(404).json({ valid: false, message: "Referral code or username not found" });
    }

    return res.json({
      valid: true,
      referrer: {
        name: referrer.name,
        role: referrer.role,
        username: referrer?.writerProfile?.username || "",
        referralCode: referrer.referralCode,
      },
    });
  } catch (error) {
    return res.status(500).json({ valid: false, message: error.message || "Unable to validate referral" });
  }
};

// Apply referral code for a logged-in user (if not already applied)
export const applyReferralCode = async (req, res) => {
  try {
    const inputCode = normalizeReferralInput(req.body?.referralCode);
    if (!inputCode) {
      return res.status(400).json({ message: "Referral code is required" });
    }

    const currentUser = await User.findById(req.user._id).select(
      "_id email name referralCode referredBy emailVerified hasReceivedReferralBonus"
    );
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.referredBy) {
      return res.status(400).json({ message: "Referral already applied to this account" });
    }

    const referralAlreadyUsedForEmail = await hasReferralBeenUsedByEmail(currentUser.email, {
      excludeUserId: currentUser._id,
    });
    if (referralAlreadyUsedForEmail) {
      return res.status(400).json({ message: "Referral already used for this email." });
    }

    const referrer = await findReferrerByInput(inputCode);
    if (!referrer) {
      return res.status(404).json({ message: "Referral code or username not found" });
    }

    if (String(referrer._id) === String(currentUser._id)) {
      return res.status(400).json({ message: "You cannot apply your own referral code" });
    }

    currentUser.referredBy = referrer._id;
    await currentUser.save();

    let referralBonusResult = { awarded: false };
    if (currentUser.emailVerified && !currentUser.hasReceivedReferralBonus) {
      referralBonusResult = await awardReferralBonusForUser(currentUser._id);
    }

    return res.json({
      message: "Referral applied successfully",
      referralApplied: true,
      referrer: {
        name: referrer.name,
        role: referrer.role,
        username: referrer?.writerProfile?.username || "",
        referralCode: referrer.referralCode,
      },
      referralBonusAwarded: referralBonusResult.awarded,
      referralBonusCredits: referralBonusResult.awarded ? REFERRAL_BONUS_CREDITS : 0,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to apply referral" });
  }
};

// Logged-in user's referral summary for dashboard widgets
export const getReferralSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "_id sid referralCode referralStats writerProfile.username"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.referralCode) {
      await user.save();
    }

    const [totalReferrals, successfulReferrals] = await Promise.all([
      User.countDocuments({ referredBy: user._id }),
      User.countDocuments({ referredBy: user._id, hasReceivedReferralBonus: true }),
    ]);

    const referralLink = buildReferralLink(user.referralCode);

    return res.json({
      referralCode: user.referralCode,
      referralLink,
      referralProfileLink: referralLink,
      bonusPerReferral: REFERRAL_BONUS_CREDITS,
      totalReferrals,
      successfulReferrals,
      totalBonusCredits:
        Number(user?.referralStats?.totalBonusCredits) ||
        successfulReferrals * REFERRAL_BONUS_CREDITS,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Unable to fetch referral summary" });
  }
};

export const lookupZipInfo = async (req, res) => {
  const zipCode = String(req.params?.zipCode || "").trim();

  try {
    if (!/^\d{6}$/.test(zipCode)) {
      return res.status(400).json({
        valid: false,
        message: "ZIP code must be exactly 6 digits.",
      });
    }

    const offices = await fetchPostalOfficesByZip(zipCode);

    if (!offices.length) {
      return res.status(404).json({
        valid: false,
        message: "Invalid ZIP code. No matching postal records found.",
      });
    }

    const { city, state } = extractCityStateFromOffices(offices);

    return res.json({
      valid: true,
      zipCode,
      city,
      state,
    });
  } catch (error) {
    console.error("ZIP lookup error:", error);
    return res.status(200).json({
      valid: false,
      zipCode,
      city: "",
      state: "",
      message: "Unable to auto-fill city/state right now. Please enter them manually.",
    });
  }
};

export const validateSignupAddress = async (req, res) => {
  try {
    const { address, country = INDIA_COUNTRY_NAME } = req.body;

    if (!isIndiaCountry(country)) {
      return res.json({
        valid: true,
        skipped: true,
        message: "International address format accepted.",
      });
    }

    const parsed = parseAddressForValidation(address);

    if (!parsed) {
      return res.status(400).json({
        valid: false,
        message: "Enter address as: Street, City, State, ZIP (6-digit).",
      });
    }

    const validationResult = await validateAddressWithPostalData(parsed);

    if (!validationResult.valid) {
      return res.status(validationResult.statusCode || 400).json({
        valid: false,
        message: validationResult.message,
      });
    }

    return res.json({
      valid: true,
      skipped: Boolean(validationResult.skipped),
      message: validationResult.message || "Address validated successfully.",
      normalized: validationResult.normalized,
    });
  } catch (error) {
    console.error("Address validation error:", error);
    return res.status(500).json({
      valid: false,
      message: "Unable to validate address right now. Please try again.",
    });
  }
};

// Validate token & return current user data (used on page refresh)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Extract expiry from the current token
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token);

    res.json({
      _id: user._id,
      sid: user.sid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      referralCode: user.referralCode,
      language: normalizeLanguagePreference(user.language),
      timezone: user.timezone || DEFAULT_TIMEZONE,
      approvalStatus: user.approvalStatus,
      approvalNote: user.approvalNote,
      profileImage: user.profileImage || user.profilePicture || "",
      profilePicture: user.profilePicture,
      bio: user.bio,
      profileCompletion: getProfileCompletion(user),
      expiresAt: decoded.exp * 1000,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
