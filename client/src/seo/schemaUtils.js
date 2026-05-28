import { orgInfo, SITE_URL } from "./seoConfig.js";

function absolute(urlPath) {
  if (!urlPath) return SITE_URL;
  if (urlPath.startsWith("http")) return urlPath;
  return `${SITE_URL}${urlPath}`;
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: orgInfo.name,
    url: orgInfo.url,
    logo: absolute(orgInfo.logo),
    sameAs: orgInfo.sameAs,
  };
}

export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: orgInfo.name,
    url: orgInfo.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSoftwareApplicationSchema({ name, description, url } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: name || orgInfo.name,
    description: description || "AI-powered entertainment marketplace for scripts and film projects.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absolute(url),
  };
}

export function buildFaqSchema(faqs = []) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs || []).map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function buildArticleSchema({ headline, description, url, datePublished, authorName } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: headline,
    description: description,
    url: absolute(url),
    datePublished: datePublished,
    author: {
      "@type": "Person",
      name: authorName || orgInfo.name,
    },
  };
}

export function buildBreadcrumbItems(path) {
  const parts = (path || "/").replace(/^\//, "").split("/").filter(Boolean);
  const items = [
    { position: 1, name: "Home", item: SITE_URL + "/" },
  ];
  parts.forEach((part, i) => {
    const name = decodeURIComponent(part).replace(/[-_]/g, " ");
    items.push({ position: i + 2, name: name.charAt(0).toUpperCase() + name.slice(1), item: SITE_URL + "/" + parts.slice(0, i + 1).join("/") });
  });
  return items;
}

export function buildBreadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (items || []).map((it) => ({
      "@type": "ListItem",
      position: it.position,
      name: it.name,
      item: it.item,
    })),
  };
}

export function buildProductSchema({ name, description, url, offers } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: absolute(url),
    offers: offers || { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export default {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildFaqSchema,
  buildArticleSchema,
  buildBreadcrumbItems,
  buildBreadcrumbSchema,
  buildProductSchema,
};
