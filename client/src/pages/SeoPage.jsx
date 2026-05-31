import { Link, useLocation } from "react-router-dom";
import { blogPosts, genrePages, guidePages, homepageFaqs, marketingPages } from "../seo/seoContent";
import { getSeoForPath } from "../seo/seoRoutes";
import { getInternalLinksForSeoPage } from "../seo/internalLinks";

function titleFromPath(pathname) {
  const last = pathname.split("/").filter(Boolean).pop() || "Ckript";
  return last
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPageContent(pathname) {
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

  return {
    h1: "Ckript",
    eyebrow: "AI Entertainment Marketplace",
    sections: [
      "Ckript is an AI-powered entertainment-tech marketplace connecting script writers, producers, investors, directors, and production houses.",
      "Upload scripts, analyze screenplays, generate AI concept trailers, match with producers and investors, and execute entertainment deals in a trusted ecosystem.",
    ],
    links: ["/features", "/for", "/industries", "/resources", "/tools"],
  };
}

export default function SeoPage() {
  const { pathname } = useLocation();
  const seo = getSeoForPath(pathname);
  const content = getPageContent(seo.canonicalPath || pathname);
  const smartLinks = [...new Set([...(content.links || []), ...getInternalLinksForSeoPage(seo)])].slice(0, 8);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4" aria-label="Primary">
          <Link to="/" className="text-lg font-semibold tracking-normal text-slate-950">
            Ckript
          </Link>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <Link to="/features">Features</Link>
            <Link to="/tools">Tools</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </nav>
      </header>

      <article className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <section aria-labelledby="seo-page-title" className="max-w-4xl">
          <p className="mb-3 text-sm font-semibold uppercase text-cyan-700">
            {content.eyebrow}
          </p>
          <h1 id="seo-page-title" className="text-4xl font-semibold text-slate-950 sm:text-5xl">
            {content.h1 || seo.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            {seo.description}
          </p>
        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-3" aria-label="Ckript capabilities">
          {(content.sections || []).map((section) => (
            <article key={section} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">{titleFromPath(section.split(" ").slice(0, 4).join("-"))}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{section}</p>
            </article>
          ))}
        </section>

        {content.eyebrow === "FAQ" ? (
          <section className="mt-12" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-2xl font-semibold text-slate-950">Frequently asked questions</h2>
            <div className="mt-5 grid gap-4">
              {homepageFaqs.map((faq) => (
                <article key={faq.question} className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-slate-950">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <aside className="mt-12 border-t border-slate-200 pt-8" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-xl font-semibold text-slate-950">Related Ckript pages</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {smartLinks.map((href) => (
              <Link
                key={href}
                to={href}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-cyan-700 hover:text-cyan-800"
              >
                {titleFromPath(href)}
              </Link>
            ))}
          </div>
        </aside>
      </article>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-slate-600">
          <p>Ckript - AI-powered script discovery and entertainment-tech marketplace.</p>
          <Link to="/contact" className="font-medium text-slate-900">Contact Ckript</Link>
        </div>
      </footer>
    </main>
  );
}
