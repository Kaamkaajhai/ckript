/**
 * Who the mail claims to be from.
 *
 * This is deliberately SEPARATE from EMAIL_USER, which is the SMTP login. They started as one
 * variable, and that made the two things impossible to satisfy at once:
 *
 *   • Sending as info@ckript.com through a Gmail alias needs to LOG IN as the underlying Google
 *     mailbox while DISPLAYING the ckript.com address.
 *   • A transactional provider (Resend, Postmark, Mailgun, SES) uses an API key or a fixed username
 *     like "resend" as the login — never an address — so a From derived from it is not a valid
 *     sender at all.
 *
 * Defaults to EMAIL_USER so existing deployments keep working untouched: set EMAIL_FROM only when
 * the visible sender differs from the login.
 *
 * Note for whoever configures this: the address here must be one the SMTP account is actually
 * authorised to send as — a verified Gmail "send mail as" alias, or a domain verified with your
 * provider. Putting an unauthorised address here does not fail loudly; it lands the mail in spam,
 * because it breaks SPF/DKIM alignment.
 */
const FALLBACK = "noreply@ckript.com";

/** `"ckript" <address>`, ready for nodemailer's `from`. */
export const mailFrom = () => {
  const address = process.env.EMAIL_FROM || process.env.EMAIL_USER || FALLBACK;
  return `"ckript" <${address}>`;
};

export default mailFrom;
