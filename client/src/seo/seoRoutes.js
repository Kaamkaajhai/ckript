import { defaultSeo, SITE_URL } from "./seoConfig.js";
import { blogPosts, genrePages, guidePages, marketingPages } from "./seoContent.js";
import {
  buildArticleSchema,
  buildBreadcrumbItems,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildProductSchema,
  buildSoftwareApplicationSchema,
  buildWebSiteSchema,
} from "./schemaUtils.js";
import { homepageFaqs } from "./seoContent.js";

export { defaultSeo, SITE_URL } from "./seoConfig.js";

export const aliasCanonicalMap = {
  "/privacy": "/privacy-policy",
  "/terms": "/terms-of-service",
  "/t-and-c": "/terms-of-service",
};

const staticSeoRoutes = [
  {
    path: "/",
    title: defaultSeo.title,
    description: defaultSeo.description,
    keywords: defaultSeo.keywords,
    changefreq: "daily",
    priority: "1.0",
    kind: "homepage",
  },
  {
    path: "/contact",
    title: "Contact Ckript",
    description:
      "Get in touch with Ckript for support, collaboration opportunities, and partnership questions.",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/about",
    title: "About Ckript | Secure Script Marketplace",
    description:
      "Learn how Ckript protects writers, streamlines script discovery, and connects creators with film industry professionals.",
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Ckript",
    description:
      "Read Ckript's privacy policy and learn how data is collected, used, and protected.",
    changefreq: "yearly",
    priority: "0.5",
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service | Ckript",
    description:
      "Review Ckript's terms of service, platform conditions, and user responsibilities.",
    changefreq: "yearly",
    priority: "0.5",
  },
  {
    path: "/registration-privacy-policy",
    title: "Registration Privacy Policy | Ckript",
    description:
      "Understand registration-specific privacy disclosures for creating a Ckript account.",
    changefreq: "yearly",
    priority: "0.4",
  },
  {
    path: "/terms-conditions",
    title: "Terms and Conditions | Ckript",
    description:
      "Read the terms and conditions for writers and investors using Ckript.",
    changefreq: "yearly",
    priority: "0.4",
  },
  {
    path: "/script-upload-terms",
    title: "Script Upload Terms and Conditions | Ckript",
    description:
      "Review the rules and policies for uploading scripts on Ckript.",
    changefreq: "yearly",
    priority: "0.4",
  },
];

const marketingSeoRoutes = marketingPages.map((page) => ({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
  changefreq: "monthly",
  priority: "0.9",
  kind: page.kind || "marketing",
}));

const programmaticRoutes = [
  ...Object.keys(genrePages).map((slug) => ({
    path: `/genre/${slug}`,
    changefreq: "weekly",
    priority: "0.8",
    kind: "genre",
  })),
  ...Object.keys(guidePages).map((path) => ({
    path,
    changefreq: "monthly",
    priority: "0.75",
    kind: "guide",
  })),
  ...blogPosts.map((post) => ({
    path: `/resources/blog/${post.slug}`,
    changefreq: "monthly",
    priority: "0.7",
    kind: "blog",
  })),
];

const seoRoutesByPath = new Map(
  [...staticSeoRoutes, ...marketingSeoRoutes].map((route) => [route.path, route]),
);

export const publicSeoRoutes = [
  ...staticSeoRoutes,
  ...marketingSeoRoutes,
  ...programmaticRoutes,
];

export const publicSeoPaths = publicSeoRoutes.map((route) => route.path);

// Authenticated and app-internal pages should not be indexed.
export const noIndexPrefixes = [
  "/login",
  "/join",
  "/signup",
  "/writer-onboarding",
  "/producer-director-onboarding",
  "/investor-onboarding",
  "/industry-onboarding",
  "/top-list",
  "/featured",
  "/trending",
  "/profile",
  "/dashboard",
  "/credits",
  "/purchase-requests",
  "/new-project",
  "/ai-tools",
  "/offer-holds",
  "/create-project",
  "/upload",
  "/search",
  "/script",
  "/mandates",
  "/writers",
  "/home",
  "/messages",
  "/reader",
  "/admin",
  "/api",
  "/auth",
  "/uploads",
];

