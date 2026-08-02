import { CONTACTS } from "./companyContacts.js";

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
 * So EMAIL_USER is NOT in the chain below. It was, and the fallback quietly won: the .env in this
 * project configures the visible sender as EMAIL_FROM_ADDRESS, a key this file did not read, so
 * every message resolved past it to EMAIL_USER and went out under the login address instead.
 * EMAIL_FROM_ADDRESS is checked first because that is the key actually in use; EMAIL_FROM stays
 * accepted so a deployment configured with either name keeps working.
 *
 * Note for whoever configures this: the address here must be one the SMTP account is actually
 * authorised to send as — a verified Gmail "send mail as" alias, or a domain verified with your
 * provider. Putting an unauthorised address here does not fail loudly; it lands the mail in spam,
 * because it breaks SPF/DKIM alignment.
 */

const fromAddress = () => {
  const configured = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM;
  return String(configured ?? "").trim() || CONTACTS.company;
};

/** `CKRIPT <info@ckript.com>`, ready for nodemailer's `from`. */
export const mailFrom = () => `"${CONTACTS.name}" <${fromAddress()}>`;

export default mailFrom;
