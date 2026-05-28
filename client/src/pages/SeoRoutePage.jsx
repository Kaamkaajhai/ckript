import { Link, useLocation, useParams } from "react-router-dom";
import { getSeoForPath } from "../seo/seoRoutes.js";
import { buildKeywords, normalizePath } from "../seo/seoUtils.js";

const topicLinks = {
  features: ["/features/ai-script-analysis", "/features/ai-concept-trailer", "/features/script-marketplace", "/features/producer-matching", "/features/investor-matching"],
  for: ["/for/writers", "/for/producers", "/for/directors", "/for/investors", "/for/production-houses"],
  industries: ["/industries/films", "/industries/web-series", "/industries/tv-shows", "/industries/animation"],
  resources: ["/resources/blog", "/resources/screenplay-guide", "/resources/film-investment-guide", "/resources/script-pitching-guide"],
  tools: ["/tools/screenplay-analyzer", "/tools/story-generator", "/tools/script-formatter"],
};

const routeDescriptions = {
  "/features": "Explore enterprise SEO landing pages for Ckript's AI-powered entertainment marketplace.",
  "/for": "Browse tailored Ckript experiences for writers, producers, directors, investors, and production houses.",
  "/industries": "See how Ckript serves films, web series, TV shows, and animation workflows.",
  "/resources": "Read guides on screenwriting, film financing, and script pitching.",
  "/tools": "Use AI-driven screenplay and story tools built for entertainment professionals.",
  "/faq": "Answers to common questions about script discovery, AI analysis, and entertainment collaboration.",
};

function titleCase(value = "") {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function renderIntro(pathname) {
  if (pathname === "/") return null;
  const parts = pathname.split("/").filter(Boolean);
  const root = `/${parts[0] || ""}`;
  const text = routeDescriptions[root] || `Discover Ckript content for ${titleCase(parts.join(" "))}.`;
  return text;
}

export default function SeoRoutePage() {
  const location = useLocation();
  const params = useParams();
  const pathname = normalizePath(location.pathname || "/");
  const seo = getSeoForPath(pathname);

  const group = pathname.split("/").filter(Boolean)[0] || "home";
  const links = topicLinks[group] || ["/", "/about", "/contact", "/pricing"];
  const derivedKeywords = buildKeywords(seo.keywords, seo.title, seo.description);

  const h1 = seo.title || "Ckript";
  const intro = renderIntro(pathname);

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white">
      <section className="mx-auto max-w-6xl px-4 py-28 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
            {group === "home" ? "Ckript" : titleCase(group)}
          </p>
          <h1 className="text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
            {h1}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/70 sm:text-lg">
            {intro || seo.description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-xl font-medium text-white">What this page covers</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Ckript helps writers, producers, directors, investors, and production houses discover scripts, evaluate stories, and move entertainment deals forward.
              This section is optimized for search engines and built with semantic HTML, canonical metadata, and structured data.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {links.map((to) => (
                <Link
                  key={to}
                  to={to}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
                >
                  {titleCase(to.replace(/^\//, ""))}
                </Link>
              ))}
            </div>
          </article>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <h2 className="text-xl font-medium text-white">SEO signals</h2>
            <dl className="mt-5 space-y-4 text-sm text-white/70">
              <div>
                <dt className="font-medium text-white">Canonical</dt>
                <dd className="mt-1 break-all">{seo.canonicalUrl}</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Primary intent</dt>
                <dd className="mt-1">{seo.kind || "marketing"}</dd>
              </div>
              <div>
                <dt className="font-medium text-white">Keywords</dt>
                <dd className="mt-1">{derivedKeywords.join(", ")}</dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
              <p className="font-medium text-white">Topic cluster</p>
              <p className="mt-2">Use this hub page to distribute authority across related Ckript pages without orphaning content.</p>
            </div>
          </aside>
        </div>

        {params.slug || params.featureSlug || params.audience || params.industry || params.resourceSlug || params.toolSlug ? (
          <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-2xl font-medium">Focused page</h2>
            <p className="mt-3 text-white/70">
              This route resolves a programmatic SEO page for <strong>{pathname}</strong>, giving search engines a clean, indexable URL with unique intent.
            </p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
