import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
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
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  } else {
    // Development fallback - use Gmail with enhanced settings
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
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
    
    // Verify transporter connection
    await transporter.verify();
    console.log('Email service verified successfully');

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
              
              <p>This code will expire in <strong>10 minutes</strong>.</p>
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
      text: `Hi ${name},\n\nThank you for signing up with ckript! Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account with ckript, please ignore this email.\n\nBest regards,\nThe ckript Team`,
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
