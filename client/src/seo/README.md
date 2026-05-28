SEO System — Quick Runbook

Purpose
- Practical runbook for deploying and maintaining the Ckript SEO system (React/Vite).

Files of interest
- `client/src/seo/seoConfig.js` — central site metadata and verification tokens.
- `client/src/seo/schemaUtils.js` — JSON-LD schema builders.
- `client/src/seo/seoContent.js` — marketing pages, guides, genres, blog stubs.
- `client/src/seo/seoRoutes.js` — maps routes to SEO payloads used by `SeoManager`.
- `client/src/components/SeoManager.jsx` — runtime head and JSON-LD injection.
- `client/scripts/generate-sitemap.mjs` — build-time sitemap generator.
- `client/public/sitemap.xml` — generated sitemap (run build or `npm run seo:sitemap`).

Local dev & build
1. Install deps (if not done):

```bash
cd client
npm install
```

2. Dev server (non-SSR):

```bash
npm run dev
```

3. Generate sitemap (build step runs this automatically):

```bash
npm run seo:sitemap
```

4. Production build (will generate sitemap):

```bash
npm run build
```

Search Console / Verification
- Add the following to your deployment environment variables or hosting settings:
  - `GOOGLE_VERIFICATION` — string token (optional, SeoManager will insert meta if present)
  - `BING_VERIFICATION` — string token
- Alternatively the server exposes token endpoints at `/verification/google.txt` and `/verification/bing.txt` when running the server.
- Submit `https://ckript.com/sitemap.xml` to Google Search Console and Bing Webmaster Tools.

Performance / Core Web Vitals Checklist (practical)
- Ensure the hosting/CDN serves static assets with long `Cache-Control` for hashed assets and `ETag`/`Last-Modified` for others.
- Preconnect to Google Fonts and preload the primary OG image (already added to `index.html`).
- Use `LazyImage` with `srcSet`/`sizes` for responsive images. Prefer CMS-generated WebP and AVIF variants.
- Keep third-party scripts behind consent (AnalyticsBootstrap respects consent) and load them after user interaction or via `requestIdleCallback`.
- Audit with Lighthouse and Web Vitals in DevTools; focus on LCP, CLS, and INP.

Deployment notes
- The SPA is pre-render friendly: marketing routes (`/features`, `/resources/*`, `/for/*`, `/industries/*`, `/tools/*`, `/genre/*`) are indexable and render unique metadata/head via `SeoManager`.
- Host the `client/dist` on a CDN (Vercel, Netlify, Cloudflare Pages) and point the root domain to the static build.
- If using the `server` app to proxy, configure `express.static` for `client/dist` and set appropriate cache headers.

Monitoring & Continuous SEO
- Add automated Lighthouse checks in CI (e.g., GitHub Actions) to track CWV regressions.
- Periodically re-submit the sitemap when you add large batches of programmatic pages.
- Watch Google Search Console for index coverage, manual actions, and performance reports.

Next improvements (backlog)
- Add server-side prerendering for high-value marketing pages using a prerender service (still React-only approach).
- Generate localized hreflang pages for international SEO.
- Implement an automated schema validator that runs as part of the CI pipeline.

*** End of runbook ***