export function resolveCanonicalPath(pathname) {
  return aliasCanonicalMap[pathname] || pathname;
}

export function getSeoForPath(pathname) {
  const canonicalPath = resolveCanonicalPath(pathname);
  const staticRoute = seoRoutesByPath.get(canonicalPath);

  if (staticRoute) {
    return buildSeoPayload({
      ...staticRoute,
      canonicalPath,
    });
  }

  const blogMatch = canonicalPath.match(/^\/resources\/blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    const post = blogPosts.find((item) => item.slug === slug);
    if (post) {
      return buildSeoPayload({
        path: canonicalPath,
        canonicalPath,
        title: `${post.title} | Ckript`,
        description: post.description,
        keywords: ["Ckript blog", "AI filmmaking", "script marketplace"],
        kind: "blog",
        blogPost: post,
      });
    }
  }

  const genreMatch = canonicalPath.match(/^\/genre\/([^/]+)$/);
  if (genreMatch) {
    const slug = genreMatch[1];
    const genre = genrePages[slug];
    if (genre) {
      return buildSeoPayload({
        path: canonicalPath,
        canonicalPath,
        title: genre.title,
        description: genre.description,
        keywords: ["script marketplace", `${slug} scripts`, "screenplay"],
        kind: "genre",
      });
    }
  }

  const guide = guidePages[canonicalPath];
  if (guide) {
    return buildSeoPayload({
      path: canonicalPath,
      canonicalPath,
      title: guide.title,
      description: guide.description,
      keywords: ["screenplay guide", "script pitching", "film funding"],
      kind: "guide",
    });
  }

  return buildSeoPayload({
    path: canonicalPath,
    canonicalPath,
    title: defaultSeo.title,
    description: defaultSeo.description,
    keywords: defaultSeo.keywords,
    kind: "fallback",
  });
}

function buildSeoPayload(route) {
  const breadcrumbs = buildBreadcrumbItems(route.canonicalPath || route.path || "/");
  const canonicalUrl = `${SITE_URL}${route.canonicalPath || route.path || "/"}`;
  const baseSchemas = [buildOrganizationSchema(), buildWebSiteSchema()];

  if (route.kind === "homepage") {
    baseSchemas.push(
      buildSoftwareApplicationSchema({
        name: "Ckript",
        description: defaultSeo.description,
        url: canonicalUrl,
      }),
      buildFaqSchema(homepageFaqs),
    );
  }

  if (route.kind === "blog" && route.blogPost) {
    baseSchemas.push(
      buildArticleSchema({
        headline: route.blogPost.title,
        description: route.blogPost.description,
        url: canonicalUrl,
        datePublished: route.blogPost.date,
        authorName: route.blogPost.author,
      }),
      buildBreadcrumbSchema(breadcrumbs),
    );
  }

  if (route.kind === "tool") {
    baseSchemas.push(
      buildSoftwareApplicationSchema({
        name: route.title,
        description: route.description,
        url: canonicalUrl,
      }),
    );
  }

  if (route.kind === "product") {
    baseSchemas.push(
      buildProductSchema({
        name: route.title,
        description: route.description,
        url: canonicalUrl,
      }),
    );
  }

  if (route.kind === "faq") {
    baseSchemas.push(buildFaqSchema(homepageFaqs));
  }

  return {
    title: route.title || defaultSeo.title,
    description: route.description || defaultSeo.description,
    keywords: route.keywords || defaultSeo.keywords,
    image: defaultSeo.image,
    kind: route.kind,
    canonicalPath: route.canonicalPath || route.path || "/",
    canonicalUrl,
    breadcrumbs,
    schemas: baseSchemas,
  };
}
