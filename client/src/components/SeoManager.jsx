import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  defaultSeo,
  getSeoForPath,
  noIndexPrefixes,
  resolveCanonicalPath,
  SITE_URL,
} from "../seo/seoRoutes";
import { searchVerification } from "../seo/seoConfig";
import { isMissingSeoContentPath } from "../seo/seoPageContent";

function setMetaByName(name, content) {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setMetaByProperty(property, content) {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function setCanonical(url) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
}

function setJsonLd(schemas) {
  document.querySelectorAll('script[data-ckript-schema="true"]').forEach((tag) => tag.remove());

  schemas.forEach((schema, index) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.ckriptSchema = "true";
    script.dataset.schemaIndex = String(index);
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

function isNoIndexPath(pathname) {
  return noIndexPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || "/";
    const canonicalPath = resolveCanonicalPath(pathname);
    const seo = getSeoForPath(pathname);
    const canonicalUrl = seo.canonicalUrl || `${SITE_URL}${canonicalPath}`;
    const robots = isNoIndexPath(pathname) || isMissingSeoContentPath(canonicalPath)
      ? "noindex, nofollow"
      : "index, follow";

    document.title = seo.title || defaultSeo.title;

    setMetaByName("description", seo.description || defaultSeo.description);
    setMetaByName("robots", robots);
    setMetaByName("author", "Ckript");
    setMetaByName("application-name", "Ckript");
    setMetaByName("apple-mobile-web-app-title", "Ckript");
    setMetaByName("theme-color", defaultSeo.themeColor);
    setMetaByName("twitter:card", "summary_large_image");
    setMetaByName("twitter:title", seo.title || defaultSeo.title);
    setMetaByName("twitter:description", seo.description || defaultSeo.description);
    setMetaByName("twitter:image", seo.image || defaultSeo.image);

    setMetaByProperty("og:type", "website");
    setMetaByProperty("og:site_name", "Ckript");
    setMetaByProperty("og:title", seo.title || defaultSeo.title);
    setMetaByProperty("og:description", seo.description || defaultSeo.description);
    setMetaByProperty("og:url", canonicalUrl);
    setMetaByProperty("og:image", seo.image || defaultSeo.image);
    setMetaByProperty("og:locale", defaultSeo.locale);

    setCanonical(canonicalUrl);
    setJsonLd(seo.schemas || []);

    if (searchVerification.google) {
      setMetaByName("google-site-verification", searchVerification.google);
    }

    if (searchVerification.bing) {
      setMetaByName("msvalidate.01", searchVerification.bing);
    }
  }, [location.pathname]);

  return null;
}
