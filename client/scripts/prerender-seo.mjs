import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defaultSeo, getSeoForPath, publicSeoRoutes } from "../src/seo/seoRoutes.js";

const distDir = resolve(process.cwd(), "dist");
const indexPath = resolve(distDir, "index.html");

if (!existsSync(indexPath)) {
  throw new Error("dist/index.html was not found. Run this script after vite build.");
}

const baseHtml = readFileSync(indexPath, "utf8");

function escapeAttr(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanSeoTagsOnce(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\s+name="(?:description|keywords|robots|author|application-name|apple-mobile-web-app-title|theme-color)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>\s*/gi, "");
}

/**
 * Remove the template's own SEO tags, repeating until the HTML stops changing.
 *
 * One sweep is not enough. Each pattern above consumes a whole tag, so a tag nested inside another —
 * `<met<meta name="description" content="x">a name="description" content="y">` — has its inner tag
 * eaten while the outer halves are left behind, and they rejoin into a live tag at a position the
 * sweep has already walked past. Every pattern here is global for the same reason: a non-global
 * `<title>` replace lets a second title survive a pass outright.
 *
 * That matters more here than in a runtime sanitiser: whatever this returns is written to disk as the
 * static HTML for a public route, so a stale <title> or description left in place ships as that
 * page's real SEO and is what crawlers index. Every pass either shortens the string or returns it
 * unchanged, so this terminates; the counter is a backstop, not an expected path. A normal
 * vite-built index.html reaches its fixpoint on the second pass with nothing left to remove.
 */
function cleanExistingSeo(html) {
  let text = String(html ?? "");
  for (let pass = 0; pass < 20; pass += 1) {
    const next = cleanSeoTagsOnce(text);
    if (next === text) return next;
    text = next;
  }
  return text;
}

function buildSeoHead(seo) {
  const schemas = (seo.schemas || [])
    .map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join("\n");

  return `    <title>${escapeText(seo.title)}</title>
    <meta name="description" content="${escapeAttr(seo.description)}" />
    <meta name="robots" content="index, follow" />
    <meta name="author" content="Ckript" />
    <meta name="application-name" content="Ckript" />
    <meta name="apple-mobile-web-app-title" content="Ckript" />
    <meta name="theme-color" content="${escapeAttr(defaultSeo.themeColor)}" />
    <link rel="canonical" href="${escapeAttr(seo.canonicalUrl)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Ckript" />
    <meta property="og:title" content="${escapeAttr(seo.title)}" />
    <meta property="og:description" content="${escapeAttr(seo.description)}" />
    <meta property="og:url" content="${escapeAttr(seo.canonicalUrl)}" />
    <meta property="og:image" content="${escapeAttr(seo.image || defaultSeo.image)}" />
    <meta property="og:locale" content="${escapeAttr(defaultSeo.locale)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(seo.title)}" />
    <meta name="twitter:description" content="${escapeAttr(seo.description)}" />
    <meta name="twitter:image" content="${escapeAttr(seo.image || defaultSeo.image)}" />
${schemas}`;
}

function htmlForRoute(route) {
  const seo = getSeoForPath(route.path);
  const cleaned = cleanExistingSeo(baseHtml);
  return cleaned.replace("</head>", `${buildSeoHead(seo)}\n  </head>`);
}

publicSeoRoutes.forEach((route) => {
  const routePath = route.path === "/" ? "/index.html" : `${route.path}/index.html`;
  const outputPath = resolve(distDir, routePath.replace(/^\//, ""));
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, htmlForRoute(route), "utf8");
});

console.log(`Prerendered SEO HTML for ${publicSeoRoutes.length} public routes.`);
