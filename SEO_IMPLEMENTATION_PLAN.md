# CKRIPT — SEO IMPLEMENTATION PLAN

**Objective:** Make ckript.com the #1 organic destination for script discovery, screenplay analysis, script selling, and film-funding search intent — globally, with India/Bollywood as the beachhead market.

**Document status:** Master operating manual. Version 1.0 — July 2026. Every recommendation is grounded in the actual codebase (`client/src/seo/*`, `client/scripts/*`, `client/vercel.json`, `client/public/*`). This is written to be executed, measured, and extended.

---

## PART 1 — HONEST ASSESSMENT OF WHERE THE SITE STANDS TODAY

### 1.1 What Ckript is

A full-stack marketplace connecting **screenwriters, producers, directors, investors, and production houses**. Core differentiators:

1. **AI script analysis** (automated coverage/evaluation)
2. **AI concept trailers** (script → visual pitch, nobody else does this at marketplace scale)
3. **Producer/investor matching** (deal flow, not just hosting)
4. **India/Bollywood focus** already visible in the URL set (`/film-investment-india`, `/bollywood-script-submission`) — a market where the incumbent English-language competitors are weak

### 1.2 What already exists (do not rebuild — extend)

The SEO scaffold is genuinely better than most startups have:

| Asset | Location | State |
|---|---|---|
| Route-level metadata registry | `client/src/seo/seoRoutes.js` | Working |
| SEO content store | `client/src/seo/seoContent.js` | Working but thin (379 lines for 50 pages) |
| JSON-LD builders (Org, WebSite, SoftwareApp, Product, FAQ, Article, Breadcrumb) | `client/src/seo/schemaUtils.js` | Working |
| Runtime meta injection | `client/src/components/SeoManager.jsx` | Working |
| Build-time prerender of public pages | `client/scripts/prerender-seo.mjs` | Working (must be verified in production — see 4.1) |
| Sitemap generation | `client/scripts/generate-sitemap.mjs` → `public/sitemap.xml` (50 URLs) | Working |
| robots.txt with private-route exclusions | `client/public/robots.txt` | Working |
| www→apex redirect, alias redirects, cache headers | `client/vercel.json` | Working |
| Internal-link cluster rules | `client/src/seo/internalLinks.js` | Skeletal (30 lines) |

**Conclusion: the plumbing exists. What's missing is everything that actually ranks: content depth, authority, entity trust, links, and the marketplace's own pages as an SEO asset.**

### 1.3 The weaknesses holding the site back (ranked by damage)

1. **Thin, templated content on every SEO page.** `SeoPage.jsx` renders 2–3 boilerplate sentences per page ("Ckript turns script education into execution by connecting…"). Fifty near-identical pages with swapped nouns is the textbook definition of what Google's helpful-content systems demote. Right now these pages are *liabilities pretending to be assets*. This is problem #1 by a wide margin.
2. **Zero authority signals.** No authors, no bylines, no dates, no editorial identity, no external profiles (`socialProfiles` in `seoConfig.js` literally lists only ckript.com itself), no backlinks strategy, no press. Google has no reason to trust this domain over The Black List, Stage 32, InkTip, ISA, Slated, or Coverfly's successors.
3. **The marketplace itself is invisible to Google.** `robots.txt` disallows `/script/`, `/profile/`, `/search`. The site's most defensible, hardest-to-copy content — real scripts, real writers, real loglines — contributes nothing to organic. Every successful marketplace (IMDb, Behance, GitHub, Zillow) wins SEO on its *inventory pages*, not its marketing pages.
4. **"Tools" pages that describe tools instead of being tools.** `/tools/screenplay-analyzer`, `/tools/story-generator`, `/tools/script-formatter` are static text pages. A working free tool is the single strongest link magnet in this niche; a page *about* a tool earns nothing.
5. **Blog is 3 stub posts** rendered from one-line descriptions. No content velocity, no topical depth, no reason for repeat crawling.
6. **Verification/measurement not confirmed.** `VITE_GOOGLE_SITE_VERIFICATION` / `VITE_BING_SITE_VERIFICATION` are env-dependent and may be unset; there's no evidence of Search Console ownership, GA4/analytics wiring, or rank tracking.
7. **Genre coverage is 4 pages** (thriller, horror, scifi, drama) with two sentences each — too shallow to rank, too few to be a taxonomy.
8. **Homepage title tries to rank for everything** ("AI Script Discovery, Screenplay Analysis & Film Funding") while no supporting page is strong enough to rank for anything.

### 1.4 The honest bottom line

Ckript today is a technically clean site with ~50 doorway-grade pages and zero authority. Nothing currently on the site would out-rank an established competitor for any commercial query. The good news: the niche's incumbents are editorially strong but **product-weak and technically stale**, the AI-analysis and AI-trailer angles are open territory, and the India market is nearly uncontested in English-language search. The path to #1 exists. It runs through depth, tools, inventory, and authority — in that order.

---

## PART 2 — THE SEARCH MARKET AND HOW CKRIPT WINS IT

### 2.1 The competitive landscape

| Competitor | Their strength | Their weakness (your opening) |
|---|---|---|
| **The Black List** | Brand, press, Hollywood trust | Paid-only evaluation, US-centric, no AI features, minimal content marketing |
| **Stage 32** | Huge content library, community, webinars | Diluted focus (education upsells), dated UX, no marketplace transparency |
| **InkTip** | Producer directory, long history | Paywalled everything, almost no public content, weak technical SEO |
| **ISA (Network ISA)** | Contest/gig listings | Aggregator, thin pages, no product |
| **Slated** | Film finance analytics | Investor-side only, no writer funnel |
| **Coverage services (WeScreenplay etc.)** | Rank for "script coverage" terms | Service businesses, no platform, no free tools |
| **ChatGPT/generic AI** | Free "script feedback" | No industry connection, no deal flow — position Ckript as "analysis that leads somewhere" |

**Nobody owns:** AI script coverage as a category, concept-trailer generation, India/Bollywood script submission, or transparent script-to-funding pipelines. These are Ckript's four uncontested hills.

### 2.2 Query landscape (the demand map)

Organize everything around **five intent clusters**. Every page you ever build should belong to exactly one.

**Cluster A — Sell/submit (writers, commercial, highest funnel value)**
"how to sell a screenplay", "sell my script", "screenplay submission sites", "where to submit a script", "bollywood script submission", "sell script to netflix", "script submission india", "screenplay marketplace"

