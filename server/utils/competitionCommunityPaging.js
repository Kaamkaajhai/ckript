import { asInt } from "./requestValue.js";

export const COMPETITION_COMMUNITY_PAGE_SIZE = 12;
export const COMPETITION_COMMUNITY_MAX_PAGE_SIZE = 24;

const scalar = (value) => (["string", "number"].includes(typeof value) ? value : undefined);

export const parseCompetitionCommunityPaging = (query = {}) => ({
  page: asInt(scalar(query?.page), { min: 1, max: 1000, fallback: 1 }),
  limit: asInt(scalar(query?.limit), {
    min: 1,
    max: COMPETITION_COMMUNITY_MAX_PAGE_SIZE,
    fallback: COMPETITION_COMMUNITY_PAGE_SIZE,
  }),
});

export const competitionPageInfo = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
  hasMore: page * limit < total,
});
