export const WRITER_ROSTER_SOURCE_FIELDS = Object.freeze({
  name: 1,
  role: 1,
  bio: 1,
  profileImage: 1,
  "writerProfile.genres": 1,
  "writerProfile.wgaMember": 1,
  "writerProfile.sgaMember": 1,
  "writerProfile.representationStatus": 1,
  followers: 1,
});

export const WRITER_ROSTER_PUBLIC_FIELDS = Object.freeze({
  name: 1,
  role: 1,
  bio: 1,
  profileImage: 1,
  writerProfile: 1,
  scriptCount: 1,
  totalViews: 1,
  avgScore: 1,
  totalUnlocks: 1,
  followerCount: 1,
});

export const escapeWriterRosterSearch = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
