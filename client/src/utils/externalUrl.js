/**
 * Make an admin-entered link safe to put in an href.
 *
 * People type "github.com", not "https://github.com". A bare host in an href is a RELATIVE url, so
 * a sponsor link on /hall-of-fame/x silently becomes /hall-of-fame/github.com — a 404 that looks
 * like a working link right up until it is clicked. Anything without a scheme gets https://.
 *
 * Returns "" for empty input so callers can decide whether to render a link at all; "#" would put a
 * focusable dead control in the tab order.
 *
 * javascript:, data: and vbscript: are dropped rather than prefixed — a stored URL is attacker-
 * controlled the moment an admin account is, and target="_blank" makes it a one-click script.
 */
const BLOCKED = /^(javascript|data|vbscript|file):/i;

const externalUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw || BLOCKED.test(raw)) return "";
  // Already absolute (http://, https://, mailto:, tel:) or protocol-relative — leave it alone.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) return raw;
  return `https://${raw}`;
};

export default externalUrl;
