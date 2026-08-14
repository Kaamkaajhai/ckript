import TopScriptsMobile from "../screens/discovery/TopScriptsMobile";

const scripts = [
  {
    _id: "top-1",
    title: "The Monsoon Archive",
    logline: "An archivist races a flood to preserve a town's last recorded memories.",
    genre: "Drama",
    contentType: "movie",
    views: 18420,
    platformScore: 92,
    scriptScore: { overall: 94 },
    engagementScore: 88,
    trendScore: 145,
    premium: true,
    price: 2400,
    verifiedBadge: true,
    creator: { _id: "writer-1", name: "Mira Sen", username: "mira" },
  },
  {
    _id: "top-2",
    title: "Signal at Platform Six",
    logline: "A late-night radio host receives tomorrow's emergency calls.",
    genre: "Thriller",
    contentType: "web_series",
    views: 7900,
    platformScore: 86,
    scriptScore: { overall: 89 },
    engagementScore: 81,
    trendScore: 121,
    creator: { _id: "writer-2", name: "Kabir Rao", username: "kabir" },
  },
];

export default function TopScriptsHarness({ user }) {
  return (
    <TopScriptsMobile
      user={user}
      previewData={{
        scripts,
        pagination: { page: 1, limit: 12, total: 14, hasMore: true },
      }}
    />
  );
}