**Cluster B — Improve/analyze (writers, tool intent, highest volume)**
"script coverage", "ai script analysis", "screenplay feedback free", "script analyzer", "screenplay format checker", "logline generator", "is my script good"

**Cluster C — Discover/source (producers & directors, low volume, extreme value)**
"find scripts to produce", "unproduced screenplays", "where do producers find scripts", "script scouting", "thriller scripts for sale"

**Cluster D — Fund/invest (investors, tiny volume, deal-size value)**
"film investment opportunities", "how to invest in movies", "film investment india", "web series investment", "film funding platforms"

**Cluster E — Learn (all roles, top-of-funnel, authority builder)**
"how to write a screenplay", "screenplay structure", "how film financing works", "what is script coverage", "screenplay format", genre-specific writing guides

**Strategic weighting:** B and A are where Ckript wins first (tool intent + transactional intent, achievable difficulty). E builds the authority that lets A and B rank. C and D are conquest content — low competition, direct revenue, write once and own forever.

### 2.3 The strategic thesis (read this twice)

Ckript cannot out-brand The Black List or out-library Stage 32 in year one. It **can**:

1. **Own the AI category** — "AI script analysis", "AI script coverage", "AI concept trailer" are new query spaces with no entrenched winner. Whoever defines them gets cited by every "best AI tools for screenwriters" listicle for the next decade.
2. **Own India** — "bollywood script submission", "film investment india", "sell script in india", regional-language script markets. Incumbents ignore this entirely. Win the beachhead, then expand.
3. **Win with working free tools** — a real formatter/analyzer/logline tool earns links, brand searches, and repeat visits that no article can.
4. **Turn inventory into pages** — public script pages and writer profiles become thousands of long-tail landing pages competitors can't replicate.
5. **Compound everything through one entity** — every page, tool, schema block, and byline reinforces "Ckript = the script marketplace entity" in Google's knowledge systems.

Everything below executes these five moves.

---

## PART 3 — TECHNICAL FOUNDATION (WHAT MUST BE TRUE BEFORE CONTENT MATTERS)

### 3.1 Verify prerendering actually serves in production — Week 1, non-negotiable

The whole architecture depends on `prerender-seo.mjs` writing `dist/**/index.html` and Vercel's filesystem-first serving beating the SPA rewrite in `vercel.json`. **Verify, don't assume:**

- `curl -A "Googlebot" https://ckript.com/features/ai-script-analysis` — confirm the response HTML contains the page-specific `<title>`, meta description, and JSON-LD (not the homepage defaults from `client/index.html`).
- Run every sitemap URL through this check (script it; add it to CI so a deploy that breaks prerendering fails loudly).
- In Search Console, use URL Inspection → "View crawled page" on 5 representative URLs and confirm rendered HTML matches.
- If any prerendered route falls through to the SPA shell, fix the output path logic in `prerender-seo.mjs` before doing anything else in this plan.

### 3.2 Search Console, Bing, and analytics — Week 1

- Verify ckript.com in **Google Search Console** (domain property) and **Bing Webmaster Tools**; set the env vars so `SeoManager` injects tokens as backup.
- Submit `sitemap.xml` in both.
- Install analytics (GA4 or privacy-friendly equivalent) with events for: signup start/complete by role, script upload, analysis run, tool usage, pricing modal open. SEO decisions later in this plan depend on knowing which pages convert.
- Set up rank tracking for a seed list of ~60 keywords across the five clusters (any tracker; even a weekly manual GSC export works at first).

### 3.3 Rendering and Core Web Vitals

- The landing page loads webfonts, an icon-font subset, and (per `client/src/assets/ckript-video.mp4`) video assets. Audit with Lighthouse/CrUX: target **LCP < 2.5s on mobile 4G**, CLS < 0.1, INP < 200ms.
- Convert hero images to WebP/AVIF with explicit dimensions; poster-image the video and lazy-load it; keep the font strategy you already have (single global load — good).
- Prerendered SEO pages should ship almost no JS-blocking content: the text must be in the initial HTML (verify via 3.1).
- Keep `client/index.html`'s hard-coded homepage meta in sync with `seoConfig.js` — today they match; add a build check so they never drift.

### 3.4 Canonical, redirect, and index hygiene (mostly done — lock it in)

- www→apex and alias redirects exist in `vercel.json`. Add: trailing-slash normalization, `http→https` (Vercel default, confirm), and uppercase-path normalization if the router is case-sensitive.
- `aliasCanonicalMap` in `seoRoutes.js` handles `/privacy`, `/terms`, `/t-and-c` — keep every future alias in **both** `vercel.json` (301) and this map (canonical), 301 preferred.
- Confirm `noIndexPrefixes` (referenced in `SEO_ARCHITECTURE.md`) covers every authenticated route rendered client-side, since robots.txt blocks crawling but not indexing of discovered URLs. Private pages should carry `<meta name="robots" content="noindex">` via `SeoManager` as belt-and-braces.
- Remove the `<meta name="keywords">` tag from `index.html` and `SeoManager` output. It has zero ranking value and telegraphs your keyword strategy to competitors. (Keep the `keywords` field internally in `seoContent.js` as an editorial planning field if useful.)

### 3.5 Schema upgrades (you have the builders — use them harder)

- **Organization schema**: add `sameAs` with real profiles (see 6.1 — create them first), `foundingDate`, `founder`, `contactPoint`, `logo` as `ImageObject`. Populate `socialProfiles` in `seoConfig.js`.
- **SoftwareApplication schema** on `/features/*` and `/tools/*` with `aggregateRating` once you have genuine ratings (never fabricate — a schema penalty costs months).
- **Article schema** on all blog/guide content with real `author` (Person, linked to an author page), `datePublished`, `dateModified`.
- **FAQPage** only where FAQs are visible on-page (already the pattern with `homepageFaqs` — good).
- **BreadcrumbList** on every hub/spoke page (builder exists in `schemaUtils.js`).
- Later (Part 5): `Product`/`CreativeWork` schema on public script pages, `ProfilePage`/`Person` on writer profiles.

### 3.6 Sitemap evolution

One sitemap is fine at 50 URLs. Before Part 5 ships, refactor `generate-sitemap.mjs` into a **sitemap index**: `sitemap-static.xml`, `sitemap-blog.xml`, `sitemap-scripts.xml`, `sitemap-writers.xml`. Real `lastmod` from content data, not build date — Google uses `lastmod` for crawl scheduling and punishes sites that lie with it.

