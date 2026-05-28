export const marketingPages = [
  {
    path: "/features/ai-script-analysis",
    title: "AI Script Analysis for Screenwriters | Ckript",
    description: "Instant screenplay analysis, readability scores, and story-beat insights powered by AI.",
    keywords: ["AI script analysis", "screenplay analysis", "script feedback"],
    kind: "feature",
  },
  {
    path: "/features/ai-concept-trailer",
    title: "AI Concept Trailer Generator | Ckript",
    description: "Generate AI-powered concept trailers from your script to showcase to producers and investors.",
    keywords: ["AI trailer", "concept trailer", "script trailer"],
    kind: "feature",
  },
  {
    path: "/features/script-marketplace",
    title: "Script Marketplace | Buy & Sell Screenplays | Ckript",
    description: "A secure marketplace for writers to monetize scripts and for producers to discover projects.",
    keywords: ["script marketplace", "sell screenplay", "buy scripts"],
    kind: "feature",
  },
  {
    path: "/features/producer-matching",
    title: "Producer Matching & Collaboration | Ckript",
    description: "Match your script with producers, directors, and collaborators using intelligent discovery.",
    keywords: ["producer matching", "find producers", "script collaboration"],
    kind: "feature",
  },
  {
    path: "/features/investor-matching",
    title: "Connect with Film Investors | Ckript",
    description: "Showcase investment-ready scripts to accredited producers and investors.",
    keywords: ["film investors", "script investment", "film funding"],
    kind: "feature",
  },
];

// Audience-targeted landing pages
export const forPages = [
  {
    path: "/for/writers",
    title: "For Writers — Get your script discovered | Ckript",
    description: "Upload, protect, and showcase your screenplay to producers and investors.",
    keywords: ["writers", "screenwriters", "submit screenplay"],
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/for/producers",
    title: "For Producers — Find production-ready scripts | Ckript",
    description: "Discover vetted scripts with AI concept trailers and evaluation scores.",
    keywords: ["producers", "find scripts", "film production"],
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/for/directors",
    title: "For Directors — Collaborate on compelling stories | Ckript",
    description: "Connect with writers and turn strong scripts into visual projects.",
    keywords: ["directors", "film directors", "script collaboration"],
    changefreq: "monthly",
    priority: "0.7",
  },
  {
    path: "/for/investors",
    title: "For Investors — Invest in promising scripts | Ckript",
    description: "Browse investment-ready projects and back exceptional storytelling.",
    keywords: ["film investors", "invest in films", "project funding"],
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/for/production-houses",
    title: "For Production Houses — Streamline content sourcing | Ckript",
    description: "Find scripts and creative partners efficiently using Ckript's tools.",
    keywords: ["production houses", "content sourcing"],
    changefreq: "monthly",
    priority: "0.7",
  },
];

// Tools and industry landing pages
export const toolPages = [
  { path: "/tools/screenplay-analyzer", title: "Screenplay Analyzer | Ckript", description: "Deep structural analysis for screenplays.", keywords: ["screenplay analyzer", "script analysis"], changefreq: "weekly", priority: "0.8", kind: "tool" },
  { path: "/tools/story-generator", title: "Story Generator | Ckript", description: "AI-assisted story and idea generation for writers.", keywords: ["story generator", "AI story"], changefreq: "weekly", priority: "0.7", kind: "tool" },
  { path: "/tools/script-formatter", title: "Script Formatter | Ckript", description: "Format your screenplay to industry standards.", keywords: ["script formatter", "screenplay format"], changefreq: "monthly", priority: "0.6", kind: "tool" },
];

export const industryPages = [
  { path: "/industries/films", title: "Films — Feature Scripts | Ckript", description: "Feature film scripts and production-ready content.", keywords: ["film scripts", "feature film"], changefreq: "monthly", priority: "0.8" },
  { path: "/industries/web-series", title: "Web Series — Serialized Scripts | Ckript", description: "Serialized storytelling resources and scripts.", keywords: ["web series scripts", "streaming scripts"], changefreq: "monthly", priority: "0.7" },
  { path: "/industries/tv-shows", title: "TV Shows — Episodic Scripts | Ckript", description: "TV show scripts and industry-ready outlines.", keywords: ["tv show scripts", "episodic scripts"], changefreq: "monthly", priority: "0.7" },
  { path: "/industries/animation", title: "Animation — Scripts & Storyboards | Ckript", description: "Animation scripts and creative previsualization.", keywords: ["animation scripts", "cartoon scripts"], changefreq: "monthly", priority: "0.7" },
];

// Merge extra marketing-like pages so sitemap includes them
marketingPages.push(...forPages, ...toolPages, ...industryPages);

export const genrePages = {
  thriller: { title: "Thriller Scripts | Ckript", description: "Discover edge-of-your-seat thriller scripts and collaborate with film professionals." },
  horror: { title: "Horror Scripts | Ckript", description: "Find horror screenplays, trailers, and collaborators for chilling productions." },
  scifi: { title: "Sci-Fi Scripts | Ckript", description: "Explore science fiction scripts with high-concept visuals and AI concept trailers." },
  drama: { title: "Drama Scripts | Ckript", description: "Emotive drama screenplays ready for production and collaboration." },
};

export const guidePages = {
  "/resources/screenplay-guide": { title: "Screenplay Guide | Ckript", description: "Complete guide to writing, formatting, and pitching screenplays to producers." },
  "/resources/film-investment-guide": { title: "Film Investment Guide | Ckript", description: "How film financing works and how writers can prepare to secure funding." },
  "/resources/script-pitching-guide": { title: "Script Pitching Guide | Ckript", description: "Best practices for pitching your screenplay to producers and investors." },
  "/web-series-screenplay-guide": { title: "Web Series Screenplay Guide | Ckript", description: "Writing serialized content for web platforms and streaming services." },
};

export const blogPosts = [
  { slug: "how-ai-is-changing-screenwriting", title: "How AI Is Changing Screenwriting", description: "AI tools transforming the way writers develop and pitch screenplays.", date: "2026-01-15", author: "Ckript Team" },
  { slug: "script-marketing-for-producers", title: "Script Marketing For Producers", description: "Strategies producers use to evaluate and market scripts to studios.", date: "2026-03-02", author: "Ckript Team" },
];

export const homepageFaqs = [
  { question: "How does Ckript protect my script?", answer: "Ckript stores scripts securely and provides controlled access for verified industry professionals." },
  { question: "Can I sell a script on Ckript?", answer: "Yes — writers can list scripts, set access terms, and accept offers from producers and investors." },
];

export default {
  marketingPages,
  genrePages,
  guidePages,
  blogPosts,
  homepageFaqs,
};
