/**
 * The ticketing platforms an entrant may already have registered through.
 *
 * A fixed list rather than free text, for three reasons: the admin queue can be filtered and counted
 * by platform, "Eventbrite" and "eventbrite" and "Event Brite" do not become three different things
 * in the data, and a reviewer knows what an ID from each one should look like.
 *
 * `refLabel` is what the entrant is actually asked for, because each platform calls it something
 * different — asking a Luma user for an "Order number" gets you a blank field.
 *
 * The client mirrors this list with brand marks in client/src/data/externalEventProviders.js. The
 * SLUGS are the contract between the two; keep them in step.
 */
export const EXTERNAL_EVENT_PROVIDERS = [
  { slug: "luma", name: "Luma", refLabel: "Luma ticket or registration ID" },
  { slug: "allevents", name: "AllEvents", refLabel: "AllEvents booking ID" },
  { slug: "eventbrite", name: "Eventbrite", refLabel: "Eventbrite order number" },
  { slug: "unstop", name: "Unstop", refLabel: "Unstop registration ID" },
  { slug: "meraevents", name: "MeraEvents", refLabel: "MeraEvents booking ID" },
  { slug: "townscript", name: "Townscript", refLabel: "Townscript booking ID" },
  { slug: "bookmyshow", name: "BookMyShow", refLabel: "BookMyShow booking ID" },
  { slug: "district", name: "District", refLabel: "District booking ID" },
  { slug: "filmfreeway", name: "FilmFreeway", refLabel: "FilmFreeway submission ID" },
];

export const PROVIDER_SLUGS = EXTERNAL_EVENT_PROVIDERS.map((p) => p.slug);

const BY_SLUG = new Map(EXTERNAL_EVENT_PROVIDERS.map((p) => [p.slug, p]));

/** The display name for a slug, or the slug itself so an email never prints "undefined". */
export const providerName = (slug) => BY_SLUG.get(String(slug || ""))?.name || String(slug || "a third-party platform");

export const isKnownProvider = (slug) => BY_SLUG.has(String(slug || ""));

export default { EXTERNAL_EVENT_PROVIDERS, PROVIDER_SLUGS, providerName, isKnownProvider };