---

## PART 4 — CONTENT SYSTEM: FROM 50 STUBS TO A TOPICAL FORTRESS

### 4.1 The rule that governs everything

**Every indexable page must be the best page on the internet for its target query, or have a concrete plan to become it, or be noindexed until it is.** The current 2-sentence SEO pages violate this on all counts. You have two options per page: deepen it or remove it from the index. There is no third option — Google's site-wide quality classifiers mean thin pages drag down the pages you've invested in.

**Immediate action (Week 1–2):** triage all 50 URLs. Keep indexed only: homepage, `/about`, `/contact`, `/pricing`, `/faq`, legal pages, and whichever 5–8 pages you will deepen first. Everything else: `noindex, follow` via `SeoManager` until its rebuild ships. This feels like going backwards. It is not. It is removing 40 pieces of evidence that the site is low-quality.

### 4.2 Hub-and-spoke architecture (the permanent structure)

Build **five hubs**, each mapping to an intent cluster from 2.2. Hubs are long, definitive, regularly updated pages; spokes are specific pages that link up to their hub and sideways to 2–4 siblings. This replaces the current flat `/features`, `/for`, `/resources` sprawl with connected clusters.

**Hub 1 — Sell Your Script (`/how-to-sell-a-script`, exists as stub → becomes flagship)**
The definitive 4,000+ word operating manual: options compared (managers, contests, marketplaces, direct-to-producer), realistic timelines and money, rights and legal basics, region-specific paths. Spokes:
- `/screenplay-submission-sites` (comparison content — name competitors honestly; comparison pages rank and build trust)
- `/how-to-pitch-screenplay` (exists as stub — rebuild)
- `/bollywood-script-submission` (exists as stub — rebuild as the flagship India page, see 4.5)
- `/sell-script-to-ott` (Netflix/Prime/regional OTT submission reality — high India demand)
- `/screenplay-rights-and-options-explained`
- Per-genre selling spokes as `/genre/*` mature

**Hub 2 — Script Analysis & Coverage (`/script-coverage-guide`, new)**
Own the category transition from human coverage to AI coverage. The hub explains what coverage is, what it costs, what AI changes. Spokes:
- `/features/ai-script-analysis` (rebuild: show a real sample report, methodology, what the AI evaluates — this page must *prove*, not describe)
- `/ai-script-coverage-vs-human-coverage` (the money comparison — this is the category-defining page)
- `/what-is-script-coverage`
- `/script-coverage-examples` (real anonymized reports — nobody else publishes these)
- `/tools/screenplay-analyzer` (becomes a working tool, Part 5)

**Hub 3 — Get Your Film Funded (`/resources/film-investment-guide`, exists as stub → rebuild)**
Spokes: `/how-to-find-film-investors` (stub → rebuild), `/film-investment-india` (stub → rebuild), `/web-series-investment`, `/short-film-funding`, `/film-pitch-deck-guide`, `/features/investor-matching` (rebuild with process transparency).

**Hub 4 — For Producers & Directors (`/for/producers` → rebuild as "Find Scripts to Produce")**
Spokes: `/find-scripts-to-produce`, `/unproduced-screenplays`, genre browse pages once inventory is indexable, `/features/producer-matching`.

**Hub 5 — Screenwriting Craft (`/resources/screenplay-guide`, exists as stub → rebuild)**
The authority engine. Spokes are the blog (4.4) plus evergreen guides: `/screenplay-format-guide`, `/how-to-write-a-logline`, `/three-act-structure`, `/web-series-screenplay-guide` (stub → rebuild), genre-writing guides feeding `/genre/*`.

**Genre pages (`/genre/*`)** get a defined template with real substance: what the genre demands structurally, what producers currently buy in it, market notes, featured scripts from inventory (once Part 5 ships), and links to the genre's writing guide. Expand from 4 genres to 10–12 (comedy, romance, action, crime, biopic, family, mythology/historical — the last two matter enormously for India) **only as fast as you can make each one genuinely good.**

### 4.3 Page templates (encode quality into `seoContent.js`)

Extend the `marketingPages`/`guidePages` schema in `seoContent.js` so depth is structural, not optional. Every guide/spoke page requires:

