import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_URL } from "../src/seo/seoConfig.js";
import { publicSeoRoutes } from "../src/seo/seoRoutes.js";

const siteUrl = (process.env.SITE_URL || SITE_URL).replace(/\/$/, "");
const today = new Date().toISOString().split("T")[0];

const urlEntries = (publicSeoRoutes || [])
  .map((route) => {
    const routePath = route.path === "/" ? "" : route.path;
    const lastmod = route.lastmod || today;
    return `  <url>\n    <loc>${siteUrl}${routePath}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${route.changefreq || "monthly"}</changefreq>\n    <priority>${route.priority || "0.5"}</priority>\n  </url>`;
  })
  .join("\n");

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;

const outputPath = resolve(process.cwd(), "public", "sitemap.xml");
writeFileSync(outputPath, sitemapContent, "utf8");

console.log(`Generated sitemap: ${outputPath}`);