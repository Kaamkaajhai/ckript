import { execSync } from "node:child_process";

const DEFAULT_ALLOWED_ADMIN_BRANCHES = ["yashu", "ujju", "ujjunew", "master", "aman"];

let cachedRuntimeBranch;

const normalizeBranchName = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^refs\/heads\//, "");

const parseAllowedAdminBranches = () => {
  const configuredValue = String(process.env.ADMIN_ALLOWED_BRANCHES || "").trim();

  if (!configuredValue) {
    return DEFAULT_ALLOWED_ADMIN_BRANCHES;
  }

  const parsed = configuredValue
    .split(",")
    .map(normalizeBranchName)
    .filter(Boolean);

  if (!parsed.length) {
    return DEFAULT_ALLOWED_ADMIN_BRANCHES;
  }

  return Array.from(new Set(parsed));
};

const resolveBranchFromEnv = () => {
  const branchCandidates = [
    process.env.ADMIN_RUNTIME_BRANCH,
    process.env.GIT_BRANCH,
    process.env.BRANCH_NAME,
    process.env.GITHUB_REF_NAME,
    process.env.VERCEL_GIT_COMMIT_REF,
    process.env.CI_COMMIT_REF_NAME,
    process.env.BUILD_SOURCEBRANCHNAME,
  ];

  for (const candidate of branchCandidates) {
    const normalized = normalizeBranchName(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

const resolveBranchFromGit = () => {
  try {
    return normalizeBranchName(
      execSync("git rev-parse --abbrev-ref HEAD", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
    );
  } catch {
    return "";
  }
};

export const getAllowedAdminBranches = () => parseAllowedAdminBranches();

export const getCurrentRuntimeBranch = () => {
  if (cachedRuntimeBranch !== undefined) {
    return cachedRuntimeBranch;
  }

  cachedRuntimeBranch = resolveBranchFromEnv() || resolveBranchFromGit();
  return cachedRuntimeBranch;
};

export const getAdminBranchAccessStatus = () => {
  const allowedBranches = getAllowedAdminBranches();
  const currentBranch = getCurrentRuntimeBranch();
  const allowed = Boolean(currentBranch) && allowedBranches.includes(currentBranch);

  if (allowed) {
    return {
      allowed: true,
      currentBranch,
      allowedBranches,
    };
  }

  const resolvedBranch = currentBranch || "unknown";
  return {
    allowed: false,
    currentBranch: resolvedBranch,
    allowedBranches,
    message: `Admin access is restricted to branches: ${allowedBranches.join(", ")}. Current branch: ${resolvedBranch}.`,
  };
};
