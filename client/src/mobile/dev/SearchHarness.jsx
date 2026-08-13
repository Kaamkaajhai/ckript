import SearchMobile from "../screens/discovery/SearchMobile";

const creator = (id, name, username, genres) => ({
  _id: id,
  name,
  username,
  role: "writer",
  profileImage: "",
  followerCount: id === "writer-1" ? 1240 : 386,
  writerProfile: { username, genres },
});

const people = [
  creator("writer-1", "Mira Sen", "mira_sen", ["Drama", "Mystery"]),
  creator("writer-2", "Kabir Mehta", "kabir", ["Thriller", "Crime"]),
];

const projects = [
  {
    _id: "project-1",
    title: "The Last Local",
    logline: "Two strangers board Mumbai’s final train and discover they are running from the same secret.",
    genre: "Drama",
    contentType: "movie",
    premium: true,
    price: 2400,
    views: 12800,
    scriptScore: { overall: 91 },
    verifiedBadge: true,
    creator: people[0],
  },
  {
    _id: "project-2",
    title: "Monsoon Ledger",
    logline: "An auditor follows a missing payment into a town that has erased an entire rainy season.",
    genre: "Mystery",
    contentType: "web_series",
    premium: false,
    views: 7800,
    scriptScore: { overall: 84 },
    creator: people[1],
  },
];

const previewData = {
  users: people,
  scripts: projects,
  pagination: {
    page: 1,
    limit: 10,
    users: { total: 6, hasMore: true },
    scripts: { total: 8, hasMore: true },
  },
};

export default function SearchHarness({ user }) {
  return <SearchMobile user={user} previewData={previewData} />;
}
