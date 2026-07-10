import scenewayLogo from "../../../../assets/ckript-landing/sceneway-logo.png";
import shaikeLogo from "../../../../assets/ckript-landing/shaike-logo.png";

/* The two production partners featured in the Partners section. Copy is
   verbatim from the design handoff and intentionally avoids em dashes.

   • kicker  — short label on the section card
   • tag     — longer label in the modal kicker row
   • cardLogo / logoHeight — per-brand optical sizing (the two wordmarks
     have very different aspect ratios, so they need different scales to
     balance on the dark plate)
   • accent  — the brand bar pinned to the bottom of the logo plate */
export const PARTNERS = {
  sceneway: {
    name: "Sceneway Films",
    logo: scenewayLogo,
    logoHeight: 138,
    kicker: "Cairo · MENA Production",
    tag: "Cairo · MENA Production House",
    cardLogo: { maxHeight: "82%", maxWidth: "66%" },
    accent: "linear-gradient(90deg,#E8B23A,#F6D06A)",
    desc: "Sceneway Films is a Cairo-based production house dedicated to redefining visual storytelling in the MENA region. It specializes in high-quality cinematic films, TV series, and pioneering vertical micro-dramas for digital platforms.",
    pull: "From gripping psychological thrillers to engaging short-form content, its mission is to turn compelling scripts into unforgettable visual experiences.",
    site: "belalelaraby.com",
    href: "https://belalelaraby.com",
  },
  shaike: {
    name: "SHAIKE",
    logo: shaikeLogo,
    logoHeight: 90,
    kicker: "Global · AI Filmmaking",
    tag: "Global · AI Filmmaking Network",
    cardLogo: { maxHeight: "56%", maxWidth: "74%" },
    accent: "linear-gradient(90deg,#5FD6A6,#8FA8F0)",
    desc: "SHAIKE is the quality reference for the AI filmmaking era: a curated global network of 400 of the world’s best AI filmmakers, a prestigious film festival, and a growing catalogue of work that proves what the medium can do.",
    pull: "Taste over volume. Craft over hype.",
    site: "shaike.ai",
    href: "http://www.shaike.ai/",
  },
};

/* Tab order in the modal. */
export const PARTNER_KEYS = ["sceneway", "shaike"];
