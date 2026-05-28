import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SITE_URL } from "../src/seo/seoConfig.js";
import { blogPosts } from "../src/seo/seoContent.js";

const siteUrl = (process.env.SITE_URL || SITE_URL).replace(/\/$/, "");
const buildItem = (post) => {
  const url = `${siteUrl}/resources/blog/${post.slug}`;
  const pubDate = new Date(post.date).toUTCString();
  return `  <item>\n    <title>${escapeXml(post.title)}</title>\n    <link>${url}</link>\n    <guid isPermaLink="true">${url}</guid>\n    <description>${escapeXml(post.description)}</description>\n    <pubDate>${pubDate}</pubDate>\n  </item>`;
};

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const items = (blogPosts || [])
  .map(buildItem)
  .join("\n");

const channel = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>Ckript Blog</title>\n  <link>${siteUrl}</link>\n  <description>Latest articles from Ckript</description>\n${items}\n</channel>\n</rss>\n`;

const outputPath = resolve(process.cwd(), "public", "feed.xml");
writeFileSync(outputPath, channel, "utf8");
console.log(`Generated RSS feed: ${outputPath}`);
