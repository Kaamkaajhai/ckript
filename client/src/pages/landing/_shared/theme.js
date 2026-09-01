

/* ─────────────────────────────────────────────────────────────
   Ckript Landing — shared design tokens.

   These are the single source of truth for the landing palette and
   type stacks. They exist in two mirrored forms on purpose:

   • The JS constants below are for values consumed by JSX props and
     inline styles that can't reach CSS (e.g. an <Icon color={RED}>,
     a canvas fill, a data-driven gradient).
   • The exact same values are declared as CSS custom properties on
     `.ckl` in landing.css (--ck-ink, --ck-red, --ck-sans, …) for use
     inside every section stylesheet.

   Keep the two in sync. If you change a colour here, change it there.
   ───────────────────────────────────────────────────────────── */

export const INK = "#0B0A06";
export const RED = "#D14D37";
export const SANS = "'Helvetica Neue',Arial,sans-serif";
export const SERIF = "'Baskervville',Georgia,serif";
export const BODY = "'PT Serif',Georgia,serif";

export const LOGO_SRC = "/ckript-logo-landscape-nobg.png";
export const LOGO_FOOTER_SRC = "/ckript_logo_no_bg.png";
export const TRAILER_VIDEO_SRC = "/nexara-trailer.MP4";

/* Destinations carried over from the previous landing page. */
export const ROUTES = {
  home: "/",
  writer: "/writer-onboarding",
  pro: "/producer-director-onboarding",
  // The competition hub — the application surface. Marketing traffic goes to `challenges` below;
  // the hub is where that page's CTAs land, and where the signed-in rail still points.
  challenge: "/challenge",
  // The landing-register overview page. The marketing nav points HERE, never at the hub:
  // a first-time visitor gets the pitch before the console.
  challenges: "/challenges",
  pricing: "/pricing",
  login: "/login",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy-policy",
  terms: "/terms-of-service",
  linkedin: "https://www.linkedin.com/company/ckript/?viewAsMember=true",
};
