import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSeoForPath, publicSeoRoutes } from "../src/seo/seoRoutes.js";

// Fails the build if any public route's prerendered dist HTML is missing or
// carries the wrong metadata. Guards against the failure mode where bots are
// silently served the SPA shell (homepage defaults) on marketing routes.

const distDir = resolve(process.cwd(), "dist");

function escapeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const failures = [];

for (const route of publicSeoRoutes) {
  const relative = route.path === "/" ? "index.html" : `${route.path.replace(/^\//, "")}/index.html`;
  const outputPath = resolve(distDir, relative);

  if (!existsSync(outputPath)) {
    failures.push(`${route.path}: missing ${relative}`);
    continue;
  }

  const html = readFileSync(outputPath, "utf8");
  const seo = getSeoForPath(route.path);
  const expectedTitle = `<title>${escapeText(seo.title)}</title>`;

  if (!html.includes(expectedTitle)) {
    failures.push(`${route.path}: title mismatch (expected "${seo.title}")`);
  }
  if (!html.includes(`rel="canonical" href="${seo.canonicalUrl}"`)) {
    failures.push(`${route.path}: canonical mismatch (expected ${seo.canonicalUrl})`);
  }
  if (!html.includes('application/ld+json')) {
    failures.push(`${route.path}: no JSON-LD schema present`);
  }
}

if (failures.length > 0) {
  console.error(`Prerender verification FAILED for ${failures.length} route(s):`);
  failures.forEach((line) => console.error(`  - ${line}`));
  process.exit(1);
}

console.log(`Prerender verification passed for ${publicSeoRoutes.length} public routes.`);
