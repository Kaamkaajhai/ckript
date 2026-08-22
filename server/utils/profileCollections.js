export const PROFILE_COLLECTION_SECTIONS = Object.freeze(["activity", "saved"]);
export const PROFILE_COLLECTION_PAGE_SIZE = 12;

const text = (value) => String(value ?? "").trim();

export function normalizeProfileCollectionQuery(query = {}) {
  const requestedSection = text(query.section).toLowerCase();
  const requestedSort = text(query.sort).toLowerCase();
  return {
    section: PROFILE_COLLECTION_SECTIONS.includes(requestedSection) ? requestedSection : "activity",
    page: Math.max(1, Number.parseInt(query.page, 10) || 1),
    limit: Math.min(20, Math.max(1, Number.parseInt(query.limit, 10) || PROFILE_COLLECTION_PAGE_SIZE)),
    query: text(query.q).slice(0, 100),
    sort: ["recent", "views", "title"].includes(requestedSort) ? requestedSort : "recent",
  };
}

export function profileCollectionMeta({ section, page, limit, total, own }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    section,
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    privateCollection: section === "saved" && !own,
  };
}

export function projectProfileActivityPost(post = {}) {
  return {
    _id: post._id,
    content: text(post.content),
    image: text(post.image),
    video: text(post.video),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    counts: {
      likes: Math.max(0, Number(post.likesCount ?? post.counts?.likes) || 0),
      comments: Math.max(0, Number(post.commentsCount ?? post.counts?.comments) || 0),
      saves: Math.max(0, Number(post.savesCount ?? post.counts?.saves) || 0),
    },
  };
}
