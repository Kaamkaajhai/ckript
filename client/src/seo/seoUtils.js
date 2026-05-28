export function normalizePath(path = "/") {
  if (!path) return "/";
  const p = String(path).split("?")[0].split("#")[0];
  return p.endsWith("/") && p !== "/" ? p.slice(0, -1) : p;
}

export function buildKeywords(...terms) {
  const seen = new Set();
  const out = [];
  terms.flat(Infinity).forEach((t) => {
    if (!t) return;
    const parts = String(t).split(",").map((s) => s.trim()).filter(Boolean);
    parts.forEach((p) => {
      const low = p.toLowerCase();
      if (!seen.has(low)) {
        seen.add(low);
        out.push(p);
      }
    });
  });
  return out.slice(0, 20);
}

export function absoluteUrl(siteUrl, path) {
  if (!path) return siteUrl;
  return path.startsWith("http") ? path : `${siteUrl}${path}`;
}

export default { normalizePath, buildKeywords, absoluteUrl };
