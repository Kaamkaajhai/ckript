import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";
import mailFrom from "./mailFrom.js";
import { CONTACTS, signatureHtml, signatureText } from "./companyContacts.js";
import { escapeHtml } from "./escapeHtml.js";

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
  actionToken = "",
}) => {
  if (!userId) return null;

  try {
    return await Notification.create({
      user: userId,
      type,
      from,
      script,
      message,
      actionToken: String(actionToken || "").trim().slice(0, 256),
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
  // Optional nodemailer attachments ({ filename, content, contentType }). The competition results
  // mail carries the entrant's certificate this way.
  attachments = [],
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
      attachments: Array.isArray(attachments) && attachments.length ? attachments : undefined,
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

/**
 * The judge's set-password link.
 *
 * An email cannot follow a relative path, so this is the one place the invite becomes an absolute
 * URL. The admin console builds its own from window.location.origin precisely to avoid depending on
 * these env vars; here there is no browser to ask, so resolveClientBaseUrl's fallback chain is used.
 *
 * Names are escaped: they are admin-entered free text landing in an HTML document.
 */
export const sendJudgeInviteEmail = async ({ to, name, invitePath, competitionName = "" }) => {
  const url = `${resolveClientBaseUrl()}${invitePath}`;
  const safeName = escapeHtml(name || "there");
  const context = competitionName
    ? `<p>You have been invited to judge <strong>${escapeHtml(competitionName)}</strong> on Ckript.</p>`
    : "<p>You have been invited to judge on Ckript.</p>";

  return sendEmailNotification({
    to,
    subject: "Your Ckript judging account",
    html: `
      <p>Hi ${safeName},</p>
      ${context}
      <p>Use the link below to choose your password. <strong>Nobody else sees it</strong> — not even the organiser who invited you.</p>
      <p><a href="${url}">Set your password</a></p>
      <p>This link works once and expires in 72 hours. If it has expired, ask the organiser for a new one.</p>
    `,
    text: `Hi ${name || "there"},\n\n${competitionName ? `You have been invited to judge "${competitionName}" on Ckript.` : "You have been invited to judge on Ckript."}\n\nChoose your password here (nobody else sees it, not even the organiser):\n${url}\n\nThis link works once and expires in 72 hours.`,
  });
};

/** Told they are on a panel. Sent on assignment, separately from the account invite. */
export const sendJudgeAssignmentEmail = async ({ to, name, competitionName }) => {
  const url = `${resolveClientBaseUrl()}/judge`;
  const safeName = escapeHtml(name || "there");
  const safeCompetition = escapeHtml(competitionName || "a competition");

  return sendEmailNotification({
    to,
    subject: `You have been added to the judging panel for ${competitionName || "a competition"}`,
    html: `
      <p>Hi ${safeName},</p>
      <p>You have been added to the judging panel for <strong>${safeCompetition}</strong>.</p>
      <p>Entries are shown to you anonymously — an entry code, the title and the script, never the writer.</p>
      <p><a href="${url}">Open your judging console</a></p>
    `,
    text: `Hi ${name || "there"},\n\nYou have been added to the judging panel for "${competitionName || "a competition"}".\n\nEntries are shown to you anonymously — an entry code, the title and the script, never the writer.\n\nOpen your judging console: ${url}`,
  });
};
