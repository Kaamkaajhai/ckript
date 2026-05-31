# Ckript SEO Architecture

Ckript uses a React/Vite SEO architecture with route-level metadata, JSON-LD schema, generated sitemaps, robots controls, and build-time static HTML for public marketing pages.

## Files

- `src/seo/seoConfig.js` - brand, canonical domain, default metadata, verification hooks.
- `src/seo/seoContent.js` - public SEO page content, programmatic pages, blog entries, FAQs.
- `src/seo/seoRoutes.js` - canonical route registry, noindex prefixes, metadata payload builder.
- `src/seo/schemaUtils.js` - Organization, WebSite, SoftwareApplication, Product, FAQ, Article, Breadcrumb schemas.
- `src/seo/internalLinks.js` - topic-cluster internal linking rules.
- `src/components/SeoManager.jsx` - runtime title, meta, canonical, Open Graph, Twitter, robots, verification, and JSON-LD injection.
- `src/pages/SeoPage.jsx` - semantic public SEO page renderer.
- `scripts/generate-sitemap.mjs` - generates `public/sitemap.xml`.
- `scripts/prerender-seo.mjs` - writes route-specific static HTML into `dist/**/index.html` after Vite build.
- `public/robots.txt` - indexing allowlist with private/admin/app route exclusions.

## Public URL Coverage

The implementation covers:

- `/features` and feature detail pages.
- `/for` and audience pages for writers, producers, directors, investors, and production houses.
- `/industries` pages for films, web-series, TV shows, and animation.
- `/resources`, `/resources/blog`, resource guides, and example blog articles.
- `/tools` pages for screenplay analysis, story generation, and script formatting.
- `/genre/thriller`, `/genre/horror`, `/genre/scifi`, `/genre/drama`.
- Programmatic guides such as `/how-to-sell-a-script`, `/film-investment-india`, and `/bollywood-script-submission`.

## Build

Run:

```bash
npm run build
```

The build runs:

```bash
npm run seo:sitemap
vite build
node ./scripts/prerender-seo.mjs
```

This produces static metadata-bearing HTML files for public routes while preserving the React app for hydration and navigation.

## Search Verification

Set these environment variables when verification tokens are available:

```bash
VITE_GOOGLE_SITE_VERIFICATION=...
VITE_BING_SITE_VERIFICATION=...
```

`SeoManager` will inject:

- `google-site-verification`
- `msvalidate.01`

## Adding SEO Pages

Add content in `src/seo/seoContent.js`.

For normal public pages, add an item to `marketingPages` with:

- `path`
- `kind`
- `title`
- `description`
- `keywords`
- `h1`
- `sections`
- `links`

For programmatic guides, add an entry to `guidePages`. For genre pages, add an entry to `genrePages`. Blog entries go into `blogPosts`.

The sitemap and static HTML generation will pick up registered routes automatically.

## Production Notes

- Keep private app routes in `noIndexPrefixes` and `public/robots.txt`.
- Keep one H1 per page in public SEO pages.
- Prefer static, crawlable public pages for search acquisition.
- Use compressed, appropriately sized images for LCP-critical pages.
- Submit `https://ckript.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools after deployment.