- `h1`, unique `title` (≤60 chars, primary keyword front-loaded), `description` (140–160 chars, includes the differentiator, written as an ad)
- **1,500+ words of real sections** (multiple `h2`/`h3` blocks with substance: numbers, steps, screenshots, examples — not the current single-string paragraphs)
- `faqs` (3–6, on-page, schema'd)
- `author` (slug → author registry, see 6.2), `datePublished`, `dateUpdated` (rendered on-page and in Article schema)
- `relatedLinks` (structured: hub link + 2–4 siblings, replacing the generic 3-link footer in `SeoPage.jsx`)
- At least one **proprietary element**: a data point from the platform ("scripts uploaded this month", "median analysis turnaround"), a downloadable template, an embedded tool, or a real example. This is what separates you from AI-generated competitor content — and from AI Overviews answering the query without clicking.

Rework `SeoPage.jsx` to render this richer shape (TOC for 2,000+ word pages, author byline block, dated updates, FAQ accordion, related-pages module).

### 4.4 The blog: velocity with standards

- **Cadence:** 2 posts/week for the first 6 months (≈50 posts), then 1/week plus refreshes. Consistency beats bursts — crawl frequency and topical momentum both compound.
- **Every post targets one specific query** from the demand map and links to its hub. No "5 tips" filler. Post types that work in this niche: data posts from platform activity ("What 500 uploaded thrillers tell us about openings"), teardown posts (analyzing famous scripts with your own AI tool — inherently linkable), process posts ("Exactly how a producer evaluated 30 scripts on Ckript"), India-market posts (almost zero competition).
- **URL pattern stays `/resources/blog/<slug>`** (already established — don't churn URLs).
- Refresh policy: every post gets reviewed at 6 months; update, expand, or 301 into a stronger page. `dateModified` only changes when content genuinely changes.

### 4.5 The India beachhead (highest ROI content in this plan)

English-language search competition for Indian film-industry queries is astonishingly weak while demand is large and growing (OTT boom, regional cinema). Execute as a dedicated cluster:

- Flagship: `/bollywood-script-submission` rebuilt to 3,000+ words — how script submission actually works in Mumbai, production house realities, copyright registration (SWA — Screenwriters Association registration, a real process every Indian writer searches for), OTT commissioning paths, and how Ckript shortcuts it.
- Spokes: `/film-investment-india` (rebuild), `/sell-script-in-india`, `/swa-script-registration-guide`, `/ott-script-submission-india`, `/telugu-film-scripts` / `/tamil-film-scripts` / `/hindi-web-series-scripts` (regional pages only when inventory or genuine regional content exists), `/film-production-houses-india-list` (a maintained directory page — directories in underserved niches earn links passively).
- These pages interlink as their own sub-cluster and link into Hubs 1 and 3.
- When traction is proven (Part 8 metrics), consider `hreflang`/regional expansion — not before.

### 4.6 What NOT to build

- No programmatic pages generated from keyword permutations without unique data behind them ("script marketplace in [city]") — that pattern gets sites deindexed in 2026.
- No AI-generated articles published without expert editing and a real byline willing to stand behind them.
- No separate subdomain blog. Everything on ckript.com — authority must concentrate.
- No new URL patterns without registering them in `seoRoutes.js` — the single-registry discipline is one of this codebase's best traits. Protect it.

---

## PART 5 — TOOLS AND INVENTORY: THE MOATS

### 5.1 Free tools (the link engine)

Convert the three `/tools/*` description pages into **actual working browser tools**, free, no signup required for basic use (email-gate the *export/save*, never the *use*):

1. **Screenplay Analyzer (`/tools/screenplay-analyzer`)** — upload 10 pages, get a genuine mini-report from the real analysis engine. This is the #1 priority: it demos the core product, targets Cluster B head-on, and is the page every "best AI screenwriting tools" listicle will link to. Show a sample report inline for zero-friction proof.
2. **Logline Generator / Logline Tester** — tiny to build, enormous search demand, perfectly shareable.
3. **Script Formatter (`/tools/script-formatter`)** — paste text → formatted PDF preview. Targets perpetual "screenplay format" demand and earns .edu/writing-community links.

Each tool page carries: the working tool above the fold, 800+ words of genuinely useful methodology below it, FAQ schema, and links into its cluster. Tools get their own `SoftwareApplication` schema.

**Why this outranks content:** competitors can copy an article in an afternoon. They cannot copy a working tool backed by your analysis engine. Tools convert visitors to users directly, and links to tools are editorially given, not begged for.

### 5.2 Indexable inventory (the compounding asset)

Today `robots.txt` disallows `/script/` and `/profile/`. Flip this deliberately, in stages:

**Stage 1 — Public script pages.** Writers already choose to publish (`PublicScript.jsx` exists). For scripts marked public, create canonical SEO pages: title, logline, genre, synopsis, writer, AI-analysis highlights (writer-approved), concept-trailer embed, "request access" CTA. `CreativeWork` schema. These pages target queries like "[genre] scripts for sale/unproduced [genre] screenplay" in aggregate through browse pages.
- **Quality gate (critical):** index only scripts meeting a completeness threshold (logline + synopsis + genre + minimum metadata). Thin inventory pages are the doorway problem all over again. Gate at the generator, not editorially.

**Stage 2 — Browse/taxonomy pages.** `/scripts/thriller`, `/scripts/web-series`, `/scripts/hindi` — paginated, crawlable listings connecting genre pages to inventory. These become the pages that rank for Cluster C queries, because they're the only real-time public inventory of available scripts on the internet.

**Stage 3 — Writer profiles.** Public, opt-in, `ProfilePage`/`Person` schema. Writers link to their own profiles from everywhere (bios, Twitter/X, LinkedIn) — **users building your backlink profile for you**. This is how Behance and GitHub won their categories.

**Sequencing note:** ship Stage 1 only after Parts 3–4 are underway (site quality baseline first), and update `robots.txt` + sitemap index + `noIndexPrefixes` together in one change.

### 5.3 Trailers as a surface

AI concept trailers are unique, visual, and shareable. Host each public trailer on its script page with `VideoObject` schema (thumbnail, duration, description) — eligibility for video results and a differentiated SERP appearance no competitor can match. Post the best ones to a YouTube channel linking back to script pages: YouTube is the #2 search engine and "concept trailer" search space is empty.

---

## PART 6 — AUTHORITY AND E-E-A-T: WHY GOOGLE SHOULD BELIEVE YOU

### 6.1 Entity foundation (Week 1–2, cheap, permanent)

- Create and complete real profiles: LinkedIn company page, X/Twitter, Instagram, YouTube, Crunchbase, GitHub org (repo already public). Add all to `socialProfiles` in `seoConfig.js` → Organization `sameAs`.
- Rewrite `/about` as a genuine entity page: who built Ckript, why, where it's based, team with names/photos/links, press contact. Google's entity reconciliation feeds on this page.
- Consistent NAP/brand description across all profiles. Seed a Wikidata entry when there's press coverage to cite.

### 6.2 Authors and editorial trust

- Create an author registry (extend `seoContent.js` or new `authors.js`): name, photo, credentials, bio, `sameAs` links. Every guide and post carries a byline rendered on-page and in schema.
- Recruit 2–3 **industry-credible contributors** early (a produced screenwriter, a development executive, a film financier) — even one article each plus a standing "reviewed by" role transforms the trust profile of entire clusters. Pay them; it's the cheapest authority money buys.
- Publish an editorial policy page (`/editorial-policy`): how content is produced, reviewed, updated, and how AI is used in your own content. In an AI-content-flooded niche, *disclosed process* is a differentiator.

### 6.3 Link acquisition (the honest kind, prioritized by yield)

1. **Tools outreach (highest yield).** Once 5.1 ships: get the analyzer/formatter into screenwriting-resource roundups, film-school resource pages, subreddit wikis (r/Screenwriting sidebar is a real referrer in this niche), and "AI tools for writers" listicles. One good tool → 50+ organic links over a year.
2. **Data PR (highest ceiling).** Quarterly reports from platform data: "State of Spec Scripts 2026", "What genres are producers actually requesting?", "India OTT script demand index." Original data is the only reliably link-worthy content type left. Pitch to trade press (Variety/Deadline tier eventually; Film Companion, Bollywood Hungama, screenwriting newsletters immediately).
3. **Founder/expert commentary.** Respond to journalist queries (Qwoted/HARO successors, #journorequest) on AI-in-film topics — the news cycle constantly needs "AI + Hollywood/Bollywood" sources.
4. **Partnerships.** Screenwriting contests, film schools (India especially — FTII, Whistling Woods ecosystem), writing communities: co-branded resources, contest submission integrations, guest workshops. Each yields links plus users.
5. **Podcast/YouTube guesting** in the screenwriting-podcast circuit — links, brand searches, and citation in show notes.

**Never:** buy links, join link networks, mass guest-post on content farms, or exchange links at scale. One penalty erases years. Authority in a small industry is also *reputational* — the niche is small enough that everyone notices everything.

### 6.4 Brand search as a ranking flywheel

Growing "ckript" navigational search volume is itself a quality signal. Feed it: consistent brand name everywhere, YouTube presence, community participation under the brand, and a memorable free tool people tell each other about. Track branded vs. non-branded clicks in GSC monthly (see Part 8).

---

## PART 7 — INTERNAL LINKING: THE CIRCULATORY SYSTEM

Replace the skeletal `internalLinks.js` with an enforced model:

1. **Every page belongs to one cluster** (add `cluster` field in `seoContent.js`). Spokes link to their hub (in-body, descriptive anchor — not just footer modules). Hubs link to every spoke. Siblings cross-link 2–4 times where contextually real.
2. **Homepage links to all five hubs** with keyword-bearing anchors — homepage equity is your scarcest resource; spend it on hubs, not on login/pricing chrome alone.
3. **Anchor discipline:** descriptive and varied ("learn how script coverage works", not "click here"; not the identical exact-match anchor 40 times either).
4. **Money-page proximity:** every guide/blog page links to exactly one conversion surface (signup by role, tool, or pricing) — one clear next step per page, chosen by the page's cluster.
5. **No orphans:** extend `generate-sitemap.mjs` (or a sibling script) to build the site's link graph from `seoContent.js` and **fail the build** if an indexable page has fewer than 3 internal in-links. Automate the discipline; humans forget.
6. When inventory pages ship (5.2), genre hubs and browse pages become the bridges: marketing cluster → browse page → script pages → writer profiles → back to signup. Every crawl path should pass through a conversion surface.

---

## PART 8 — MEASUREMENT: HOW YOU KNOW IT'S WORKING

### 8.1 Instrument (Month 1)

- GSC + Bing (3.2), GA4 with role-based conversion events, weekly automated GSC export (queries/pages/clicks/position) into a spreadsheet or dashboard — the raw GSC UI hides trend shape.
- Rank tracking on ~60 seed keywords across the five clusters, tagged by cluster.
- Uptime-style check on prerender integrity (3.1) and sitemap validity in CI.

### 8.2 The metrics that matter (in order)

1. **Non-branded organic clicks/week** (the single north star)
2. **Cluster-level impressions → position → clicks** (leading indicators, in that sequence: impressions rise first, then position, then clicks — expect this order, don't panic at impressions-without-clicks in months 2–4)
3. **Organic signups by role** (writers vs. producers vs. investors — the business metric)
4. **Tool sessions and tool → signup rate**
5. **Referring domains/month** (target: +5/mo by month 6, +15/mo by month 12)
6. **Branded search clicks** (flywheel gauge)
7. **Indexed inventory pages and their aggregate clicks** (post Part 5)

### 8.3 Review cadence

- **Weekly (30 min):** GSC anomalies, new/lost queries, prerender check green, publish cadence held.
- **Monthly (2 hrs):** cluster scorecard — each cluster gets improving/flat/declining; one corrective action per flat/declining cluster; refresh queue updated.
- **Quarterly (half day):** strategy review — re-run the competitive scan (2.1), kill or double down per cluster, re-prioritize the roadmap, run a fresh crawl (Screaming Frog or equivalent) for hygiene drift.

### 8.4 Honest timeline expectations

- **Months 1–3:** indexing, impressions growth, long-tail movement, first tool links. Rankings for competitive terms: none yet. Normal.
- **Months 4–6:** page-1 positions on low-competition India and long-tail queries; blog posts ranking; measurable organic signups.
- **Months 7–12:** hub pages contending on mid-competition terms ("script coverage", "sell a screenplay" variants); inventory long-tail compounding; 10x month-1 non-branded clicks is a realistic month-12 target from this base.
- **Year 2+:** category terms ("script marketplace", "ai script analysis") — these fall to accumulated authority, not any single tactic.

If **impressions** haven't moved by month 3, something is broken (indexing, prerender, or quality gate) — diagnose technically. If impressions grow but **positions** stall for two consecutive quarters on a cluster, the content isn't good enough or the authority isn't there — fix depth and links, not meta tags.

### 8.5 Recovery playbook (when something doesn't work)

- **A page won't rank:** check it against the top 3 results side by side. Be brutal: is it actually better? Usually no → deepen with proprietary elements, add internal links from the hub, earn 2–3 relevant external links. Still stuck after 90 days → merge it into a stronger page with a 301.
- **Traffic drops after a Google update:** don't react for 2 weeks (updates roll and reverse). Then: identify which cluster/page-type lost, compare against the update's stated target (helpful content? spam? reviews?), fix the pattern site-wide, expect recovery at the *next* update cycle, not immediately. Keep publishing throughout.
- **Inventory pages tank site metrics:** raise the completeness threshold (5.2), noindex the bottom tier, keep the browse pages. The gate is a dial, not a door.
- **A tactic yields nothing for two quarters:** kill it in the quarterly review and reallocate. This plan has more surface area than any team can max simultaneously — pruning is part of the system.
- **Manual action (unlikely if 6.3's "never" list is respected):** fix, document, file reconsideration, and treat it as a process failure — add the guardrail that would have prevented it.

---

## PART 9 — EXECUTION ROADMAP

Assumes a small team (1 dev + 1 content lead + founder time). Scale cadence up with capacity, never quality down.

### Phase 0 — Foundation & Triage (Weeks 1–2)
- [ ] Verify prerender serves route-specific HTML in production; add CI check (3.1)
- [ ] GSC + Bing verified, sitemap submitted, GA4 events live, rank tracker seeded (3.2, 8.1)
- [ ] Noindex all thin pages except the keep-list (4.1)
- [ ] Remove keywords meta tag; add robots noindex to private routes via SeoManager (3.4)
- [ ] Create social/entity profiles; populate `socialProfiles`; upgrade Organization schema (6.1)
- [ ] Rewrite `/about` as entity page (6.1)
- [ ] Lighthouse audit; fix LCP offenders on landing page (3.3)

### Phase 1 — First Strongholds (Weeks 3–8)
- [ ] Rebuild flagship pages, one at a time, to best-on-internet standard: `/how-to-sell-a-script`, `/features/ai-script-analysis` (with real sample report), `/bollywood-script-submission`, `/script-coverage-guide` (new Hub 2), `/film-investment-india`
- [ ] Extend `seoContent.js` schema + `SeoPage.jsx` renderer for deep pages (TOC, bylines, dates, FAQs, related modules) (4.3)
- [ ] Author registry + first bylines; editorial policy page (6.2)
- [ ] Blog cadence starts: 2/week, Cluster B and India topics first (4.4)
- [ ] Ship **Logline Generator** (smallest tool, fastest link win) (5.1)

### Phase 2 — The Tool Moat & Cluster Buildout (Months 3–4)
- [ ] Ship **free Screenplay Analyzer** on `/tools/screenplay-analyzer`; outreach push to resource pages and communities (5.1, 6.3)
- [ ] Complete Hub 1 and Hub 2 spokes; re-index pages as they're rebuilt (flip noindex → index per page)
- [ ] India sub-cluster: SWA guide, OTT submission, production-house directory (4.5)
- [ ] Internal-link graph enforcement in build (Part 7)
- [ ] Recruit first industry contributor; first "reviewed by" credits (6.2)

### Phase 3 — Inventory Goes Public (Months 5–6)
- [ ] Public script pages with quality gate + CreativeWork schema; robots.txt and sitemap-index update in one release (5.2)
- [ ] Browse/taxonomy pages; genre pages rebuilt with live inventory modules (4.2, 5.2)
- [ ] Trailer pages with VideoObject schema; YouTube channel seeded (5.3)
- [ ] Ship Script Formatter tool
- [ ] First data-PR report from platform data (6.3)

### Phase 4 — Authority Compounding (Months 7–12)
- [ ] Writer profiles public + opt-in promotion loop (5.2 Stage 3)
- [ ] Hubs 3–5 complete with full spoke sets
- [ ] Quarterly data reports as standing PR program; podcast/press circuit (6.3)
- [ ] Genre expansion to 10–12 with India-relevant genres (4.2)
- [ ] Refresh cycle running on all months-1–6 content (4.4)
- [ ] Quarterly strategy reviews steering reallocation (8.3)

### Phase 5 — Expansion (Year 2, gated on Part 8 metrics)
- Regional-language landing pages / hreflang if India cluster proves out
- Category-term assault ("script marketplace", "ai script coverage") once DR/authority supports it
- Community/UGC content surfaces (writer interviews, produced-success case studies — the strongest possible trust content: *proof the marketplace works*)
- Programmatic expansion **only** where proprietary data justifies pages (e.g., per-genre market-demand pages fed by real platform stats)

### What can wait (deliberately deferred)
Multilingual SEO, international markets beyond India, paid-search coordination, digital-PR agencies, video SEO beyond trailers, and any new page type not attached to a cluster. Deferred ≠ rejected; each has a gate in Phase 5.

### What must never be ignored (the standing laws)
1. Prerender integrity — if bots get the SPA shell, everything else is theater.
2. The best-page-or-noindex rule (4.1). Every future page, no exceptions.
3. One registry (`seoRoutes.js`) for every indexable URL.
4. Real bylines, real dates, real data. Never fabricate ratings, reviews, or authorship.
5. Publish cadence. Two months of silence costs a quarter of momentum.
6. The weekly 30-minute GSC review. Every disaster in SEO is visible early to anyone who looks.
7. Users' trust: never index a script or profile the writer didn't opt into making public. A privacy incident is also an SEO incident — trust is the ranking asset.

---

## PART 10 — AFTER THE PLAN: THE PERMANENT IMPROVEMENT LOOP

When Phases 0–4 are done, SEO at Ckript becomes a standing system, not a project:

1. **Inventory grows → pages grow → long-tail grows** (automatic, gated by quality thresholds you tune quarterly).
2. **Every quarter: one new data report, one tool improvement, one hub refresh.** That's the minimum heartbeat that keeps authority compounding.
3. **Every ranking win gets mined:** GSC's "queries you almost rank for" (positions 8–20) is a permanent to-do list — those pages need one more section, three more links, or a fresher date. Cheapest wins in all of SEO.
4. **Every product feature ships with its SEO surface:** new feature → feature page in the registry, blog announcement, hub linkage, schema. Make it part of the definition of done.
5. **Competitive scan quarterly:** who's ranking that wasn't, what page pattern is Google newly rewarding in this niche, what did the incumbents finally fix. Adjust, don't overreact.

The endgame position: **Ckript's marketing pages own the questions, its tools own the intent, its inventory owns the long tail, and its data owns the citations.** At that point competitors aren't fighting your content — they're fighting your structure, your users' links, and three years of compounding. That's what #1 looks like, and it is built exactly one best-on-the-internet page at a time.

---

## PART 11 — APPENDICES: EXECUTION-GRADE SPECIFICATIONS

Parts 1–10 define the strategy. These appendices are the working documents the team executes from. Keep them updated as they are used.

### Appendix A — Seed keyword tracking list (the initial ~60)

Load these into the rank tracker in Phase 0, tagged by cluster. Positions are checked weekly; the cluster scorecard (8.3) aggregates them. This list is a starting instrument panel, not a content plan — pages target queries, the tracker just tells you if the map is moving.

**Cluster A — Sell/Submit (transactional, primary)**
| Keyword | Target page | Difficulty |
|---|---|---|
| how to sell a screenplay | /how-to-sell-a-script | High |
| sell my script | /how-to-sell-a-script | High |
| screenplay submission sites | /screenplay-submission-sites | Medium |
| where to submit a screenplay | /screenplay-submission-sites | Medium |
| script marketplace | / (homepage, year-2 target) | High |
| sell script online | /how-to-sell-a-script | Medium |
| how to pitch a screenplay | /how-to-pitch-screenplay | Medium |
| screenplay option agreement | /screenplay-rights-and-options-explained | Low |
| submit script to production company | /screenplay-submission-sites | Medium |
| sell script to netflix | /sell-script-to-ott | Medium |

**Cluster A-India (beachhead — expect first wins here)**
| Keyword | Target page | Difficulty |
|---|---|---|
| bollywood script submission | /bollywood-script-submission | Low |
| how to sell a script in india | /sell-script-in-india | Low |
| script submission india | /bollywood-script-submission | Low |
| swa script registration | /swa-script-registration-guide | Low |
| submit script to ott platforms india | /ott-script-submission-india | Low |
| hindi web series script | /hindi-web-series-scripts | Low |
| production houses in india accepting scripts | /film-production-houses-india-list | Low |
| how to become a screenwriter in india | blog → Hub 1 | Low |

**Cluster B — Analyze/Improve (tool intent, volume)**
| Keyword | Target page | Difficulty |
|---|---|---|
| script coverage | /script-coverage-guide | High |
| what is script coverage | /what-is-script-coverage | Medium |
| ai script analysis | /features/ai-script-analysis | Low–Med (category-defining) |
| ai script coverage | /ai-script-coverage-vs-human-coverage | Low |
| free screenplay feedback | /tools/screenplay-analyzer | Medium |
| screenplay analyzer | /tools/screenplay-analyzer | Low |
| script analysis online | /tools/screenplay-analyzer | Medium |
| script coverage example | /script-coverage-examples | Low |
| logline generator | /tools/logline-generator | Medium |
| how to write a logline | /how-to-write-a-logline | Medium |
| screenplay format | /screenplay-format-guide | High |
| script formatter free | /tools/script-formatter | Medium |
| ai concept trailer | /features/ai-concept-trailer | Low (own it) |

**Cluster C — Discover/Source (producer side)**
| Keyword | Target page | Difficulty |
|---|---|---|
| find scripts to produce | /find-scripts-to-produce | Low |
| unproduced screenplays | /unproduced-screenplays | Low |
| where do producers find scripts | /find-scripts-to-produce | Low |
| thriller scripts for sale | /scripts/thriller (post Phase 3) | Low |
| buy movie scripts | /scripts (post Phase 3) | Medium |
| script scouting | /for/producers | Low |

**Cluster D — Fund/Invest**
| Keyword | Target page | Difficulty |
|---|---|---|
| film investment opportunities | /resources/film-investment-guide | Medium |
| how to invest in movies | /resources/film-investment-guide | Medium |
| film investment india | /film-investment-india | Low |
| web series investment | /web-series-investment | Low |
| how does film financing work | blog → Hub 3 | Medium |
| film pitch deck | /film-pitch-deck-guide | Medium |
| short film funding | /short-film-funding | Medium |

**Cluster E — Learn (authority)**
| Keyword | Target page | Difficulty |
|---|---|---|
| how to write a screenplay | /resources/screenplay-guide | Very high (year-2+) |
| three act structure | /three-act-structure | High |
| how to write a web series | /web-series-screenplay-guide | Low |
| how to write a thriller script | /genre/thriller (rebuilt) | Medium |
| screenplay structure | /resources/screenplay-guide | High |

Plus **branded**: "ckript", "ckript review", "ckript vs black list" (create the comparison page yourself before someone else defines it — `/ckript-vs-the-black-list`, honest, factual, in Cluster A).

### Appendix B — Flagship page briefs (Phase 1 rebuilds)

Each brief is the spec handed to whoever writes the page. Standard for all five: ≥2,500 words, byline + reviewed-by, published/updated dates, TOC, 4–6 FAQs with schema, one proprietary element minimum, hub/spoke links per Part 7.

**B.1 `/how-to-sell-a-script` (Hub 1 flagship)**
- H1: "How to Sell a Script in 2026: Every Path, Honestly Compared"
- Outline: What "selling" actually means (option vs. purchase vs. assignment) → The six paths (agents/managers, contests, marketplaces, direct-to-producer, self-production, OTT commissioning) with realistic odds, costs, and timelines for each → What producers actually look for (source: your platform data) → Protecting yourself (registration, copyright, red flags) → Region notes (US, UK, India) → How Ckript compresses the process (last, brief, honest)
- Proprietary element: platform stats table (e.g., median time from upload to first producer view) + downloadable "script submission tracker" template
- FAQs: "Can I sell a script without an agent?", "How much do first scripts sell for?", "Do I need to copyright my script first?", "Can I sell a script from outside the US?"
- Links: down to all Hub-1 spokes; sideways to /script-coverage-guide ("make it good enough to sell first")

**B.2 `/features/ai-script-analysis` (product page that proves)**
- H1: "AI Script Analysis: See Exactly What Our Coverage Reports Contain"
- Outline: A full, real sample report embedded on-page (anonymized) → What the AI evaluates and how (structure, character, dialogue, pacing, marketability) → Methodology and limits (what AI can't judge — honesty here builds trust and preempts the skeptic) → AI vs. human coverage comparison table (link to the full comparison spoke) → How producers on Ckript use the scores → Pricing/CTA
- Proprietary element: the sample report itself — nobody in the niche publishes full reports
- Schema: SoftwareApplication + FAQ. No fabricated ratings.

**B.3 `/bollywood-script-submission` (India flagship)**
- H1: "Bollywood Script Submission: How It Actually Works (and How to Do It Right)"
- Outline: The reality of unsolicited submissions in Mumbai → SWA registration step-by-step (fees, process, why it matters legally) → Production house submission norms (what a submission packet needs) → The OTT route (commissioning pools, regional content demand) → Common scams targeting Indian writers (genuinely useful, highly linkable) → How Ckript's marketplace bypasses the gatekeeping
- Proprietary element: maintained table of production houses / OTT platforms and their current submission stance (feeds the directory spoke)
- Written or reviewed by someone with named Indian industry experience — this page's E-E-A-T carries the whole India cluster.

**B.4 `/script-coverage-guide` (new Hub 2)**
- H1: "Script Coverage: The Complete Guide (Costs, Examples, and the AI Shift)"
- Outline: What coverage is and who reads it → The grid (pass/consider/recommend) explained with real examples → What coverage costs in 2026 (name the services and prices — comparison content ranks) → How to read your coverage without despair → The AI shift: what changes, what doesn't → Free analyzer CTA
- Proprietary element: annotated real coverage excerpts; embedded mini-analyzer

**B.5 `/film-investment-india` (Hub 3 India spoke)**
- H1: "Film Investment in India: A Realistic Guide for First-Time Investors"
- Outline: How Indian film financing is structured (studio, independent, OTT pre-sales, regional) → Realistic return profiles and risk (cite public data; no hype — YMYL-adjacent, accuracy is mandatory) → Legal vehicles and taxation basics (clearly marked "not advice", reviewed-by credential) → Web series vs. theatrical economics → How Ckript vets projects and matches investors
- Note: investment content touches YMYL classifiers. This cluster needs the strongest bylines and the most conservative claims on the site.

### Appendix C — Extended content schema and renderer spec

Target shape for entries in `client/src/seo/seoContent.js` (extend, don't break existing consumers in `seoRoutes.js` / `generate-sitemap.mjs` / `prerender-seo.mjs`):

```js
{
  path: "/how-to-sell-a-script",
  cluster: "sell",            // one of: sell | analyze | discover | fund | learn
  hub: true,                   // or hubPath: "/how-to-sell-a-script" on spokes
  title: "...",               // ≤60 chars
  description: "...",         // 140–160 chars
  h1: "...",
  author: "author-slug",       // → authors registry
  reviewedBy: "author-slug",   // optional
  datePublished: "2026-07-15",
  dateModified: "2026-07-15",  // only bump on real changes
  sections: [                  // replaces flat string paragraphs
    { h2: "...", body: "...", h3s: [{ h3: "...", body: "..." }] },
  ],
  faqs: [{ q: "...", a: "..." }],
  proprietary: { kind: "stats-table" | "download" | "embedded-tool" | "sample", ... },
  relatedLinks: { hub: "/...", siblings: ["/...", "/..."], conversion: "/join?role=writer" },
}
```

Renderer requirements for `SeoPage.jsx`: TOC auto-built from `sections` when word count > 1,500; byline block with author photo/credential linking to author page; visible published/updated dates; FAQ accordion emitting FAQPage schema only for on-page FAQs; related-pages module from `relatedLinks`; exactly one conversion CTA per page from `relatedLinks.conversion`. Article schema pulls author/date fields via `schemaUtils.js`.

Build-time guards to add (extend `client/scripts/`):
1. **Prerender integrity:** after build, assert each sitemap URL's `dist` HTML contains its registered `<title>` — fail build on mismatch.
2. **Link graph:** parse `relatedLinks` across all entries; fail if any indexable page has <3 in-links or links to an unregistered path.
3. **Meta lint:** title ≤60 chars, description 140–160, unique across registry, one H1 per page.
4. **Drift check:** homepage meta in `client/index.html` matches `defaultSeo` in `seoConfig.js`.

### Appendix D — Production verification runbook (Phase 0, then CI)

```bash
# For each sitemap URL: confirm route-specific prerender is served
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1)" https://ckript.com/features/ai-script-analysis | grep -o "<title>[^<]*"
# Expect the page-specific title, NOT the homepage default
```
Script this over all `<loc>` values in the live sitemap; alert on any homepage-default title, non-200, or redirect chain >1 hop. Run post-deploy and daily. Also verify in GSC URL Inspection ("View crawled page") for one URL per template type: marketing, guide, blog, genre, tool — templates fail as groups, so one check per template covers the class.

### Appendix E — Outreach playbook

**Target list (build in Phase 1, ~100 prospects):** screenwriting resource pages (search `"screenwriting resources" OR "resources for screenwriters"`), film-school program resource pages, subreddit wikis and Discord resource channels, screenwriting newsletters (Scriptnotes-adjacent ecosystem, Indian film newsletters), "best AI tools for writers" listicle authors, contest partner pages.

**Tool pitch template (for 5.1 launches):**
> Subject: A free screenplay analyzer your readers can use without signing up
> I built/work on Ckript. We just made our script analyzer free — paste 10 pages, get a structural report, no account needed: [link]. Your resources page at [URL] lists [existing tool]; ours might be a useful addition since [one specific differentiator]. Either way, [genuine one-line comment about their resource].

Rules: one specific reason per email, no follow-up beyond one, never offer payment for links, track in a simple sheet (prospect / date / result). Expect 5–10% conversion on genuinely good tools; if under 3%, the tool page needs work, not more emails.

**Data-report pitch (quarterly, from 6.3):** lead with the single most surprising stat as the subject line; give journalists the chart images pre-made; publish the full methodology on-site (methodology pages collect their own links).

### Appendix F — Weekly and monthly operating checklists

**Weekly (30 min, same day each week):**
1. GSC: compare clicks/impressions to prior week; open any query that gained/lost >30%
2. Prerender check green (Appendix D)
3. Coverage report: new "Crawled — not indexed" or "Duplicate" spikes → investigate
4. Publish cadence held (2 posts)? If not, log why — cadence failures compound silently
5. Rank tracker: note movements >5 positions on seed list

**Monthly (2 hrs):**
1. Cluster scorecard: clicks, avg position, referring domains per cluster → improving/flat/declining
2. One corrective action assigned per flat/declining cluster (deepen page / add links / build spoke)
3. Positions 8–20 mining: pick 3 pages, schedule their upgrades
4. Refresh queue: any page ≥6 months old reviewed
5. Link log: referring domains gained; outreach sheet updated
6. Conversion check: organic signups by role vs. last month — if traffic grows and signups don't, the problem is page CTAs, not SEO

---

*End of plan v1.1. Maintain this file as the operating source of truth: check items off in place, append decisions and dates to the changelog, and revise cluster strategy only at quarterly reviews.*

## Changelog
- 2026-07-03 — v1.0 created (Parts 1–10).
- 2026-07-03 — v1.1: Part 11 appendices added — seed keyword list, flagship page briefs, content schema spec, verification runbook, outreach playbook, operating checklists.
- 2026-07-03 — v1.2: Phase 0 execution started. **Production bug found and fixed:** every SEO route was 308-redirecting to a trailing-slash URL (`/features/ai-script-analysis` → `/features/ai-script-analysis/`) while every canonical tag and sitemap `<loc>` used the non-slash form — a self-conflicting signal that splits equity and wastes crawl budget on redirect hops. Root cause: Vercel's default `trailingSlash` behavior vs. prerender output written to `<path>/index.html`. Fix: pinned `"trailingSlash": false` in `client/vercel.json` so the slashless canonical URL is served directly (200, no hop). **Also done in this pass:** removed the dead `<meta name="keywords">` tag from all three emitters (`client/index.html`, `SeoManager.jsx`, `prerender-seo.mjs`) per 3.4; added `client/scripts/verify-prerender.mjs` (the Appendix D guard) and wired it into the build after prerender so a deploy that serves the SPA shell or wrong canonical fails loudly. **Verify after next deploy:** re-run the Appendix D curl sweep and confirm slashless URLs return 200 with matching canonicals (no 308).
