import nodemailer from "nodemailer";
import { getOTPExpirySeconds } from "./otpHelper.js";

let cachedTransporter = null;

const formatOtpValidityLabel = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 300;

  if (safeSeconds % 60 === 0) {
    const minutes = safeSeconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${safeSeconds} second${safeSeconds === 1 ? "" : "s"}`;
};

const trimTrailingSlash = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const normalizeClientBaseUrl = (value = "") => {
  const rawValue = trimTrailingSlash(value);
  if (!rawValue) return "";

  if (/^https?:\/\//i.test(rawValue)) {
    return rawValue;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawValue)) {
    return `http://${rawValue}`;
  }

  return `https://${rawValue}`;
};

const resolveClientBaseUrl = (overrideBaseUrl = "") => {
  const candidates = [
    overrideBaseUrl,
    process.env.PUBLIC_CLIENT_URL,
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeClientBaseUrl(candidates[i]);
    if (normalized) {
      return normalized;
    }
  }

  return "http://localhost:5173";
};

const buildClientUrl = (path = "/", overrideBaseUrl = "") => {
  const baseUrl = resolveClientBaseUrl(overrideBaseUrl);
  const normalizedPath = `/${String(path || "/").replace(/^\/+/, "")}`;
  return `${baseUrl}${normalizedPath}`;
};

// Create reusable transporter
const createTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // For development, use ethereal.email or Gmail
  // For production, use a proper email service like SendGrid, AWS SES, etc.
  
  const emailUser = (process.env.EMAIL_USER || '').trim();
  const emailPassword = (process.env.EMAIL_PASSWORD || '').trim();
  
  console.log('Email config - User:', emailUser ? 'Found' : 'Missing', 'Pass:', emailPassword ? 'Found' : 'Missing');
  
  if (!emailUser || !emailPassword) {
    console.error('Missing EMAIL_USER or EMAIL_PASSWORD in environment variables');
    console.error('Available env keys:', Object.keys(process.env).filter(k => k.includes('EMAIL')));
    throw new Error('EMAIL_USER and EMAIL_PASSWORD environment variables are required');
  }
  
  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
    // Production configuration
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      pool: true,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
    return cachedTransporter;
  } else {
    // Development fallback - use Gmail with enhanced settings
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    return cachedTransporter;
  }
};

// Validate email configuration
const validateEmailConfig = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
  }
};

// Send OTP email
export const sendOTPEmail = async (email, name, otp) => {
  try {
    // Validate email configuration
    validateEmailConfig();
    
    // Validate email format
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Invalid email address format');
    }
    
    console.log(`Sending OTP email to ${email}...`);
    const transporter = createTransporter();
    const otpValidityLabel = formatOtpValidityLabel(getOTPExpirySeconds());

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: email,
      subject: 'Verify Your Email - ckript',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #1e3a5f; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #1e3a5f; letter-spacing: 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ckript!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thank you for signing up with ckript! To complete your registration, please verify your email address using the OTP code below:</p>
              
              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your verification code is:</p>
                <div class="otp-code">${otp}</div>
              </div>
              
              <p>This code will expire in <strong>${otpValidityLabel}</strong>.</p>
              <p>If you didn't create an account with ckript, please ignore this email.</p>
              
              <p>Best regards,<br>The ckript Team</p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nThank you for signing up with ckript! Your verification code is: ${otp}\n\nThis code will expire in ${otpValidityLabel}.\n\nIf you didn't create an account with ckript, please ignore this email.\n\nBest regards,\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully to:', email, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email to', email, ':', error.message, { code: error.code, command: error.command, response: error.response });
    
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Invalid credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email server.';
    } else if (error.responseCode === 550) {
      errorMessage = 'Invalid recipient email address.';
    }
    
    return { success: false, error: errorMessage };
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (email, name) => {
  try {
    console.log(`Sending welcome email to ${email}...`);
    const transporter = createTransporter();
    
    // Verify transporter connection
    await transporter.verify();
    console.log('Email service verified successfully');

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: email,
      subject: 'Welcome to ckript!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to ckript!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your email has been successfully verified! You're now part of the ckript community.</p>
              <p>Get started by:</p>
              <ul>
                <li>Completing your profile</li>
                <li>Uploading your first script</li>
                <li>Connecting with industry professionals</li>
              </ul>
              <p>We're excited to have you on board!</p>
              <p>Best regards,<br>The ckript Team</p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nYour email has been successfully verified! You're now part of the ckript community.\n\nWe're excited to have you on board!\n\nBest regards,\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    return { success: false, error: error.message };
  }
};

