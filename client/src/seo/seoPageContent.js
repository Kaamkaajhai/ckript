import { blogPosts, genrePages, guidePages, marketingPages } from "./seoContent";
import { getInternalLinksForSeoPage } from "./internalLinks";
import { getSeoForPath } from "./seoRoutes";

const NOT_FOUND_CONTENT = Object.freeze({
  h1: "This page is not in the Ckript library",
  eyebrow: "Page not found",
  description: "The address may be incomplete or the content may have moved.",
  sections: [],
  links: ["/features", "/for", "/resources", "/tools"],
});

const SEO_CONTENT_ROUTE_PATTERNS = Object.freeze([
  /^\/features(?:\/[^/]+)?$/,
  /^\/for(?:\/[^/]+)?$/,
  /^\/industries(?:\/[^/]+)?$/,
  /^\/resources(?:\/[^/]+)?$/,
  /^\/resources\/blog(?:\/[^/]+)?$/,
  /^\/tools(?:\/[^/]+)?$/,
  /^\/faq$/,
  /^\/genre\/[^/]+$/,
  ...Object.keys(guidePages).map((path) => new RegExp(`^${path}$`)),
]);

export function titleFromPath(pathname) {
  const last = String(pathname || "").split("/").filter(Boolean).pop() || "Ckript";
  return last
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getSeoPageContent(pathname) {
  const marketing = marketingPages.find((page) => page.path === pathname);
  if (marketing) return marketing;

  const blogMatch = pathname.match(/^\/resources\/blog\/([^/]+)$/);
  if (blogMatch) {
    const post = blogPosts.find((item) => item.slug === blogMatch[1]);
    if (post) {
      return {
        h1: post.title,
        eyebrow: "Ckript Blog",
        sections: [
          post.description,
          "Ckript helps entertainment teams connect article insights to practical workflows across AI script analysis, marketplace discovery, producer matching, and investor readiness.",
          "Use this topic cluster to move from learning into action with relevant tools, guides, and marketplace pages.",
        ],
        links: ["/features/ai-script-analysis", "/features/script-marketplace", "/tools/screenplay-analyzer"],
      };
    }
  }

  const genreMatch = pathname.match(/^\/genre\/([^/]+)$/);
  if (genreMatch) {
    const genre = genrePages[genreMatch[1]];
    if (genre) {
      return {
        h1: titleFromPath(pathname),
        eyebrow: "Genre",
        sections: [
          genre.description,
          "Ckript supports genre-aware script discovery with metadata, AI analysis, pitch context, and connections across writers, producers, directors, and investors.",
        ],
        links: ["/features/script-marketplace", "/features/ai-concept-trailer", "/for/producers"],
      };
    }
  }

  const guide = guidePages[pathname];
  if (guide) {
    return {
      h1: guide.title.replace(" | Ckript", ""),
      eyebrow: "Guide",
      sections: [
        guide.description,
        "Ckript turns script education into execution by connecting writing, analysis, pitching, discovery, and deal workflows.",
      ],
      links: ["/resources/screenplay-guide", "/features/producer-matching", "/tools/screenplay-analyzer"],
    };
  }

  return null;
}

export function isSeoContentRoutePath(pathname) {
  return SEO_CONTENT_ROUTE_PATTERNS.some((pattern) => pattern.test(String(pathname || "")));
}

export function isMissingSeoContentPath(pathname) {
  return isSeoContentRoutePath(pathname) && !getSeoPageContent(pathname);
}

export function resolveSeoPageContent(pathname) {
  const seo = getSeoForPath(pathname);
  const canonicalPath = seo.canonicalPath || pathname;
  const resolved = getSeoPageContent(canonicalPath);
  const found = Boolean(resolved);
  const content = resolved || NOT_FOUND_CONTENT;
  const smartLinks = found
    ? [...new Set([...(content.links || []), ...getInternalLinksForSeoPage(seo)])].slice(0, 8)
    : [...content.links];

  return {
    content,
    found,
    seo,
    smartLinks,
  };
}
