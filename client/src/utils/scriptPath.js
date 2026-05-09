const toHeadingSegment = (value = "") =>
  String(value || "")
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const toUsernameSegment = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "");

export const getScriptCanonicalPath = (script = {}) => {
  const readyPath = String(script?.canonicalPath || "").trim();
  if (readyPath) {
    return readyPath.startsWith("/") ? readyPath : `/${readyPath}`;
  }

  const scriptId = String(script?._id || script?.id || "").trim();
  const projectHeading = toHeadingSegment(script?.title || script?.projectHeading || "");
  const writerUsername = toUsernameSegment(
    script?.creator?.writerProfile?.username ||
      script?.creator?.username ||
      script?.creatorUsername ||
      script?.writerUsername ||
      ""
  );

  if (projectHeading && writerUsername) {
    return `/${encodeURIComponent(projectHeading)}/${encodeURIComponent(writerUsername)}`;
  }

  return scriptId ? `/script/${scriptId}` : "/script";
};

export const normalizeHeadingSegment = toHeadingSegment;
export const normalizeWriterSegment = toUsernameSegment;
