/**
 * The company's public-facing addresses — one place, three roles.
 *
 * These are what RECIPIENTS see. They are deliberately unrelated to EMAIL_USER, which is the SMTP
 * LOGIN and belongs to whatever mailbox provider actually accepts the connection (see mailFrom.js).
 * Conflating the two is what put a gmail address in front of users in the first place.
 *
 *   company — the company itself: the visible sender, template footers, legal pages, invoices.
 *   support — help, technical problems, anything a user is stuck on.
 *   contact — inbound enquiries: the contact form, partnerships, collaborations.
 *
 * Split by ROLE rather than reused as one address so a support reply, a partnership enquiry and a
 * system notice each land in the inbox that is staffed for them. When a template has to name an
 * address, pick by what the reader would be writing about — not by which key is nearest.
 *
 * Every value is env-overridable so a deployment can redirect one without a code change, and every
 * default is the production address, so an unconfigured environment still says something correct
 * rather than falling back to a placeholder that reaches nobody.
 *
 * ── Why these are GETTERS and not plain consts ──────────────────────────────────────────────────
 *
 * server.js calls dotenv.config() in its module BODY, but ES `import` statements are hoisted and
 * evaluated before any of that body runs — so at the moment this file is first evaluated, .env has
 * not been read and process.env holds none of it. A `const X = process.env.X || fallback` at module
 * top level therefore captures the FALLBACK, permanently, no matter what .env says.
 *
 * That is not hypothetical: invoicePdf.js and competitionCertificatePdf.js each did exactly that,
 * which is why invoices and certificates kept printing the old gmail address even though .env had
 * already been changed to COMPANY_EMAIL=info@ckript.com. Reading lazily, at call time, is what
 * makes the env actually reach the output.
 */

const env = (key, fallback) => {
  // .env in this project has been written with spaces around `=` and trailing whitespace more than
  // once. dotenv trims those, but a blank or whitespace-only value still survives as "" and would
  // otherwise beat the default — so treat blank as absent.
  const value = String(process.env[key] ?? "").trim();
  return value || fallback;
};

export const CONTACTS = {
  get company() { return env("COMPANY_EMAIL", "info@ckript.com"); },
  get support() { return env("SUPPORT_EMAIL", "support@ckript.com"); },
  get contact() { return env("CONTACT_EMAIL", "contact@ckript.com"); },
  /** No trailing slash — every use site appends its own path. */
  get website() { return env("COMPANY_WEBSITE", "https://ckript.com").replace(/\/+$/, ""); },
  /** The name recipients see in their inbox list, and the name templates sign off with. */
  get name() { return env("EMAIL_FROM_NAME", "CKRIPT"); },
};

/**
 * The company as it appears on a document: legal name, address, and who signs.
 *
 * These live here, as getters, for exactly the reason the block above does. invoicePdf.js carried a
 * comment explaining the import-hoisting trap and then declared `const COMPANY_LOCATION =
 * process.env.COMPANY_LOCATION || "Pune, Maharashtra, India"` on the next line — so the fix reached
 * the email address and skipped the three constants beneath it. Every invoice printed the Pune
 * address whatever the environment said, and setting COMPANY_LOCATION in .env would not have
 * changed a thing.
 */
export const COMPANY = {
  /** Legal name, as it should read on an invoice. */
  get name() { return env("COMPANY_NAME", "CKRIPT"); },
  /** Registered address, printed in the document footer. */
  get location() { return env("COMPANY_LOCATION", "Pune, Maharashtra, India"); },
  /** Who the authorised signature belongs to. */
  get founder() { return env("FOUNDER_NAME", "Yash"); },
};

/**
 * The block that closes every outgoing template.
 *
 * All three addresses appear together on purpose: a reader who needs a different desk should not
 * have to reply to the wrong one and wait to be forwarded. Kept as one string in one module so the
 * ~25 templates cannot drift apart the way the hardcoded addresses they replaced did.
 */
export const signatureHtml = () => `
              <p style="margin:0 0 4px 0;">Email: <a href="mailto:${CONTACTS.company}" style="color:inherit;">${CONTACTS.company}</a></p>
              <p style="margin:0 0 4px 0;">Support: <a href="mailto:${CONTACTS.support}" style="color:inherit;">${CONTACTS.support}</a></p>
              <p style="margin:0 0 4px 0;">Contact: <a href="mailto:${CONTACTS.contact}" style="color:inherit;">${CONTACTS.contact}</a></p>
              <p style="margin:0 0 12px 0;">Website: <a href="${CONTACTS.website}" style="color:inherit;">${CONTACTS.website}</a></p>`;

/** The same block for the plain-text alternative. Leading blank line included; no trailing one. */
export const signatureText = () =>
  `\n\nEmail: ${CONTACTS.company}\nSupport: ${CONTACTS.support}\nContact: ${CONTACTS.contact}\nWebsite: ${CONTACTS.website}`;

export default CONTACTS;
