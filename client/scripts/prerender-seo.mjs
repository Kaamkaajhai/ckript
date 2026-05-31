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

function cleanExistingSeo(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="(?:description|keywords|robots|author|application-name|apple-mobile-web-app-title|theme-color)"[^>]*>\s*/gi, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>\s*/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>\s*/gi, "");
}

function buildSeoHead(seo) {
  const keywords = (seo.keywords || defaultSeo.keywords).join(", ");
  const schemas = (seo.schemas || [])
    .map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join("\n");

  return `    <title>${escapeText(seo.title)}</title>
    <meta name="description" content="${escapeAttr(seo.description)}" />
    <meta name="keywords" content="${escapeAttr(keywords)}" />
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
