import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { appMeta, defaultSeo, SITE_URL, socialProfile, verificationTokens, locales, defaultLocale } from "../seo/seoConfig";
import { getSeoForPath, noIndexPrefixes, resolveCanonicalPath } from "../seo/seoRoutes";

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

function setLinkTag(rel, href, attributes = {}) {
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value) {
      tag.setAttribute(key, value);
    }
  });
}

function addLinkTag(rel, href, attributes = {}) {
  const tag = document.createElement("link");
  tag.setAttribute("rel", rel);
  tag.setAttribute("href", href);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value) tag.setAttribute(key, value);
  });
  document.head.appendChild(tag);
  return tag;
}

function setJsonLd(id, payload) {
  let tag = document.querySelector(`script[data-seo-jsonld="${id}"]`);
  if (!tag) {
    tag = document.createElement("script");
    tag.setAttribute("type", "application/ld+json");
    tag.setAttribute("data-seo-jsonld", id);
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(payload);
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
    const robots = isNoIndexPath(pathname) ? "noindex, nofollow" : "index, follow";

    document.title = seo.title || defaultSeo.title;

    setMetaByName("description", seo.description || defaultSeo.description);
    setMetaByName("referrer", "no-referrer-when-downgrade");
    setMetaByName("robots", robots);
    setMetaByName("keywords", (seo.keywords || defaultSeo.keywords).join(", "));
    setMetaByName("application-name", appMeta.appName);
    setMetaByName("apple-mobile-web-app-title", appMeta.appName);
    setMetaByName("apple-mobile-web-app-capable", "yes");
    setMetaByName("mobile-web-app-capable", "yes");
    setMetaByName("theme-color", appMeta.themeColor);
    setMetaByName("twitter:card", "summary_large_image");
    if (socialProfile.twitterHandle) {
      setMetaByName("twitter:site", socialProfile.twitterHandle);
    }
    setMetaByName("twitter:title", seo.title || defaultSeo.title);
    setMetaByName("twitter:description", seo.description || defaultSeo.description);
    setMetaByName("twitter:image", seo.image || defaultSeo.image);

    const ogType = seo.kind === "blog" ? "article" : "website";
    setMetaByProperty("og:type", ogType);
    setMetaByProperty("og:site_name", "Ckript");
    setMetaByProperty("og:locale", "en_US");
    setMetaByProperty("og:title", seo.title || defaultSeo.title);
    setMetaByProperty("og:description", seo.description || defaultSeo.description);
    setMetaByProperty("og:url", canonicalUrl);
    setMetaByProperty("og:image", seo.image || defaultSeo.image);

    setCanonical(canonicalUrl);
    setLinkTag("icon", appMeta.favicon, { type: "image/png", sizes: "32x32" });
    setLinkTag("apple-touch-icon", appMeta.appleIcon, { sizes: "180x180" });
    setLinkTag("manifest", appMeta.manifest);
    // Add hreflang alternate links for supported locales (if configured)
    try {
      const _locales = Array.isArray(locales) && locales.length ? locales : [];
      if (_locales.length) {
        _locales.forEach((lang) => {
          const href = `${SITE_URL}${lang === defaultLocale ? canonicalPath : `/${lang}${canonicalPath}`}`;
          // create a dedicated alternate link per locale
          addLinkTag("alternate", href, { hreflang: lang });
        });
        // x-default fallback
        addLinkTag("alternate", `${SITE_URL}${canonicalPath}`, { hreflang: "x-default" });
      }
    } catch (e) {
      // ignore when not available
    }
    // Preload important images for social previews
    setLinkTag("preload", seo.image || defaultSeo.image, { as: "image" });
    // Preconnect common CDNs for fonts
    let preconnect = document.querySelector('link[rel="preconnect"][href="https://fonts.googleapis.com"]');
    if (!preconnect) {
      const p = document.createElement("link");
      p.setAttribute("rel", "preconnect");
      p.setAttribute("href", "https://fonts.googleapis.com");
      document.head.appendChild(p);
    }

    if (verificationTokens.google) {
      setMetaByName("google-site-verification", verificationTokens.google);
    }
    if (verificationTokens.bing) {
      setMetaByName("msvalidate.01", verificationTokens.bing);
    }
    if (verificationTokens.yandex) {
      setMetaByName("yandex-verification", verificationTokens.yandex);
    }

    if (seo.schemas?.length) {
      seo.schemas.forEach((schema, index) => {
        // Avoid re-inserting identical JSON-LD payloads
        try {
          const existing = document.querySelectorAll('script[data-seo-jsonld]');
          const exists = Array.from(existing).some((n) => n.textContent === JSON.stringify(schema));
          if (!exists) setJsonLd(`schema-${index}`, schema);
        } catch {
          setJsonLd(`schema-${index}`, schema);
        }
      });
    }

    const existingSchemas = document.querySelectorAll("script[data-seo-jsonld]");
    existingSchemas.forEach((node) => {
      const id = node.getAttribute("data-seo-jsonld") || "";
      const index = Number(id.replace("schema-", ""));
      if (!seo.schemas?.length || (Number.isFinite(index) && index >= seo.schemas.length)) {
        node.remove();
      }
    });
  }, [location.pathname]);

  return null;
}