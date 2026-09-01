import User from "../models/User.js";
import { readUnsubscribeToken, UNSUBSCRIBE_CATEGORIES } from "../utils/unsubscribeToken.js";
import { escapeHtml } from "../utils/escapeHtml.js";

/**
 * Unsubscribing, from a link in an email.
 *
 * PUBLIC and sessionless by necessity. Someone clicking this is in their inbox, is probably not
 * signed in, and will not sign in to stop mail they did not want — they will press the spam button
 * instead, which costs the whole platform's deliverability rather than one address.
 *
 * Two entry points because mail clients and humans behave differently:
 *
 *   POST  RFC 8058 one-click. Gmail and Yahoo render their own "Unsubscribe" next to the sender when
 *         the message carries List-Unsubscribe-Post, and they POST here with no user interaction.
 *         It must succeed silently and immediately — no confirmation page, no redirect.
 *   GET   A person clicking the link in the body. Returns a small HTML page, because the alternative
 *         is bouncing them into the SPA, which needs a route, a bundle download and a render just to
 *         say "done".
 *
 * The GET is the reason this answers HTML rather than JSON. It is the only server-rendered page in
 * the product, and it is deliberate: an unsubscribe that depends on the client app booting is one
 * that fails for exactly the people most likely to be on a slow connection or an old mail client.
 */

/** Applied for both entry points. Idempotent: unsubscribing twice is a success, not an error. */
const applyUnsubscribe = async (token) => {
  const parsed = readUnsubscribeToken(token);
  if (!parsed) return { ok: false, reason: "invalid" };

  const user = await User.findById(parsed.userId).select("email name notificationPrefs").lean();
  if (!user) return { ok: false, reason: "unknown" };

  await User.updateOne(
    { _id: parsed.userId },
    { $set: { [`notificationPrefs.emailPreferences.${parsed.category}`]: false } }
  );

  console.info("[unsubscribe]", {
    userId: String(parsed.userId),
    category: parsed.category,
    at: new Date().toISOString(),
  });

  return { ok: true, category: parsed.category, email: user.email || "" };
};

/**
 * POST /api/unsubscribe — RFC 8058 one-click.
 *
 * The mail client sends `List-Unsubscribe=One-Click` in the body and expects a 2xx. It shows the
 * user nothing, so anything rendered here is wasted; what matters is that it never fails for a
 * reason the recipient could not have controlled.
 *
 * Answers 200 even for a token we cannot place. A 4xx makes Gmail show "unsubscribe failed", the
 * recipient concludes the sender is ignoring them, and the next step is the spam button — which is
 * a far worse outcome than quietly accepting a link we can no longer resolve.
 */
export const oneClickUnsubscribe = async (req, res) => {
  try {
    const token = String(req.query?.token || req.body?.token || "");
    const result = await applyUnsubscribe(token);
    if (!result.ok) {
      console.warn("[unsubscribe] one-click could not be applied:", result.reason);
    }
    return res.status(200).json({ unsubscribed: result.ok });
  } catch (error) {
    console.error("[unsubscribe] one-click failed:", error?.message || error);
    // Still a 200, for the reason above.
    return res.status(200).json({ unsubscribed: false });
  }
};

const page = (title, body) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
         font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,sans-serif;
         background:#fbfaf9; color:#1c1615; }
  main { max-width:34rem; background:#fff; border:1px solid #e6e1dd; border-radius:14px; padding:36px; }
  h1 { margin:0 0 12px; font-size:24px; letter-spacing:-0.01em; }
  p { margin:0 0 12px; color:#4a4341; }
  a { color:#7a2233; }
  .muted { color:#6f6764; font-size:14px; }
  @media (prefers-color-scheme: dark) {
    body { background:#0f0d0d; color:#f5f2eb; }
    main { background:#171414; border-color:#2b2626; }
    p { color:#c9c2bd; } .muted { color:#9c9491; } a { color:#e3a7b1; }
  }
</style>
</head><body><main>${body}</main></body></html>`;

const CATEGORY_LABEL = {
  marketing: "announcements and updates",
  system: "account and system notices",
  messages: "message notifications",
};

/**
 * GET /api/unsubscribe?token=... — the human path.
 *
 * Acts immediately rather than asking "are you sure?". The click already WAS the confirmation, and a
 * second step is one more thing to fail for someone who has decided. Resubscribing is a link away in
 * their notification settings, and that asymmetry is the right one: the cost of an accidental
 * unsubscribe is far lower than the cost of an unsubscribe that did not work.
 */
export const unsubscribePage = async (req, res) => {
  try {
    const result = await applyUnsubscribe(String(req.query?.token || ""));

    if (!result.ok) {
      return res.status(200).type("html").send(page("Unsubscribe", `
        <h1>This link is no longer valid</h1>
        <p>It may have been altered in transit, or the account it belonged to has since been removed.</p>
        <p class="muted">If you are still receiving mail you did not ask for, reply to any of it and a
        person will take care of it.</p>
      `));
    }

    const what = CATEGORY_LABEL[result.category] || "these emails";
    return res.status(200).type("html").send(page("Unsubscribed", `
      <h1>You're unsubscribed</h1>
      <p>${escapeHtml(result.email)} will no longer receive ${escapeHtml(what)} from Ckript.</p>
      <p class="muted">This does not affect messages you need for your account — password resets,
      receipts and anything you have specifically asked for still arrive.</p>
      <p class="muted">Changed your mind? Turn it back on under Notifications in your profile settings.</p>
    `));
  } catch (error) {
    console.error("[unsubscribe] page failed:", error?.message || error);
    return res.status(500).type("html").send(page("Unsubscribe", `
      <h1>Something went wrong</h1>
      <p>We could not update your preferences just now. Please try the link again in a few minutes.</p>
    `));
  }
};

/** Exported for the mail layer: which users still accept this category. */
export const filterSubscribed = (users = [], category = "marketing") => {
  if (!UNSUBSCRIBE_CATEGORIES.includes(category)) return users;
  return users.filter((u) => u?.notificationPrefs?.emailPreferences?.[category] !== false);
};
