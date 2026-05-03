const WRITER_ROLES = new Set(["writer", "creator"]);
const INDUSTRY_ROLES = new Set(["investor", "producer", "director", "professional", "industry"]);

const hasText = (value) => typeof value === "string" && value.trim().length > 0;
const hasItems = (value) => Array.isArray(value) && value.filter(Boolean).length > 0;

const normalizeRole = (role) => String(role || "").toLowerCase().trim();

const hasCompleteAddress = (address = {}) =>
  hasText(address?.street) &&
  hasText(address?.city) &&
  hasText(address?.state) &&
  hasText(address?.zipCode) &&
  hasText(address?.country);

const buildCommonRequiredChecks = (user) => [
  hasText(user?.name),
  hasText(user?.email),
  hasText(user?.phone),
  Boolean(user?.emailVerified),
  hasCompleteAddress(user?.address),
];

const buildWriterRequiredChecks = (user) => {
  const writerProfile = user?.writerProfile || {};
  const diversity = writerProfile?.diversity || {};
  const hasWriterDiversityRegion = hasText(diversity?.nationality) || hasText(diversity?.ethnicity);

  return [
    hasText(writerProfile?.username),
    hasText(user?.bio),
    hasText(diversity?.gender),
    hasWriterDiversityRegion,
    hasItems(writerProfile?.genres),
    hasItems(writerProfile?.specializedTags),
  ];
};

const buildIndustryRequiredChecks = (user) => {
  const industryProfile = user?.industryProfile || {};

  return [
    hasText(user?.writerProfile?.username),
    hasText(user?.bio),
    hasText(industryProfile?.subRole),
    hasText(industryProfile?.company),
    hasText(industryProfile?.jobTitle),
    hasItems(industryProfile?.mandates?.genres),
    hasItems(industryProfile?.mandates?.formats),
  ];
};

export const getProfileCompletion = (user = {}) => {
  const role = normalizeRole(user?.role);
  const commonChecks = buildCommonRequiredChecks(user);

  const checks = [...commonChecks];

  if (WRITER_ROLES.has(role)) {
    checks.push(...buildWriterRequiredChecks(user));
  } else if (INDUSTRY_ROLES.has(role)) {
    checks.push(...buildIndustryRequiredChecks(user));
  }

  const totalFields = checks.length;
  const completedFields = checks.filter(Boolean).length;
  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

  return {
    percentage,
    completedFields,
    totalFields,
    isComplete: completedFields === totalFields,
  };
};
