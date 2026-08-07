/**
 * The ticketing platforms an entrant may already have registered through.
 *
 * Mirrors server/utils/externalEventProviders.js — the SLUGS are the contract between the two, and
 * the server rejects anything not in its own list, so a slug added here alone simply fails.
 *
 * `refLabel` and `hint` differ per platform because each one names its identifier something else;
 * asking a Luma user for an "order number" gets you a blank field. `initials` and `color` drive the
 * fallback mark in components/ProviderMark.jsx — see there for why the real logos are not committed.
 *
 * Data only, no JSX: a module that exports both a component and constants breaks Fast Refresh for
 * every file that imports it.
 */
export const EXTERNAL_EVENT_PROVIDERS = [
  { slug: "luma", name: "Luma", refLabel: "Luma ticket or registration ID", hint: "e.g. evt-XXXX from your ticket email", initials: "L", color: "#6366F1" },
  { slug: "allevents", name: "AllEvents", refLabel: "AllEvents booking ID", hint: "on your booking confirmation", initials: "AE", color: "#F2542D" },
  { slug: "eventbrite", name: "Eventbrite", refLabel: "Eventbrite order number", hint: "9–10 digits on your order confirmation", initials: "E", color: "#F05537" },
  { slug: "unstop", name: "Unstop", refLabel: "Unstop registration ID", hint: "from your Unstop dashboard", initials: "U", color: "#1B4DFF" },
  { slug: "meraevents", name: "MeraEvents", refLabel: "MeraEvents booking ID", hint: "on your ticket", initials: "ME", color: "#E8590C" },
  { slug: "townscript", name: "Townscript", refLabel: "Townscript booking ID", hint: "starts with TS", initials: "TS", color: "#00B4A6" },
  { slug: "bookmyshow", name: "BookMyShow", refLabel: "BookMyShow booking ID", hint: "on your ticket SMS or email", initials: "BMS", color: "#C4242B" },
  { slug: "district", name: "District", refLabel: "District booking ID", hint: "on your booking confirmation", initials: "D", color: "#111827" },
  { slug: "filmfreeway", name: "FilmFreeway", refLabel: "FilmFreeway submission ID", hint: "on your submission page", initials: "FF", color: "#2BA3D6" },
];

const BY_SLUG = new Map(EXTERNAL_EVENT_PROVIDERS.map((p) => [p.slug, p]));

export const getProvider = (slug) => BY_SLUG.get(String(slug || "")) || null;
export const providerName = (slug) => getProvider(slug)?.name || String(slug || "—");

export default EXTERNAL_EVENT_PROVIDERS;
