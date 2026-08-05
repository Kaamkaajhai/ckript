// Escaping for values interpolated into notification email HTML.
//
// Everything the mailers put into a template is free text somebody typed: a writer's display name, a
// competition name, a script title, an admin's award title. Dropped into HTML raw, an apostrophe or a
// stray `<` mangles the mail at best, and anything tag-shaped is carried straight into the
// recipient's inbox — a stored-XSS payload delivered by us, over email, where no CSP protects
// anyone. Emails are assembled by string concatenation with no templating engine to escape for us,
// so every interpolation has to come through here.
//
// Plain-text bodies and subject lines are NOT escaped: they are not HTML, and escaping them would
// just show the entities to the reader.

const REPLACEMENTS = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

// One pass over the string, so the `&` of an entity this function just wrote is never escaped again.
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => REPLACEMENTS[ch]);

export default escapeHtml;