// Send writer signup bonus credits email
export const sendWriterSignupCreditsEmail = async (
  email,
  name,
  { amount = 180, balanceAfter = 180, clientBaseUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();
    const safeAmount = Number(amount) || 180;
    const safeBalance = Number(balanceAfter) || 0;
    const creditsUrl = buildClientUrl("/credits", clientBaseUrl);

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || "noreply@ckript.com"}>`,
      to: email,
      subject: "Your 180 writer signup credits are ready",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
              <h2 style="margin:0; font-size:20px;">Writer Signup Credits Added</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 12px;">Hi ${name || "there"},</p>
              <p style="margin:0 0 12px;">Welcome to ckript. We have added <strong>${safeAmount} credits</strong> to your account as a writer signup bonus.</p>
              <p style="margin:0 0 12px;">You can now use these credits for <strong>AI Trailer Generation</strong> and <strong>AI Script Evaluation</strong>.</p>
              <p style="margin:0 0 16px;"><strong>Current balance:</strong> ${safeBalance} credits</p>
              <a href="${creditsUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">View Credits</a>
              <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name || "there"},\n\nWelcome to ckript. We have added ${safeAmount} credits to your account as a writer signup bonus.\nYou can use these credits for AI Trailer Generation and AI Script Evaluation.\n\nCurrent balance: ${safeBalance} credits\nView credits: ${creditsUrl}\n\n- ckript`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending writer signup credits email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send investor account approval email
export const sendInvestorApprovalEmail = async (email, name, options = {}) => {
  try {
    console.log(`Sending investor approval email to ${email}...`);
    const transporter = createTransporter();
    await transporter.verify();

    const loginUrl = buildClientUrl("/login", options?.clientBaseUrl || "");

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: email,
      subject: '✅ Your Investor Account Has Been Approved — ckript',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">🎉 You're Approved!</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <div><span class="badge">✅ Account Approved</span></div>
              <p>Great news! Your investor account on <strong>ckript</strong> has been reviewed and <strong>approved</strong> by our admin team.</p>
              <p>You can now log in and start exploring investment opportunities in creative projects.</p>
              <div style="text-align:center">
                <a href="${loginUrl}" class="button">Log In to ckript</a>
              </div>
              <p style="color:#666;font-size:13px">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${loginUrl}" style="color:#1e3a5f">${loginUrl}</a></p>
              <p>Welcome aboard,<br/><strong>The ckript Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nGreat news! Your investor account on ckript has been approved.\n\nYou can now log in at: ${loginUrl}\n\nWelcome aboard,\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Investor approval email sent to:', email, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending investor approval email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send investor account rejection email with optional admin reason
export const sendInvestorRejectionEmail = async (email, name, reason, options = {}) => {
  try {
    console.log(`Sending investor rejection email to ${email}...`);
    const transporter = createTransporter();
    await transporter.verify();

    const loginUrl = buildClientUrl("/login", options?.clientBaseUrl || "");
    const safeReason = String(reason || "").trim();

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: email,
      subject: 'Update on Your Investor Profile Review — ckript',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #fee2e2; color: #991b1b; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .reason { background: #fff; border-left: 4px solid #dc2626; padding: 12px 14px; border-radius: 6px; margin: 12px 0; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">Profile Review Update</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <div><span class="badge">Profile Not Approved</span></div>
              <p>Thank you for applying as an investor on <strong>ckript</strong>. After review, your profile was not approved at this time.</p>
              ${safeReason ? `<p><strong>Review reason:</strong></p><div class="reason">${safeReason}</div>` : ""}
              <p>You may update your profile details and contact our support team for guidance.</p>
              <div style="text-align:center">
                <a href="${loginUrl}" class="button">Open ckript Login</a>
              </div>
              <p style="color:#666;font-size:13px">Need help? Reach us at info.ckript@gmail.com</p>
              <p>Regards,<br/><strong>The ckript Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nYour investor profile was not approved at this time.${safeReason ? `\n\nReview reason: ${safeReason}` : ""}\n\nYou can contact support at info.ckript@gmail.com.\n\nLogin: ${loginUrl}\n\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Investor rejection email sent to:', email, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending investor rejection email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send writer membership decision email
export const sendWriterMembershipDecisionEmail = async (
  email,
  name,
  membershipLabel,
  decision,
  note = "",
  options = {}
) => {
  try {
    console.log(`Sending ${membershipLabel} membership ${decision} email to ${email}...`);
    const transporter = createTransporter();
    await transporter.verify();

    const normalizedDecision = String(decision || "").toLowerCase() === "approved" ? "approved" : "rejected";
    const safeMembershipLabel = String(membershipLabel || "Membership").toUpperCase();
    const safeNote = String(note || "").trim();
    const profileUrl = buildClientUrl("/profile", options?.clientBaseUrl || "");
    const isApproved = normalizedDecision === "approved";
    const subject = isApproved
      ? `✅ ${safeMembershipLabel} Membership Approved — ckript`
      : `Update on Your ${safeMembershipLabel} Membership Review — ckript`;

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge-approved { display: inline-block; background: #d1fae5; color: #065f46; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .badge-rejected { display: inline-block; background: #fee2e2; color: #991b1b; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .note { background: #fff; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; margin: 12px 0; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">${safeMembershipLabel} Membership Review</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <div><span class="${isApproved ? "badge-approved" : "badge-rejected"}">${isApproved ? "Membership Approved" : "Membership Not Approved"}</span></div>
              <p>Your ${safeMembershipLabel} membership request has been <strong>${isApproved ? "approved" : "reviewed"}</strong>.</p>
              ${isApproved
                ? "<p>Your writer profile now reflects your verified membership status.</p>"
                : "<p>Your request was not approved at this time. You can upload updated proof and submit again.</p>"}
              ${safeNote ? `<p><strong>Admin note:</strong></p><div class="note">${safeNote}</div>` : ""}
              <div style="text-align:center">
                <a href="${profileUrl}" class="button">Open My Profile</a>
              </div>
              <p style="color:#666;font-size:13px">If the button doesn't work, use this link:<br/><a href="${profileUrl}" style="color:#1e3a5f">${profileUrl}</a></p>
              <p>Regards,<br/><strong>The ckript Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nYour ${safeMembershipLabel} membership request has been ${isApproved ? "approved" : "reviewed"}.${safeNote ? `\n\nAdmin note: ${safeNote}` : ""}\n\nOpen profile: ${profileUrl}\n\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Writer membership decision email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending writer membership decision email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send purchase request email to writer
export const sendPurchaseRequestEmail = async (
  writerEmail,
  writerName,
  requesterName,
  requesterType,
  scriptTitle,
  amount,
  requestNote = "",
  options = {}
) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const safeRequesterName = String(requesterName || "A buyer").trim();
    const safeRequesterType = String(requesterType || "Buyer").trim();
    const safeRequestNote = String(requestNote || "").trim();

    const dashboardUrl = buildClientUrl("/purchase-requests", options?.clientBaseUrl || "");

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: writerEmail,
      subject: `📩 ${safeRequesterType} Access Request for "${scriptTitle}" — ckript`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">📩 New Purchase Request</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${writerName}</strong>,</p>
              <div><span class="badge">💰 Purchase Request</span></div>
              <p><strong>${safeRequesterName}</strong> (${safeRequesterType}) wants access to your script and has sent a purchase request to you.</p>
              <div class="info-box">
                <p style="margin:0"><strong>Script:</strong> ${scriptTitle}</p>
                <p style="margin:4px 0 0"><strong>Offered Amount:</strong> ₹${amount}</p>
                <p style="margin:4px 0 0"><strong>Requester:</strong> ${safeRequesterName} (${safeRequesterType})</p>
                ${safeRequestNote ? `<p style="margin:4px 0 0"><strong>Message:</strong> ${safeRequestNote}</p>` : ""}
              </div>
              <p>Please log in to ckript and review this request in your purchase requests panel.</p>
              <p>To share the full script, approve the request from the platform dashboard. If you decline, access will not be granted.</p>
              <p>If you approve, the buyer will be asked to complete payment before access is granted.</p>
              <div style="text-align:center">
                <a href="${dashboardUrl}" class="button">Review Purchase Request</a>
              </div>
              <p style="color:#666;font-size:13px">If the button doesn't work, copy and paste this link:<br/><a href="${dashboardUrl}" style="color:#1e3a5f">${dashboardUrl}</a></p>
              <p>Best regards,<br/><strong>The ckript Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${writerName},\n\n${safeRequesterName} (${safeRequesterType}) wants access to your script "${scriptTitle}" and has sent a purchase request for ₹${amount}.${safeRequestNote ? `\n\nMessage: ${safeRequestNote}` : ""}\n\nPlease review the request on ckript and approve from the dashboard. After approval, the buyer will be asked to pay before access is granted.\n\nReview request: ${dashboardUrl}\n\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending purchase request email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send purchase approved email to investor
export const sendPurchaseApprovedEmail = async (investorEmail, investorName, writerName, scriptTitle, scriptId = "", options = {}) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const requiresPayment = Boolean(options?.requiresPayment);
    const amount = Number(options?.amount || 0);
    const paymentDueAtRaw = options?.paymentDueAt;
    const paymentDueAt = paymentDueAtRaw ? new Date(paymentDueAtRaw) : null;
    const deadlineText = paymentDueAt && !Number.isNaN(paymentDueAt.getTime())
      ? paymentDueAt.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
      : "";
    const scriptsUrl = buildClientUrl(scriptId ? `/script/${scriptId}` : "/search", options?.clientBaseUrl || "");
    const subject = requiresPayment
      ? `✅ Request Approved — Complete Payment for "${scriptTitle}" — ckript`
      : `✅ Purchase Approved — "${scriptTitle}" — ckript`;
    const headerTitle = requiresPayment ? "✅ Request Approved" : "🎉 Purchase Approved!";
    const badgeText = requiresPayment ? "✅ Approved · Payment Required" : "✅ Approved";
    const statusText = requiresPayment ? "Awaiting Buyer Payment" : "Access Granted ✅";
    const ctaLabel = requiresPayment ? "Pay & Unlock Script" : "Open Approved Script";
    const bodyIntro = requiresPayment
      ? `Great news! <strong>${writerName}</strong> approved your purchase request. Complete the payment to unlock full script access.`
      : `Great news! <strong>${writerName}</strong> has approved your purchase request. You now have full access to the script.`;
    const bodyDetails = requiresPayment
      ? `<p>Please complete payment${amount > 0 ? ` of <strong>₹${amount.toLocaleString("en-IN")}</strong>` : ""} from the script page to unlock full synopsis and content.</p>${deadlineText ? `<p><strong>Payment deadline:</strong> ${deadlineText}</p>` : ""}`
      : `<p>You can now view the complete synopsis, full content, and all script details on ckript.</p>`;
    const textVersion = requiresPayment
      ? `Hi ${investorName},\n\n${writerName} approved your purchase request for "${scriptTitle}". Please complete payment${amount > 0 ? ` of ₹${amount.toLocaleString("en-IN")}` : ""} to unlock full access.${deadlineText ? `\nPayment deadline: ${deadlineText}` : ""}\n\nContinue: ${scriptsUrl}\n\nThe ckript Team`
      : `Hi ${investorName},\n\n${writerName} has approved your purchase request for "${scriptTitle}". You now have full access.\n\nOpen script: ${scriptsUrl}\n\nThe ckript Team`;

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: investorEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .button { display: inline-block; background: #065f46; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">${headerTitle}</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${investorName}</strong>,</p>
              <div><span class="badge">${badgeText}</span></div>
              <p>${bodyIntro}</p>
              <div class="info-box">
                <p style="margin:0"><strong>Script:</strong> ${scriptTitle}</p>
                <p style="margin:4px 0 0"><strong>Writer:</strong> ${writerName}</p>
                <p style="margin:4px 0 0"><strong>Status:</strong> ${statusText}</p>
              </div>
              ${bodyDetails}
              <div style="text-align:center">
                <a href="${scriptsUrl}" class="button">${ctaLabel}</a>
              </div>
              <p>${requiresPayment ? "Once payment is confirmed, access is granted instantly." : "Congratulations on your acquisition,"}<br/><strong>The ckript Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textVersion,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending purchase approved email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send purchase rejected email to investor
export const sendPurchaseRejectedEmail = async (investorEmail, investorName, writerName, scriptTitle, note, options = {}) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const refundAmount = Number(options?.refundAmount || 0);
    const searchUrl = buildClientUrl("/search", options?.clientBaseUrl || "");

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || 'noreply@ckript.com'}>`,
      to: investorEmail,
      subject: `Purchase Request Declined — "${scriptTitle}" — ckript`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #374151 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #fee2e2; color: #991b1b; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .note-box { background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px; padding: 12px 16px; margin: 12px 0; font-style: italic; color: #92400e; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">Purchase Request Update</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${investorName}</strong>,</p>
              <div><span class="badge">Request Declined</span></div>
              <p>We're sorry to inform you that <strong>${writerName}</strong> has declined your purchase request for the following script.</p>
              <div class="info-box">
                <p style="margin:0"><strong>Script:</strong> ${scriptTitle}</p>
                <p style="margin:4px 0 0"><strong>Writer:</strong> ${writerName}</p>
                <p style="margin:4px 0 0"><strong>Status:</strong> Declined</p>
              </div>
              ${note ? `<p><strong>Writer's note:</strong></p><div class="note-box">${note}</div>` : ''}
              ${refundAmount > 0
                ? `<p>Any funds reserved for this request have been <strong>refunded</strong>${refundAmount ? ` (₹${refundAmount.toLocaleString("en-IN")})` : ""}.</p>`
                : "<p>No payment was collected for this request.</p>"}
              <p>Don't be discouraged — there are many other great scripts available on ckript!</p>
              <div style="text-align:center">
                <a href="${searchUrl}" class="button">Explore More Scripts</a>
              </div>
              <p>Best regards,<br/><strong>The ckript Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${investorName},\n\n${writerName} has declined your purchase request for "${scriptTitle}".\n${note ? `\nWriter's note: ${note}\n` : ''}\n${refundAmount > 0 ? `Any reserved funds were refunded${refundAmount ? ` (₹${refundAmount.toLocaleString("en-IN")})` : ""}.` : "No payment was collected for this request."}\n\nExplore more scripts: ${searchUrl}\n\nThe ckript Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending purchase rejected email:', error.message);
    return { success: false, error: error.message };
  }
};

// Send admin workflow alert email to company mailbox
export const sendAdminWorkflowAlertEmail = async ({ title, section, message, metadata = {} }) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();
    await transporter.verify();

    const companyEmail = (process.env.COMPANY_NOTIFICATION_EMAIL || "info.ckript@gmail.com").trim().toLowerCase();
    if (!companyEmail || !companyEmail.includes("@")) {
      return { success: false, error: "Invalid company notification email" };
    }

    const safeTitle = String(title || "Admin Workflow Alert").trim();
    const safeSection = String(section || "admin").trim();
    const safeMessage = String(message || "A new admin workflow item was created.").trim();
    const combinedAlertText = `${safeTitle} ${safeMessage}`.toLowerCase();
    const normalizedSection = safeSection.toLowerCase();
    const trailerRelated =
      normalizedSection.includes("trailer") ||
      combinedAlertText.includes("trailer");
    const projectSpotlightActivatedRelated =
      combinedAlertText.includes("project spotlight activated");

    // Do not send trailer-related alerts to the company inbox alias requested by the user.
    if (companyEmail === "info.ckript@gmail.com" && trailerRelated) {
      return { success: true, skipped: true, reason: "trailer-alert-blocked-for-company-email" };
    }

    if (companyEmail === "info.ckript@gmail.com" && projectSpotlightActivatedRelated) {
      return { success: true, skipped: true, reason: "spotlight-activation-alert-blocked-for-company-email" };
    }

    const rows = Object.entries(metadata || {})
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .map(([key, value]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;"><strong>${String(key)}</strong></td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${String(value)}</td></tr>`
      )
      .join("");

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || "noreply@ckript.com"}>`,
      to: companyEmail,
      subject: `[Admin Alert] ${safeTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <h2 style="margin:0 0 8px;">${safeTitle}</h2>
          <p style="margin:0 0 12px;"><strong>Section:</strong> ${safeSection}</p>
          <p style="margin:0 0 16px;">${safeMessage}</p>
          ${rows ? `<table style="border-collapse:collapse;border:1px solid #e5e7eb;">${rows}</table>` : ""}
          <p style="margin-top:16px;color:#6b7280;font-size:12px;">Generated at ${new Date().toISOString()}</p>
        </body>
        </html>
      `,
      text: `Title: ${safeTitle}\nSection: ${safeSection}\nMessage: ${safeMessage}\n${Object.entries(metadata || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin workflow alert email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send user email when admin grants credits
export const sendAdminCreditsGrantedEmail = async (
  email,
  name,
  { amount = 0, reason = "Admin credit grant", balanceAfter = 0, adminName = "Admin", clientBaseUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();

    const numericAmount = Number(amount) || 0;
    const safeReason = String(reason || "Admin credit grant").trim() || "Admin credit grant";
    const safeBalance = Number(balanceAfter) || 0;
    const safeAdminName = String(adminName || "Admin").trim() || "Admin";
    const creditsUrl = buildClientUrl("/credits", clientBaseUrl);

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || "noreply@ckript.com"}>`,
      to: email,
      subject: "Credits added to your ckript account",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
              <h2 style="margin:0; font-size:20px;">Credits Added</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 12px;">Hi ${name || "there"},</p>
              <p style="margin:0 0 12px;">${safeAdminName} added <strong>${numericAmount} credits</strong> to your account.</p>
              <p style="margin:0 0 8px;"><strong>Reason:</strong> ${safeReason}</p>
              <p style="margin:0 0 16px;"><strong>Updated balance:</strong> ${safeBalance} credits</p>
              <a href="${creditsUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">View Credits</a>
              <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name || "there"},\n\n${safeAdminName} added ${numericAmount} credits to your account.\nReason: ${safeReason}\nUpdated balance: ${safeBalance} credits\n\nView credits: ${creditsUrl}\n\n- ckript`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin credit grant email:", error.message);
    return { success: false, error: error.message };
  }
};

// Send user email when admin sends a direct message
export const sendAdminMessageEmail = async (
  email,
  name,
  { senderName = "Admin", previewText = "", hasAttachment = false, clientBaseUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();

    const safeSenderName = String(senderName || "Admin").trim() || "Admin";
    const safePreview = String(previewText || "").trim();
    const messagesUrl = buildClientUrl("/messages", clientBaseUrl);
    const summary = safePreview
      ? safePreview
      : hasAttachment
        ? "You have a new attachment from admin."
        : "You have a new message from admin.";

    const mailOptions = {
      from: `"ckript" <${process.env.EMAIL_USER || "noreply@ckript.com"}>`,
      to: email,
      subject: "New admin message on ckript",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
              <h2 style="margin:0; font-size:20px;">New Admin Message</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 12px;">Hi ${name || "there"},</p>
              <p style="margin:0 0 12px;">${safeSenderName} sent you a new message on ckript.</p>
              <p style="margin:0 0 16px;"><strong>Preview:</strong> ${summary}</p>
              <a href="${messagesUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Open Messages</a>
              <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name || "there"},\n\n${safeSenderName} sent you a new message on ckript.\nPreview: ${summary}\n\nOpen messages: ${messagesUrl}\n\n- ckript`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin message email:", error.message);
    return { success: false, error: error.message };
  }
};
