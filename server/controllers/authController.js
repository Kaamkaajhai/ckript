import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { sendOTPEmail, sendWelcomeEmail } from "../utils/emailService.js";
import { generateOTP, generateOTPExpiry, isOTPExpired } from "../utils/otpHelper.js";

const generateToken = (id) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "30d";
  const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
  // Decode to get the exact expiry timestamp
  const decoded = jwt.decode(token);
  return { token, expiresAt: decoded.exp * 1000 }; // ms epoch
};

// Email validation regex
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
  const { name, email, password, role } = req.body;
  try {
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Validate password strength
    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ message: passwordCheck.message });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      // If user exists but not verified, allow resending OTP
      if (!userExists.emailVerified) {
        const otp = generateOTP();
        userExists.emailVerificationToken = otp;
        userExists.emailVerificationExpires = generateOTPExpiry();
        await userExists.save();
        
        const emailResult = await sendOTPEmail(email, name, otp);
        if (!emailResult.success) {
          return res.status(500).json({ message: "Failed to send verification email. Please try again." });
        }
        
        return res.status(200).json({ 
          message: "User already exists but not verified. New OTP sent to email.",
          requiresVerification: true,
          email: email
        });
      }
      return res.status(400).json({ message: "User already exists and is verified. Please login." });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Create user with OTP
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role,
      emailVerified: false,
      emailVerificationToken: otp,
      emailVerificationExpires: generateOTPExpiry()
    });
    
    // Send OTP email
    const emailResult = await sendOTPEmail(email, name, otp);
    if (!emailResult.success) {
      // Delete user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }
    
    console.log('User created successfully, OTP sent:', user._id);
    res.status(201).json({
      message: "Account created successfully. Please check your email for verification code.",
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Please verify your email before logging in. Check your inbox for the verification code.",
          requiresVerification: true,
          email: user.email
        });
      }
      
      const { token, expiresAt } = generateToken(user._id);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
        expiresAt,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP and complete registration
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and OTP" });
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

    // Check if OTP is expired
    if (isOTPExpired(user.emailVerificationExpires)) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    // Check if OTP matches
    if (user.emailVerificationToken !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    // Generate token and log user in
    const { token, expiresAt } = generateToken(user._id);
    
    res.json({
      message: "Email verified successfully!",
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
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
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified. Please login." });
    }

    // Generate new OTP
    const otp = generateOTP();
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = generateOTPExpiry();
    await user.save();

    // Send OTP email
    const emailResult = await sendOTPEmail(email, user.name, otp);
    if (!emailResult.success) {
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

    res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: error.message });
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
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      bio: user.bio,
      expiresAt: decoded.exp * 1000,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
