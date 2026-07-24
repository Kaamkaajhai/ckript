import { useEffect } from "react";

/**
 * Per-page metadata for pages whose content is only known at runtime.
 *
 * `SeoManager` handles every route whose path is known at build time, keyed off `seoRoutes.js`. A
 * Hall of Fame detail page cannot be: its title depends on which competition was fetched. This sets
 * the same tag family SeoManager sets — title, description, and the og/twitter pairs, so a shared
 * link previews correctly rather than falling back to the site-wide blurb — and restores whatever
 * was there on unmount.
 *
 * Runs after the fetch resolves, so it lands after SeoManager's own route-change effect.
 */
const META = [
  ["name", "description"],
  ["name", "twitter:title"],
  ["name", "twitter:description"],
  ["property", "og:title"],
  ["property", "og:description"],
];

const findTag = (attr, key) => document.querySelector(`meta[${attr}="${key}"]`);

const useDynamicSeo = ({ title, description } = {}) => {
  useEffect(() => {
    if (!title) return undefined;

    const previousTitle = document.title;
    document.title = title;

    // Remember what each tag looked like so navigating away restores it exactly.
    const restore = META.map(([attr, key]) => {
      let tag = findTag(attr, key);
      const existed = Boolean(tag);
      const previous = tag?.getAttribute("content") ?? null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", key.includes("description") ? (description || "") : title);
      return { tag, existed, previous };
    });

    return () => {
      document.title = previousTitle;
      restore.forEach(({ tag, existed, previous }) => {
        if (!existed) tag.remove();
        else if (previous !== null) tag.setAttribute("content", previous);
      });
    };
  }, [title, description]);
};

export default useDynamicSeo;
