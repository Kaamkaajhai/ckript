import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";
import mailFrom from "./mailFrom.js";
import { CONTACTS, signatureHtml, signatureText } from "./companyContacts.js";

let cachedTransporter = null;

const trimTrailingSlash = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const resolveClientBaseUrl = () => {
  const base =
    trimTrailingSlash(process.env.PUBLIC_CLIENT_URL)
    || trimTrailingSlash(process.env.CLIENT_URL)
    || trimTrailingSlash(process.env.FRONTEND_URL)
    || trimTrailingSlash(process.env.APP_URL);

  if (!base) return "https://ckript.com";
  if (/^https?:\/\//i.test(base)) return base;
  return `https://${base}`;
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const emailUser = String(process.env.EMAIL_USER || "").trim();
  const emailPassword = String(process.env.EMAIL_PASSWORD || "").replace(/\s+/g, "");
  if (!emailUser || !emailPassword) {
    return null;
  }

  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: emailUser, pass: emailPassword },
    });
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: emailUser, pass: emailPassword },
    tls: { rejectUnauthorized: false },
  });

  return cachedTransporter;
};

export const createNotification = async ({
  userId,
  type = "collab_update",
  from = null,
  script = null,
  message = "",
}) => {
  if (!userId) return null;

  try {
    return await Notification.create({
      user: userId,
      type,
      from,
      script,
      message,
    });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }
};

/**
 * The generic sender every controller reaches for, so the contact signature is appended HERE rather
 * than in each caller — four call sites today, and any future one gets it without remembering to.
 * Callers pass HTML fragments, not whole documents, but the `</body>` case is handled anyway so a
 * caller that later passes a full document does not end up with the block outside the body.
 */
const withSignature = (body = "", append) => {
  const source = String(body || "");
  if (!source.trim()) return source;
  return source.includes("</body>")
    ? source.replace("</body>", `${append}\n</body>`)
    : source + append;
};

export const sendEmailNotification = async ({
  to,
  subject,
  html,
  text,
}) => {
  const transporter = getTransporter();
  if (!transporter || !to) {
    return { success: false, skipped: true };
  }

  try {
    const info = await transporter.sendMail({
      from: mailFrom(),
      to,
      subject,
      html: withSignature(html, `\n<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />\n<div style="color:#6b7280;font-size:12px;line-height:1.7;">\n              <p style="margin:0 0 8px 0;">Regards,<br/><strong>Team ${CONTACTS.name}</strong></p>${signatureHtml()}\n</div>`),
      text: withSignature(text, `\n\nRegards,\nTeam ${CONTACTS.name}${signatureText()}`),
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send email notification:", error.message);
    return { success: false, error: error.message };
  }
};

export const sendInviteEmail = async ({ to, recipientName, scriptTitle, token, role, message = "" }) => {
  const inviteUrl = `${resolveClientBaseUrl()}/invite/${token}`;
  const safeRecipient = recipientName || "there";
  const note = message ? `<p><strong>Message:</strong> ${message}</p>` : "";

  return sendEmailNotification({
    to,
    subject: `Invitation to collaborate on ${scriptTitle}`,
    html: `
      <p>Hi ${safeRecipient},</p>
      <p>You've been invited to join <strong>${scriptTitle}</strong> as a <strong>${role}</strong> on ckript.</p>
      ${note}
      <p><a href="${inviteUrl}">Accept invitation</a></p>
      <p>This invite expires in 72 hours.</p>
    `,
    text: `Hi ${safeRecipient},\n\nYou've been invited to join "${scriptTitle}" as a ${role} on ckript.\n${message ? `Message: ${message}\n\n` : ""}Accept invitation: ${inviteUrl}\n\nThis invite expires in 72 hours.`,
  });
};
