import { ROUTES } from "../../_shared/theme";

/* Footer link columns. Each link is one of:
   • { to }             → internal route (react-router Link)
   • { to, external }   → external URL (opens in a new tab)
   • { action }         → opens a modal: "producer" | "writer" |
                          "about" | "pricing" (handled in Footer.jsx) */
export const FOOTER_COLS = [
  {
    head: "Platform",
    links: [
      { label: "Scripts", to: ROUTES.join },
      { label: "For Producers", action: "producer" },
      { label: "For Writers", action: "writer" },
    ],
  },
  {
    head: "Company",
    links: [
      { label: "About", action: "about" },
      { label: "Pricing", action: "pricing" },
      { label: "Contact", to: ROUTES.contact },
      { label: "LinkedIn", to: ROUTES.linkedin, external: true },
    ],
  },
  {
    head: "Legal",
    links: [
      { label: "Privacy", to: ROUTES.privacy },
      { label: "Terms", to: ROUTES.terms },
    ],
  },
];
