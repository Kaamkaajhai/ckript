import nodemailer from "nodemailer";
import { getOTPExpirySeconds } from "./otpHelper.js";
import mailFrom from "./mailFrom.js";
import { CONTACTS, signatureHtml, signatureText } from "./companyContacts.js";
import { htmlToPlainText } from "./htmlText.js";

let cachedTransporter = null;

const formatOtpValidityLabel = (seconds) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 300;

  if (safeSeconds % 60 === 0) {
    const minutes = safeSeconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${safeSeconds} second${safeSeconds === 1 ? "" : "s"}`;
};

/**
 * Drop trailing slashes.
 *
 * A loop, not `/\/+$/`. That pattern is quadratic on "////…x": the engine matches the run of slashes
 * from every starting position, checks for end-of-string, fails because of the trailing character,
 * and backtracks through the whole run each time. This runs on a client-supplied base URL.
 */
const trimTrailingSlash = (value = "") => {
  const text = String(value || "").trim();
  let end = text.length;
  while (end > 0 && text[end - 1] === "/") end -= 1;
  return text.slice(0, end);
};

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
  // Gmail App Passwords are 16 characters and are DISPLAYED as four space-separated groups
  // ("abcd efgh ijkl mnop") for readability — but the actual password has NO spaces. If those
  // display spaces are pasted into .env, Gmail rejects auth with "535-5.7.8 BadCredentials". A plain
  // .trim() only strips the ends, so remove ALL internal whitespace here.
  const emailPassword = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');
  
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
      from: mailFrom(),
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
              
              <p>Best regards,<br>Team ${CONTACTS.name}</p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nThank you for signing up with ckript! Your verification code is: ${otp}\n\nThis code will expire in ${otpValidityLabel}.\n\nIf you didn't create an account with ckript, please ignore this email.\n\nBest regards,\nTeam ${CONTACTS.name}${signatureText()}`,
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

// Send password reset OTP email
export const sendPasswordResetOTPEmail = async (email, name, otp, validitySeconds) => {
  try {
    validateEmailConfig();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Invalid email address format');
    }

    console.log(`Sending password reset OTP email to ${email}...`);
    const transporter = createTransporter();
    const otpValidityLabel = formatOtpValidityLabel(validitySeconds || getOTPExpirySeconds());

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: 'Reset your ckript password',
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
            .warn { background:#fff7ed; border-left:4px solid #f97316; padding:10px 14px; border-radius:6px; color:#92400e; font-size:13px; margin-top:16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${name || 'there'},</p>
              <p>We received a request to reset the password for your ckript account. Use the verification code below to continue:</p>

              <div class="otp-box">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your password reset code is:</p>
                <div class="otp-code">${otp}</div>
              </div>

              <p>This code will expire in <strong>${otpValidityLabel}</strong>.</p>

              <div class="warn">
                If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
              </div>

              <p style="margin-top:16px;">Best regards,<br>Team ${CONTACTS.name}</p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name || 'there'},\n\nWe received a request to reset the password for your ckript account.\n\nYour password reset code is: ${otp}\n\nThis code will expire in ${otpValidityLabel}.\n\nIf you didn't request a password reset, ignore this email — your password will remain unchanged.\n\nBest regards,\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset OTP email sent successfully to:', email, 'MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset OTP email to', email, ':', error.message);
    return { success: false, error: error.message };
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
      from: mailFrom(),
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
              <p>Best regards,<br>Team ${CONTACTS.name}</p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nYour email has been successfully verified! You're now part of the ckript community.\n\nWe're excited to have you on board!\n\nBest regards,\nTeam ${CONTACTS.name}${signatureText()}`,
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

export const sendInvestorWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: 'Welcome to ckript — Your Gateway to Exceptional Scripts',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.5; color: #111827; margin: 0; padding: 0; background: #fafafa; }
            .container { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.05); border: 1px solid #f3f4f6; }
            .header { background: #000000; color: white; padding: 48px 40px; text-align: left; }
            .badge { display: inline-block; margin-bottom: 20px; color: #10b981; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 12px; border-radius: 4px; background: rgba(16, 185, 129, 0.1); }
            .header h1 { margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1.1; }
            .content { padding: 40px; }
            .greeting { font-size: 18px; font-weight: 600; margin-bottom: 24px; color: #111827; }
            .drama-text { font-size: 24px; font-weight: 700; color: #111827; line-height: 1.3; margin: 0 0 24px; letter-spacing: -0.5px; }
            .sub-text { font-size: 15px; color: #4b5563; margin-bottom: 32px; }
            .cta-wrapper { text-align: left; margin: 40px 0 20px; }
            .cta { background: #111827; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; transition: background 0.2s; }
            .footer { padding: 32px 40px; background: #f9fafb; color: #6b7280; font-size: 12px; border-top: 1px solid #f3f4f6; }
            .footer a { color: #111827; text-decoration: none; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">INDUSTRY ACCESS GRANTED</div>
              <h1>The screen is waiting.</h1>
            </div>
            <div class="content">
              <div class="greeting">Hi ${name},</div>
              
              <div class="drama-text">
                Every masterpiece starts with a single line.<br/>
                Your next big project is hiding in plain sight.
              </div>
              
              <div class="sub-text">
                Welcome to <strong>ckript</strong>. You now have exclusive access to a curated marketplace of production-ready stories, brilliant writers, and untapped intellectual property. No middlemen. Just you and the script.
              </div>

              <div class="cta-wrapper">
                <a href="${buildClientUrl('/search')}" class="cta">Discover Scripts</a>
              </div>
            </div>
            <div class="footer">${signatureHtml()}
              <p>If you have any questions, reply to this email. We're here to help.</p>
              <p>© ${new Date().getFullYear()} ckript. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nEvery masterpiece starts with a single line. Your next big project is hiding in plain sight.\n\nWelcome to ckript. You now have exclusive access to a curated marketplace of production-ready stories, brilliant writers, and untapped intellectual property. No middlemen. Just you and the script.\n\nDiscover Scripts: ${buildClientUrl('/search')}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Investor welcome email sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending investor welcome email:', error.message);
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
      from: mailFrom(),
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
              <p>Welcome aboard,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nGreat news! Your investor account on ckript has been approved.\n\nYou can now log in at: ${loginUrl}\n\nWelcome aboard,\nTeam ${CONTACTS.name}${signatureText()}`,
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
      from: mailFrom(),
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
              <p style="color:#666;font-size:13px">Need help? Reach us at ${CONTACTS.support}</p>
              <p>Regards,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nYour investor profile was not approved at this time.${safeReason ? `\n\nReview reason: ${safeReason}` : ""}\n\nYou can contact support at ${CONTACTS.support}.\n\nLogin: ${loginUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
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
      from: mailFrom(),
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
              <p>Regards,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\nYour ${safeMembershipLabel} membership request has been ${isApproved ? "approved" : "reviewed"}.${safeNote ? `\n\nAdmin note: ${safeNote}` : ""}\n\nOpen profile: ${profileUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
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
      from: mailFrom(),
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
              <p>Best regards,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${writerName},\n\n${safeRequesterName} (${safeRequesterType}) wants access to your script "${scriptTitle}" and has sent a purchase request for ₹${amount}.${safeRequestNote ? `\n\nMessage: ${safeRequestNote}` : ""}\n\nPlease review the request on ckript and approve from the dashboard. After approval, the buyer will be asked to pay before access is granted.\n\nReview request: ${dashboardUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
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
      ? `Hi ${investorName},\n\n${writerName} approved your purchase request for "${scriptTitle}". Please complete payment${amount > 0 ? ` of ₹${amount.toLocaleString("en-IN")}` : ""} to unlock full access.${deadlineText ? `\nPayment deadline: ${deadlineText}` : ""}\n\nContinue: ${scriptsUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`
      : `Hi ${investorName},\n\n${writerName} has approved your purchase request for "${scriptTitle}". You now have full access.\n\nOpen script: ${scriptsUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`;

    const mailOptions = {
      from: mailFrom(),
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
              <p>${requiresPayment ? "Once payment is confirmed, access is granted instantly." : "Congratulations on your acquisition,"}<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
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
      from: mailFrom(),
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
              <p>Best regards,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${investorName},\n\n${writerName} has declined your purchase request for "${scriptTitle}".\n${note ? `\nWriter's note: ${note}\n` : ''}\n${refundAmount > 0 ? `Any reserved funds were refunded${refundAmount ? ` (₹${refundAmount.toLocaleString("en-IN")})` : ""}.` : "No payment was collected for this request."}\n\nExplore more scripts: ${searchUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
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

    const companyEmail = (process.env.COMPANY_NOTIFICATION_EMAIL || CONTACTS.company).trim().toLowerCase();
    if (!companyEmail || !companyEmail.includes("@")) {
      return { success: false, error: "Invalid company notification email" };
    }

    // Whether the alerts below are being posted to the company's own inbox — the two suppression
    // rules underneath apply there and nowhere else.
    const isCompanyInbox = companyEmail === CONTACTS.company.trim().toLowerCase();

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
    if (isCompanyInbox && trailerRelated) {
      return { success: true, skipped: true, reason: "trailer-alert-blocked-for-company-email" };
    }

    if (isCompanyInbox && projectSpotlightActivatedRelated) {
      return { success: true, skipped: true, reason: "spotlight-activation-alert-blocked-for-company-email" };
    }

    const rows = Object.entries(metadata || {})
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .map(([key, value]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;"><strong>${String(key)}</strong></td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${String(value)}</td></tr>`
      )
      .join("");

    const mailOptions = {
      from: mailFrom(),
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
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Title: ${safeTitle}\nSection: ${safeSection}\nMessage: ${safeMessage}\n${Object.entries(metadata || {}).map(([k, v]) => `${k}: ${v}`).join("\n")}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin workflow alert email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendAdminPremiumGrantedEmail = async (
  email,
  name,
  { adminName = "Admin", clientBaseUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();

    const safeAdminName = String(adminName || "Admin").trim() || "Admin";
    const dashboardUrl = buildClientUrl("/dashboard", clientBaseUrl);

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: "Welcome to ckript Premium!",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
              <h2 style="margin:0; font-size:20px;">Premium Model Activated</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 12px;">Hi ${name || "there"},</p>
              <p style="margin:0 0 12px;">We have great news! ${safeAdminName} has granted you full access to the <strong>ckript Premium Model</strong> for film industry professionals.</p>
              <p style="margin:0 0 16px;">With Premium, you can now:</p>
              <ul style="margin:0 0 20px 20px; padding:0;">
                <li style="margin-bottom:8px;">Explore a curated library of high-quality scripts.</li>
                <li style="margin-bottom:8px;">View comprehensive writer details and portfolios.</li>
                <li style="margin-bottom:8px;">Access exclusive AI evaluation scores and tools.</li>
                <li>Connect directly with emerging and established writers.</li>
              </ul>
              <a href="${dashboardUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Explore ckript Premium</a>
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">Thank you for being part of the ckript community.</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hi ${name || "there"},\n\nWe have great news! ${safeAdminName} has granted you full access to the ckript Premium Model.\n\nWith Premium, you can explore high-quality scripts, view writer details, and access exclusive AI tools.\n\nExplore ckript Premium: ${dashboardUrl}\n\nThank you for being part of the ckript community.\n\nRegards,\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin premium grant email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendAdminPremiumRemovedEmail = async (
  email,
  name,
  { adminName = "Admin", clientBaseUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();

    const safeAdminName = String(adminName || "Admin").trim() || "Admin";
    const contactUrl = buildClientUrl("/contact", clientBaseUrl);

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: "Update Regarding Your ckript Premium Access",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
              <h2 style="margin:0; font-size:20px;">Premium Model Access Removed</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 12px;">Hi ${name || "there"},</p>
              <p style="margin:0 0 12px;">We are writing to inform you that ${safeAdminName} has removed your access to the <strong>ckript Premium Model</strong>.</p>
              <p style="margin:0 0 16px;">As a result, your account has been reverted to the standard tier, and premium features (such as comprehensive writer details and exclusive AI evaluation tools) are no longer active on your account.</p>
              <p style="margin:0 0 12px;">If you believe this was a mistake, or if you have any questions, please reach out to our support team.</p>
              <a href="${contactUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Contact Support</a>
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">Thank you for being part of the ckript community.</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hi ${name || "there"},\n\nWe are writing to inform you that ${safeAdminName} has removed your access to the ckript Premium Model.\n\nYour account has been reverted to the standard tier. If you have any questions, please reach out to our support team.\n\nContact Support: ${contactUrl}\n\nThank you for being part of the ckript community.\n\nRegards,\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin premium remove email:", error.message);
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
      from: mailFrom(),
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
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hi ${name || "there"},\n\n${safeSenderName} sent you a new message on ckript.\nPreview: ${summary}\n\nOpen messages: ${messagesUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin message email:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * The Email Builder's compiled footer carries these two slots, filled here per recipient — the
 * unsubscribe token is theirs, so the link cannot exist until the recipient is known. Literal for
 * literal the same as UNSUBSCRIBE_SLOT / PREFERENCES_SLOT in
 * client/src/pages/admin/marketing/compiler/emailCompiler.js; emailBuilderPreview.test.jsx pins the
 * two sides to each other across the package boundary.
 */
const UNSUBSCRIBE_SLOT = "{{UNSUBSCRIBE_URL}}";
const PREFERENCES_SLOT = "{{PREFERENCES_URL}}";

export const sendAdminBroadcastEmail = async (
  email,
  name,
  { title = "Platform update", content = "", actionUrl = "", audienceLabel = "community", adminName = "ckript Admin", clientBaseUrl = "", attachments = [], unsubscribeUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();
    const safeTitle = String(title || "Platform update").trim() || "Platform update";
    const safeContent = String(content || "").trim();
    const safeAudienceLabel = String(audienceLabel || "community").trim() || "community";
    const safeAdminName = String(adminName || "ckript Admin").trim() || "ckript Admin";
    const dashboardUrl = buildClientUrl("/dashboard", clientBaseUrl);
    // Where "Preferences" goes: the email-notification toggles on the profile's Settings tab. A
    // CLIENT link, unlike the unsubscribe one — that endpoint lives on the API, this page lives in
    // the SPA — so it goes through buildClientUrl like the dashboard link, not the API origin.
    const preferencesUrl = buildClientUrl("/profile?tab=settings", clientBaseUrl);
    const finalUrl = actionUrl || dashboardUrl;
    const buttonText = actionUrl ? "Open Link" : "Open ckript";
    // No extra replacements needed if content is already HTML, but let's safely allow basic line breaks if it's plain text.
    // If the frontend sends HTML (Tiptap), it shouldn't be blindly replaced, but we will trust the admin input.
    const isHtml = /<[a-z][\s\S]*>/i.test(safeContent);
    const htmlContent = isHtml ? safeContent : safeContent.replace(/\n/g, '<br/>');
    
    // Check if the content is from the new Email Builder V2 (which includes its own wrapper)
    const isBuilderV2 = htmlContent.includes("<!-- EMAIL_BUILDER_V2 -->");

    const finalHtml = isBuilderV2 ? htmlContent : `
        <!DOCTYPE html>
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="x-apple-disable-message-reformatting">
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <title>${safeTitle}</title>
          <!--[if !mso]><!-->
          <link href="https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" type="text/css">
          <!--<![endif]-->
          <style>
            /* The same shell the Email Builder compiles (client/src/pages/admin/marketing/compiler/emailCompiler.js):
               warm paper, ink, one coral accent, serif display type. Palette pinned across packages by
               emailBuilderPreview.test.jsx — a colour that is not in EMAIL_PALETTE there fails the build. */
            body { margin: 0; padding: 0; width: 100%; background-color: #fbfaf7; -webkit-text-size-adjust: 100%; }
            table { border-collapse: collapse; border-spacing: 0; }
            img { border: 0; display: block; }
            .card { width: 100%; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e7e5df; border-radius: 16px; }
            .masthead { padding: 32px 48px 26px; border-bottom: 1px solid #f2efe9; text-align: center; }
            .masthead img { width: 280px; max-width: 70%; height: auto; margin: 0 auto; }
            .title { margin: 0 0 22px; font-family: 'Baskervville', 'Spectral', Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 400; line-height: 1.2; letter-spacing: -0.3px; color: #0b0a06; text-align: center; }
            .body { padding: 40px 48px 8px; font-family: 'PT Serif', Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.75; color: #57544f; }
            .body p { margin: 0 0 18px; }
            .body a { color: #0b0a06; }
            .cta-cell { padding: 20px 48px 44px; text-align: center; }
            .action-btn { display: inline-block; background-color: #161513; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; letter-spacing: 0.2px; line-height: 50px; padding: 0 36px; border-radius: 10px; text-decoration: none; }
            .footer { padding: 34px 48px 38px; background-color: #f4efe6; border-top: 1px solid #e7e5df; border-radius: 0 0 16px 16px; text-align: center; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.8; color: #9a978f; }
            .footer p { margin: 0; }
            .footer .tagline { font-family: 'Baskervville', 'Spectral', Georgia, 'Times New Roman', serif; font-style: italic; font-size: 15px; line-height: 1.5; color: #6f6c66; }
            .footer .notice { margin-top: 20px; }
            .footer .links { margin-top: 4px; letter-spacing: 0.4px; color: #57544f; }
            .footer a { color: #57544f; text-decoration: none; }
            .footer .unsub a { text-decoration: underline; }
            .footer .legal { margin-top: 18px; font-size: 11px; letter-spacing: 0.3px; line-height: 1.6; }
            @media (prefers-color-scheme: dark) {
              body, .outer-table { background-color: #0f0f0f !important; }
              .card { background-color: #1a1a1a !important; border-color: #242424 !important; }
              .masthead { background-color: #f4efe6 !important; border-color: #242424 !important; }
              .title, .body, .body a { color: #d7d7d7 !important; }
              .footer { background-color: #141414 !important; border-color: #242424 !important; color: #9a9590 !important; }
              .footer a, .footer .links, .footer .tagline { color: #d7d7d7 !important; }
              .action-btn { background-color: #f4efe6 !important; color: #0b0a06 !important; }
            }
            @media only screen and (max-width: 640px) {
              .outer { padding: 0 !important; }
              .card { border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
              .masthead, .body, .cta-cell, .footer { padding-left: 24px !important; padding-right: 24px !important; }
              .footer { border-radius: 0 !important; }
              .title { font-size: 27px !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background-color:#fbfaf7;">
          <table role="presentation" class="outer-table" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fbfaf7;">
            <tr>
              <td class="outer" align="center" style="padding:44px 12px 52px;">
                <!--[if mso]><table role="presentation" align="center" style="width:640px;"><tr><td><![endif]-->
                <table role="presentation" class="card" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid #e7e5df;border-radius:16px;">
                  <tr>
                    <td class="masthead">
                      <a href="https://ckript.com" style="text-decoration:none;display:inline-block;">
                        <img src="https://ckript.com/ckript-logo-landscape-nobg.png" alt="Ckript" width="280" />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td class="body">
                      <h1 class="title">${safeTitle}</h1>
                      ${htmlContent}
                    </td>
                  </tr>
                  ${actionUrl
                    ? `<tr><td class="cta-cell"><a href="${finalUrl}" class="action-btn">${buttonText}</a></td></tr>`
                    : `<tr><td style="padding:0 0 30px;font-size:1px;line-height:1px;">&nbsp;</td></tr>`}
                  <tr>
                    <td class="footer">
                      <p class="tagline">A minimal platform for storytellers.</p>
                      <p class="notice">You are receiving this because you subscribed to our updates.</p>
                      <p class="links">
                        <a href="https://ckript.com">Website</a> &nbsp;&middot;&nbsp;
                        <a href="https://ckript.com/privacy-policy">Privacy</a> &nbsp;&middot;&nbsp;
                        <a href="https://ckript.com/terms-of-service">Terms</a>${
                          // A VISIBLE link, not only the List-Unsubscribe header. Gmail shows its header
                          // control only for senders with reputation, and Outlook and Apple Mail never show it
                          // at all — so for most recipients this line is the only way out that exists. A
                          // recipient who cannot find one presses the spam button instead.
                          unsubscribeUrl ? ` &nbsp;&middot;&nbsp;\n                <span class="unsub"><a href="${unsubscribeUrl}">Unsubscribe</a> &nbsp;&middot;&nbsp;\n                <a href="${preferencesUrl}">Preferences</a></span>` : ""
                        }
                      </p>
                      ${signatureHtml()}
                      <p class="legal">Ckript Private Limited &nbsp;&middot;&nbsp; &copy; ${new Date().getFullYear()} Ckript. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
                <!--[if mso]></td></tr></table><![endif]-->
              </td>
            </tr>
          </table>
        </body>
        </html>
    `;

    /*
     * RFC 8058 one-click unsubscribe.
     *
     * Gmail and Yahoo require this of anyone sending bulk mail, and they render their OWN unsubscribe
     * control beside the sender when both headers are present. That control is the one recipients
     * actually use; the alternative they reach for is the spam button, which costs the deliverability
     * of every message the platform sends rather than just this one.
     *
     * List-Unsubscribe-Post is what makes it one-click — without it the client merely opens the URL
     * and the recipient still has to do something. Both headers, or neither.
     *
     * Set for BROADCASTS only. A password reset or a receipt carrying an unsubscribe header invites
     * someone to switch off mail their own account depends on.
     */
    const listHeaders = unsubscribeUrl
      ? {
        "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${CONTACTS.support}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      }
      : {};

    /*
     * The Email Builder path sends the admin's compiled document, and since the redesign that
     * document carries its own footer — the same warm band as the wrapper above — with two slots for
     * the personal links. They are filled HERE, per recipient, because the unsubscribe token is
     * theirs and only exists at send time.
     *
     * A builder document WITHOUT slots (an older build still open in someone's browser, or HTML
     * pasted from elsewhere) gets the strip below injected before </body>, the way notify.js appends
     * the contact signature. Either way no bulk mail leaves without a visible way out.
     */
    const unsubscribeFooter = unsubscribeUrl
      ? `\n<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">`
        + `<tr><td align="center" style="padding:24px 16px;border-top:1px solid #e7e5df;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">`
        + `<p style="margin:0;font-size:12px;line-height:1.8;color:#9a978f;">You are receiving this because you subscribed to our updates.</p>`
        + `<p style="margin:8px 0 0;font-size:12px;line-height:1.8;color:#9a978f;">`
        + `<a href="${unsubscribeUrl}" style="color:#57544f;text-decoration:underline;">Unsubscribe</a>`
        + ` &nbsp;&middot;&nbsp; `
        + `<a href="${preferencesUrl}" style="color:#57544f;text-decoration:underline;">Preferences</a>`
        + `</p></td></tr></table>`
      : "";
    const hasFooterSlots = isBuilderV2 && finalHtml.includes(UNSUBSCRIBE_SLOT);
    // No signed link for this send (nothing bulk passes one today, but the parameter is optional):
    // the mailto that already backs the List-Unsubscribe header is the honest fallback.
    const unsubscribeHref = unsubscribeUrl || `mailto:${CONTACTS.support}?subject=unsubscribe`;
    const htmlForSend = hasFooterSlots
      ? finalHtml.split(UNSUBSCRIBE_SLOT).join(unsubscribeHref).split(PREFERENCES_SLOT).join(preferencesUrl)
      : isBuilderV2 && unsubscribeFooter
        ? (finalHtml.includes("</body>") ? finalHtml.replace("</body>", `${unsubscribeFooter}\n</body>`) : finalHtml + unsubscribeFooter)
        : finalHtml;

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: safeTitle,
      html: htmlForSend,
      headers: listHeaders,
      // A plain-text alternative, like every other template here. Without one a broadcast is
      // HTML-only, which reads as spam to filters and renders as nothing in a text-only client — and
      // it is the one message that goes to the whole audience at once.
      // htmlToPlainText, not a one-pass `replace(/<[^>]*>/g, "")`. That is the exact bug fixed in
      // htmlText.js and then written fresh here: one sweep lets "<<script>script>" reassemble, and it
      // decodes nothing, so an encoded tag survives into the text part.
      text: `${safeTitle}\n\n${htmlToPlainText(content).trim()}${
        actionUrl ? `\n\n${buttonText}: ${finalUrl}` : ""
      }\n\nTeam ${CONTACTS.name}${signatureText()}${
        // A visible link as well as the header. Plenty of clients render neither the header control
        // nor HTML, and a recipient who can find no way out is a spam complaint waiting to happen.
        unsubscribeUrl ? `\n\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}\nManage preferences: ${preferencesUrl}` : ""
      }`,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending admin broadcast email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendCustomHtmlEmail = async (
  email,
  subject,
  html,
  attachments = []
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();

    // The admin's markup goes out exactly as written; the signature is APPENDED rather than woven in,
    // so a direct email carries the same three contact addresses as every other template here without
    // this function having to understand the HTML it was handed.
    const body = String(html || "");
    const finalHtml = `${body}<div style="text-align:center;margin-top:20px;color:#666;font-size:12px">${signatureHtml()}</div>`;

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: subject,
      html: finalHtml,
      // A plain-text alternative. htmlToPlainText is the shared converter — it decodes entities before
      // stripping tags and strips repeatedly, so admin markup cannot smuggle a tag through.
      text: `${htmlToPlainText(body).trim()}\n\nTeam ${CONTACTS.name}${signatureText()}`,
      attachments: attachments.map(att => ({
        filename: att.filename,
        path: att.url, // Assuming url is a path or actual URL. If we use memory storage, we pass buffer. Let's support both.
        content: att.buffer,
        contentType: att.mimetype,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending custom HTML email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendNewMessageEmail = async (
  email,
  receiverName,
  senderName,
  { clientBaseUrl = "" } = {}
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();
    const safeReceiverName = String(receiverName || "Writer").trim();
    const safeSenderName = String(senderName || "An investor").trim();
    const messagesUrl = buildClientUrl("/messages", clientBaseUrl);

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `New direct message from ${safeSenderName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color:#fff; padding:20px 20px;">
              <h2 style="margin:0; font-size:20px;">You have a new message! 🎬</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 12px; font-size: 16px;">Hi ${safeReceiverName},</p>
              <p style="margin:0 0 16px; font-size: 16px;">Great news! Film industry professional <strong>${safeSenderName}</strong> has sent you a direct message regarding your work on ckript.</p>
              <p style="margin:0 0 20px; font-size: 16px;">Don't keep them waiting—head over to your messages to reply and start the conversation!</p>
              <a href="${messagesUrl}" style="display:inline-block;background:#2d5a8f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600; font-size: 16px;">Go to Messages</a>
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript. If you need help, contact our support team.</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hi ${safeReceiverName},\n\nGreat news! Film industry professional ${safeSenderName} has sent you a direct message regarding your work on ckript.\n\nDon't keep them waiting—head over to your messages to reply and start the conversation!\n\nOpen Messages: ${messagesUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending new message email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendMeetingInvitationEmail = async (
  email,
  {
    producerName,
    scriptName,
    date,
    time,
    duration,
    meetingId,
    clientBaseUrl = "",
  }
) => {
  try {
    validateEmailConfig();

    const transporter = createTransporter();
    const dashboardUrl = buildClientUrl("/profile", clientBaseUrl);

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `Meeting Request from Producer on Ckript`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color:#fff; padding:20px 20px;">
              <h2 style="margin:0; font-size:20px;">New Meeting Request 🗓️</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 16px; font-size: 16px;">Hello,</p>
              <p style="margin:0 0 16px; font-size: 16px;"><strong>${producerName}</strong> has requested a meeting with you regarding your script <strong>"${scriptName}"</strong>.</p>
              
              <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong>Date:</strong> ${date}</p>
                <p style="margin:0 0 8px;"><strong>Time:</strong> ${time}</p>
                <p style="margin:0;"><strong>Duration:</strong> ${duration} minutes</p>
              </div>

              <p style="margin:0 0 20px; font-size: 16px;">Please review and respond to this request from your dashboard.</p>
              
              <a href="${dashboardUrl}" style="display:inline-block;background:#2d5a8f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600; font-size: 16px;">View Request in Dashboard</a>
              
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript. If you need help, contact our support team.</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hello,\n\n${producerName} has requested a meeting with you regarding your script "${scriptName}".\n\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\n\nPlease review and respond to this request from your dashboard: ${dashboardUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending meeting invitation email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendMeetingAcceptedEmail = async (
  email,
  {
    writerName,
    scriptName,
    date,
    time,
    meetingLink,
    clientBaseUrl = "",
  }
) => {
  try {
    validateEmailConfig();
    const transporter = createTransporter();

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `Meeting Confirmed: ${writerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; padding:20px 20px;">
              <h2 style="margin:0; font-size:20px;">Meeting Confirmed ✅</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 16px; font-size: 16px;">Hello,</p>
              <p style="margin:0 0 16px; font-size: 16px;"><strong>${writerName}</strong> has accepted your meeting request regarding the script <strong>"${scriptName}"</strong>.</p>
              
              <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong>Date:</strong> ${date}</p>
                <p style="margin:0 0 8px;"><strong>Time:</strong> ${time}</p>
                <p style="margin:0; word-break: break-all;"><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color:#2d5a8f;">${meetingLink}</a></p>
              </div>

              <a href="${meetingLink}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600; font-size: 16px;">Join Meeting</a>
              
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript. If you need help, contact our support team.</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hello,\n\n${writerName} has accepted your meeting request regarding the script "${scriptName}".\n\nDate: ${date}\nTime: ${time}\nMeeting Link: ${meetingLink}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending meeting acceptance email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendMeetingAcceptedWriterEmail = async (
  email,
  {
    writerName,
    producerName,
    scriptName,
    date,
    time,
    meetingLink,
  }
) => {
  try {
    validateEmailConfig();
    const transporter = createTransporter();

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `Meeting Details: ${producerName} - ckript`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #2d5a8f 0%, #1e3a5f 100%); color:#fff; padding:20px 20px;">
              <h2 style="margin:0; font-size:20px;">Meeting Details Confirmed</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 16px; font-size: 16px;">Hi <strong>${writerName}</strong>,</p>
              <p style="margin:0 0 16px; font-size: 16px;">You have successfully accepted the meeting request from <strong>${producerName}</strong> regarding your script <strong>"${scriptName}"</strong>.</p>
              
              <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong>Date:</strong> ${date}</p>
                <p style="margin:0 0 8px;"><strong>Time:</strong> ${time}</p>
                <p style="margin:0; word-break: break-all;"><strong>Meeting Link:</strong> <a href="${meetingLink}" style="color:#2d5a8f;">${meetingLink}</a></p>
              </div>

              <p style="margin:0 0 16px;">Please use the link above to join the meeting at the scheduled time.</p>
              <a href="${meetingLink}" style="display:inline-block;background:#2d5a8f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600; font-size: 16px;">Join Meeting</a>
              
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript. We wish you a productive meeting!</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hi ${writerName},\n\nYou have accepted the meeting request from ${producerName} regarding your script "${scriptName}".\n\nDate: ${date}\nTime: ${time}\nMeeting Link: ${meetingLink}\n\nPlease use the link above to join the meeting at the scheduled time.\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending meeting acceptance writer email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendMeetingRejectedEmail = async (
  email,
  {
    writerName,
    scriptName,
    clientBaseUrl = "",
  }
) => {
  try {
    validateEmailConfig();
    const transporter = createTransporter();

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `Meeting Declined: ${writerName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <div style="max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color:#fff; padding:20px 20px;">
              <h2 style="margin:0; font-size:20px;">Meeting Declined ❌</h2>
            </div>
            <div style="padding:20px; background:#ffffff;">
              <p style="margin:0 0 16px; font-size: 16px;">Hello,</p>
              <p style="margin:0 0 16px; font-size: 16px;">Unfortunately, <strong>${writerName}</strong> has declined your meeting request regarding the script <strong>"${scriptName}"</strong>.</p>
              
              <p style="margin:0 0 20px; font-size: 16px;">Your meeting quota slot for this request has been consumed and will not be refunded. You may reach out to them via direct messages instead.</p>
              
              <p style="margin:24px 0 0; color:#6b7280; font-size:12px;">This is an automated email from ckript. If you need help, contact our support team.</p>
            </div>
          </div>
            <div style="max-width:620px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:1.7;text-align:center;">${signatureHtml()}
            </div>
        </body>
        </html>
      `,
      text: `Hello,\n\nUnfortunately, ${writerName} has declined your meeting request regarding the script "${scriptName}".\n\nYour meeting quota slot for this request has been consumed. You may reach out to them via direct messages instead.\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending meeting rejection email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendWriterPlanGrantedEmail = async (
  email,
  {
    writerName,
    planName,
    clientBaseUrl = "",
  }
) => {
  try {
    validateEmailConfig();
    const transporter = createTransporter();
    
    const formattedPlanName = planName === "gold" ? "Gold Model" : planName === "silver" ? "Silver Model" : planName;
    const loginUrl = buildClientUrl("/login", clientBaseUrl);

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `🎉 You've been upgraded to ${formattedPlanName} — ckript`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #d4af37 0%, #aa801a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">Account Upgraded</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${writerName}</strong>,</p>
              <div><span class="badge">💎 ${formattedPlanName} Granted</span></div>
              <p>Great news! An administrator on <strong>ckript</strong> has granted your account the <strong>${formattedPlanName}</strong> plan.</p>
              <p>You can now enjoy the premium benefits of your new plan, including higher visibility and premium features to accelerate your screenwriting career.</p>
              <div style="text-align:center">
                <a href="${loginUrl}" class="button">Log In to ckript</a>
              </div>
              <p style="color:#666;font-size:13px">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${loginUrl}" style="color:#1e3a5f">${loginUrl}</a></p>
              <p>Welcome to the premium tier,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${writerName},\n\nGreat news! An administrator on ckript has granted your account the ${formattedPlanName} plan.\n\nYou can now enjoy all the premium benefits. Log in to explore: ${loginUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending writer plan granted email:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendFipPlanGrantedEmail = async (
  email,
  {
    userName,
    clientBaseUrl = "",
  }
) => {
  try {
    validateEmailConfig();
    const transporter = createTransporter();
    
    const loginUrl = buildClientUrl("/login", clientBaseUrl);

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject: `🎉 You've been upgraded to Diamond Film Industry Professional — ckript`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0e7490 0%, #155e75 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: #e0f2fe; color: #0284c7; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .button { display: inline-block; background: #1e3a5f; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">Account Upgraded</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              <div><span class="badge">💎 1-Year Diamond Plan Granted</span></div>
              <p>Great news! An administrator on <strong>ckript</strong> has granted your account a 1-year <strong>Diamond Film Industry Professional</strong> subscription.</p>
              <p>You can now enjoy all premium access features, including contact revelations, meeting bookings, and comprehensive script analytics.</p>
              <div style="text-align:center">
                <a href="${loginUrl}" class="button">Log In to ckript</a>
              </div>
              <p style="color:#666;font-size:13px">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${loginUrl}" style="color:#1e3a5f">${loginUrl}</a></p>
              <p>Welcome to Diamond,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${userName},\n\nGreat news! An administrator on ckript has granted your account a 1-year Diamond Film Industry Professional subscription.\n\nYou can now enjoy all the premium benefits. Log in to explore: ${loginUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending FIP plan granted email:", error.message);
    return { success: false, error: error.message };
  }
};


/**
 * The decision on a "I already registered elsewhere" claim.
 *
 * One template for both outcomes, because they are the same message with a different answer and a
 * split would drift. Approval carries the entry ID the writer needs; rejection carries the reason and
 * says plainly that they can submit again — a dead end here means someone who paid on another
 * platform simply never enters.
 */
export const sendExternalRegistrationDecisionEmail = async (
  email,
  name,
  {
    decision,
    competitionName = "the challenge",
    providerLabel = "a third-party platform",
    externalRef = "",
    note = "",
    eventId = "",
    competitionId = "",
    clientBaseUrl = "",
  } = {}
) => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    const isApproved = String(decision || "").toLowerCase() === "approved";
    const safeNote = String(note || "").trim();
    const actionUrl = buildClientUrl(
      isApproved && competitionId ? `/challenges/${competitionId}` : "/challenges",
      clientBaseUrl,
    );
    const subject = isApproved
      ? `✅ You're in — ${competitionName}`
      : `Action needed: your ${competitionName} registration`;

    const mailOptions = {
      from: mailFrom(),
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #141110; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #faf8f7; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge-approved { display: inline-block; background: #d1fae5; color: #065f46; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .badge-rejected { display: inline-block; background: #fbf1ef; color: #8a2c1a; font-size: 14px; font-weight: bold; padding: 6px 16px; border-radius: 20px; margin-bottom: 16px; }
            .note { background: #fff; border-left: 4px solid #D14D37; padding: 12px 14px; border-radius: 6px; margin: 12px 0; }
            .facts { background: #fff; border: 1px solid #ded8d5; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 14px; }
            .button { display: inline-block; background: #D14D37; color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">${competitionName}</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <div><span class="${isApproved ? "badge-approved" : "badge-rejected"}">${isApproved ? "Registration confirmed" : "We could not confirm this yet"}</span></div>
              ${isApproved
                ? `<p>We checked your registration on <strong>${providerLabel}</strong> and you're confirmed. No payment is needed on Ckript — your entry is active.</p>`
                : `<p>We could not confirm your registration on <strong>${providerLabel}</strong> from the details you sent. <strong>You can submit again</strong> with corrected details — your place is not lost.</p>`}
              <div class="facts">
                <div><strong>Platform:</strong> ${providerLabel}</div>
                ${externalRef ? `<div><strong>Your reference:</strong> ${externalRef}</div>` : ""}
                ${isApproved && eventId ? `<div><strong>Your Ckript entry ID:</strong> ${eventId}</div>` : ""}
              </div>
              ${safeNote ? `<p><strong>Note from our team:</strong></p><div class="note">${safeNote}</div>` : ""}
              <div style="text-align:center">
                <a href="${actionUrl}" class="button">${isApproved ? "Open the challenge" : "Submit again"}</a>
              </div>
              <p style="color:#666;font-size:13px">If the button doesn't work, use this link:<br/><a href="${actionUrl}" style="color:#D14D37">${actionUrl}</a></p>
              <p>Regards,<br/><strong>Team ${CONTACTS.name}</strong></p>
            </div>
            <div class="footer">${signatureHtml()}
              <p>© 2026 ckript. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name},\n\n${isApproved
        ? `Your registration on ${providerLabel} has been confirmed. No payment is needed on Ckript — your entry is active.${eventId ? `\n\nYour Ckript entry ID: ${eventId}` : ""}`
        : `We could not confirm your registration on ${providerLabel} from the details you sent. You can submit again with corrected details.`}${safeNote ? `\n\nNote from our team: ${safeNote}` : ""}\n\n${actionUrl}\n\nTeam ${CONTACTS.name}${signatureText()}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`External registration ${decision} email sent to ${email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending external registration decision email:", error.message);
    return { success: false, error: error.message };
  }
};
