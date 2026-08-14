import FeaturedProjectsMobile from "../screens/discovery/FeaturedProjectsMobile";

/*
 * A deterministic Featured screen for the five-width sweep.
 *
 * The live route cannot be measured twice and get the same answer: it settles
 * two endpoints independently, and a spotlight's membership of shelf 01 is a
 * comparison against the wall clock. So the fixture's spotlight window is
 * dated FORWARD from render time rather than pinned to a literal date — a
 * hard-coded 2026 timestamp would quietly expire and the sweep would start
 * measuring the no-spotlight fallback while still reporting the spotlight
 * state, which is the "a sweep only measures what it rendered" trap the
 * ledger already records twice.
 */
const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();

const spotlights = [
  {
    _id: "featured-1",
    title: "The Monsoon Archive",
    logline: "An archivist races a flood to preserve a town's last recorded memories.",
    genre: "Drama",
    contentType: "movie",
    pageCount: 112,
    views: 18420,
    readsCount: 2100,
    scriptScore: { overall: 94 },
    premium: true,
    price: 240000,
    verifiedBadge: true,
    trailerUrl: "",
    scriptCompletion: { status: "complete" },
    promotion: { spotlightActive: true, spotlightEndAt: inDays(19) },
    services: { evaluation: true, aiTrailer: true },
    creator: { _id: "writer-1", name: "Mira Sen", username: "mira" },
  },
  {
    _id: "featured-2",
    title: "Signal at Platform Six",
    logline: "A late-night radio host receives tomorrow's emergency calls.",
    genre: "Thriller",
    contentType: "web_series",
    pageCount: 58,
    views: 7900,
    readsCount: 640,
    scriptScore: { overall: 89 },
    scriptCompletion: { status: "ongoing", completedParts: 3, totalParts: 10 },
    promotion: { spotlightActive: true, spotlightEndAt: inDays(4) },
    services: { evaluation: true },
    creator: { _id: "writer-2", name: "Kabir Rao", username: "kabir" },
  },
];

const ranked = [
  ...spotlights,
  {
    _id: "featured-3",
    title: "A Quiet Ledger",
    logline: "A small-town accountant finds her own name in a decade of falsified books.",
    genre: "Mystery",
    contentType: "movie",
    pageCount: 98,
    views: 3120,
    readsCount: 180,
    scriptScore: { overall: 77 },
    premium: false,
    creator: { _id: "writer-3", name: "Devika Nair", username: "devika" },
  },
];

export default function FeaturedHarness({ user }) {
  return (
    <FeaturedProjectsMobile
      user={user}
      previewData={{
        featured: { scripts: spotlights, pagination: { page: 1, limit: 12, total: 2, hasMore: false } },
        ranked: { scripts: ranked, pagination: { page: 1, limit: 12, total: 14, hasMore: true } },
      }}
    />
  );
}
