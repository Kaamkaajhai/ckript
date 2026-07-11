import DOMPurify from "dompurify";

/* Single trust boundary for writer-authored script HTML.
   Script content is authored by one user (the writer) and rendered in another
   user's browser (buyers, admins). Any path that turns that stored HTML back
   into live markup — dangerouslySetInnerHTML, document.write, innerHTML — MUST
   pass it through here first. Do not call DOMPurify ad hoc elsewhere; funnel
   through this module so the allow-list lives in exactly one place. */

// DOMPurify's defaults already drop <script>, event handlers (onerror, onclick),
// javascript: URLs, and other active content while keeping the formatting tags a
// screenplay uses. USE_PROFILES pins us to HTML so no SVG/MathML vectors sneak in.
export const sanitizeScriptHtml = (html) =>
  DOMPurify.sanitize(String(html ?? ""), { USE_PROFILES: { html: true } });

// For interpolating untrusted plain-text values (title, format, author name)
// into a raw HTML string — e.g. the print window's document.write template,
// where they land inside <title>/<h1> and there is no React to escape them.
export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
