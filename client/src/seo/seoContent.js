const baseKeywords = [
  "Ckript",
  "script marketplace",
  "screenplay",
  "AI filmmaking",
  "film producers",
  "film investors",
  "script monetization",
];

export const homepageFaqs = [
  {
    question: "What is Ckript?",
    answer:
      "Ckript is an AI-powered entertainment-tech marketplace for script writers, producers, investors, directors, and production houses.",
  },
  {
    question: "Can writers upload scripts to Ckript?",
    answer:
      "Yes. Writers can upload scripts, protect project details, receive AI-powered analysis, and prepare pitches for industry decision makers.",
  },
  {
    question: "Does Ckript support AI script analysis?",
    answer:
      "Ckript provides AI-assisted script evaluation signals for story, characters, market potential, genre fit, and production-readiness.",
  },
  {
    question: "Who can discover scripts on Ckript?",
    answer:
      "Producers, investors, directors, readers, and production houses can use Ckript to discover screenplays and connect with creators.",
  },
];

export const marketingPages = [
  {
    path: "/features",
    kind: "marketing",
    title: "Ckript Features - AI Script Marketplace for Film and Series",
    description:
      "Explore Ckript's AI script analysis, concept trailer generation, script marketplace, producer matching, and investor matching features.",
    keywords: [...baseKeywords, "AI video", "script to cinema"],
    h1: "AI entertainment infrastructure for scripts, deals, and discovery",
    eyebrow: "Features",
    sections: [
      "Upload screenplays, treatments, pilots, web-series concepts, animation bibles, and TV formats into a trusted discovery layer.",
      "Use AI analysis and concept trailer workflows to help decision makers understand story potential faster.",
      "Connect writers with producers, directors, investors, and production houses through structured marketplace signals.",
    ],
    links: ["/features/ai-script-analysis", "/features/ai-concept-trailer", "/features/script-marketplace"],
  },
  {
    path: "/features/ai-script-analysis",
    kind: "tool",
    title: "AI Script Analysis for Screenwriters | Ckript",
    description:
      "Analyze screenplays with AI-powered coverage signals for structure, characters, dialogue, genre fit, marketability, and investor readiness.",
    keywords: [...baseKeywords, "script evaluation AI", "screenplay analysis", "coverage report"],
    h1: "AI script analysis for screenwriters and producers",
    eyebrow: "AI Script Analysis",
    sections: [
      "Evaluate narrative structure, character arcs, pacing, dialogue, originality, genre positioning, and production potential.",
      "Turn raw screenplay submissions into clear decision signals for writers, producers, studios, and investors.",
    ],
    links: ["/tools/screenplay-analyzer", "/resources/screenplay-guide", "/how-to-pitch-screenplay"],
  },
  {
    path: "/features/ai-concept-trailer",
    kind: "tool",
    title: "AI Concept Trailer Generator for Scripts | Ckript",
    description:
      "Generate AI concept trailers and visual pitch assets from scripts to help producers and investors understand cinematic potential.",
    keywords: [...baseKeywords, "AI trailer", "AI video", "concept trailer", "script to video"],
    h1: "AI concept trailers for script pitching",
    eyebrow: "AI Concept Trailer",
    sections: [
      "Transform script ideas into pitch-ready visual concepts for film, web-series, TV, and animation projects.",
      "Help buyers, collaborators, and funding partners experience tone, world, and audience potential earlier.",
    ],
    links: ["/features/script-marketplace", "/tools/story-generator", "/for/producers"],
  },
  {
    path: "/features/script-marketplace",
    kind: "product",
    title: "Script Marketplace for Movie and Web-Series Projects | Ckript",
    description:
      "List, discover, evaluate, and monetize movie scripts, web-series pilots, TV concepts, and animation stories on Ckript.",
    keywords: [...baseKeywords, "movie scripts", "web series scripts", "script discovery"],
    h1: "A premium marketplace for screenplays and entertainment IP",
    eyebrow: "Script Marketplace",
    sections: [
      "Create discoverable script profiles with genre, format, logline, pitch status, rights intent, and collaboration needs.",
      "Connect story IP with producers, directors, investors, readers, and production houses in one trusted ecosystem.",
    ],
    links: ["/for/writers", "/for/producers", "/industries/films"],
  },
  {
    path: "/features/producer-matching",
    kind: "marketing",
    title: "Producer Matching for Screenwriters | Ckript",
    description:
      "Match screenplays with producers and directors looking for film, web-series, TV, and animation projects.",
    keywords: [...baseKeywords, "find producers", "script pitching", "film producers"],
    h1: "Producer matching for scripts ready to move",
    eyebrow: "Producer Matching",
    sections: [
      "Help producers discover scripts by genre, budget fit, format, audience, and production-readiness.",
      "Give writers a clearer path from screenplay upload to qualified industry conversations.",
    ],
    links: ["/how-to-find-producers", "/for/producers", "/for/writers"],
  },
  {
    path: "/features/investor-matching",
    kind: "marketing",
    title: "Film Investor Matching for Scripts | Ckript",
    description:
      "Connect entertainment projects with investors looking for film funding, web-series opportunities, and production-ready IP.",
    keywords: [...baseKeywords, "film funding", "film investors", "movie investment"],
    h1: "Investor matching for entertainment projects",
    eyebrow: "Investor Matching",
    sections: [
      "Package scripts with AI analysis, pitch assets, and project context to support investment discovery.",
      "Help investors evaluate story potential, market category, creator readiness, and deal opportunities.",
    ],
    links: ["/for/investors", "/film-investment-india", "/resources/film-investment-guide"],
  },
  {
    path: "/for",
    kind: "marketing",
    title: "Ckript for Writers, Producers, Directors and Investors",
    description:
      "Ckript connects screenwriters, producers, directors, investors, and production houses across the entertainment value chain.",
    keywords: [...baseKeywords, "writers", "directors", "production houses"],
    h1: "Built for the people who turn scripts into cinema",
    eyebrow: "For Teams",
    sections: [
      "Writers can submit and monetize scripts. Producers and directors can discover stories. Investors can evaluate entertainment opportunities.",
      "Production houses can manage discovery, review, collaboration, and early deal conversations in one marketplace.",
    ],
    links: ["/for/writers", "/for/producers", "/for/directors", "/for/investors"],
  },
  ...[
    ["writers", "Screenwriters", "Upload scripts, receive AI analysis, prepare stronger pitches, and connect with producers and investors."],
    ["producers", "Producers", "Discover film, web-series, TV, and animation scripts with structured story, market, and creator signals."],
    ["directors", "Directors", "Find stories with visual potential and collaborate with writers before production conversations begin."],
    ["investors", "Film Investors", "Evaluate production-ready entertainment IP, script packages, and creator opportunities."],
    ["production-houses", "Production Houses", "Build a searchable script discovery pipeline for studios, banners, and production teams."],
  ].map(([slug, audience, copy]) => ({
    path: `/for/${slug}`,
    kind: "marketing",
    title: `Ckript for ${audience} | AI Entertainment Marketplace`,
    description: copy,
    keywords: [...baseKeywords, audience.toLowerCase()],
    h1: `Ckript for ${audience.toLowerCase()}`,
    eyebrow: "Audience",
    sections: [copy, "Use Ckript to reduce discovery friction, improve script evaluation, and create trusted industry connections."],
    links: ["/features/script-marketplace", "/features/ai-script-analysis", "/resources/script-pitching-guide"],
  })),
  {
    path: "/industries",
    kind: "marketing",
    title: "Entertainment Industry Script Marketplace | Ckript",
    description:
      "Ckript supports films, web-series, TV shows, and animation with AI-powered script discovery and pitch workflows.",
    keywords: [...baseKeywords, "films", "web series", "TV shows", "animation"],
    h1: "Script discovery for every screen format",
    eyebrow: "Industries",
    sections: [
      "Ckript organizes screenplay discovery across feature films, episodic web-series, television, and animation.",
      "Each format gets focused SEO pages, metadata, and internal links for scalable entertainment search visibility.",
    ],
    links: ["/industries/films", "/industries/web-series", "/industries/tv-shows", "/industries/animation"],
  },
  ...[
    ["films", "Film Script Marketplace", "Discover, analyze, pitch, and fund feature film scripts through Ckript's AI-powered marketplace."],
    ["web-series", "Web-Series Screenplay Marketplace", "Find and package web-series pilots, episodic concepts, and binge-ready stories."],
    ["tv-shows", "TV Show Script Discovery", "Evaluate TV formats, pilots, show bibles, and scalable episodic concepts."],
    ["animation", "Animation Script Marketplace", "Discover animated film, series, and family entertainment concepts with visual pitch potential."],
  ].map(([slug, title, copy]) => ({
    path: `/industries/${slug}`,
    kind: "marketing",
    title: `${title} | Ckript`,
    description: copy,
    keywords: [...baseKeywords, slug.replace("-", " ")],
    h1: title,
    eyebrow: "Industry",
    sections: [copy, "Connect creators, producers, investors, and production teams around format-specific story opportunities."],
    links: ["/features/ai-concept-trailer", "/features/script-marketplace", "/for/production-houses"],
  })),
  {
    path: "/resources",
    kind: "marketing",
    title: "Screenwriting and Film Funding Resources | Ckript",
    description:
      "Read Ckript guides on screenplay writing, script pitching, film investment, AI filmmaking, and entertainment-tech strategy.",
    keywords: [...baseKeywords, "screenwriting resources", "film investment guide"],
    h1: "Resources for writers, producers, and entertainment investors",
    eyebrow: "Resources",
    sections: [
      "Explore practical guides for screenplay development, script pitching, production packaging, and film investment.",
      "Ckript resource hubs strengthen topic authority around script discovery, screenplay analysis, and entertainment deals.",
    ],
    links: ["/resources/blog", "/resources/screenplay-guide", "/resources/film-investment-guide", "/resources/script-pitching-guide"],
  },
  ...[
    ["screenplay-guide", "Screenplay Guide for Writers", "Learn how to structure, refine, analyze, and prepare a screenplay for industry discovery."],
    ["film-investment-guide", "Film Investment Guide", "Understand how entertainment investors evaluate scripts, teams, budgets, and market potential."],
    ["script-pitching-guide", "Script Pitching Guide", "Learn how to pitch a screenplay with loglines, decks, AI analysis, and visual proof of concept."],
  ].map(([slug, title, copy]) => ({
    path: `/resources/${slug}`,
    kind: "guide",
    title: `${title} | Ckript Resources`,
    description: copy,
    keywords: [...baseKeywords, title.toLowerCase()],
    h1: title,
    eyebrow: "Guide",
    sections: [copy, "Use Ckript to turn stronger writing into clearer discovery, analysis, and deal conversations."],
    links: ["/features/ai-script-analysis", "/features/producer-matching", "/tools/screenplay-analyzer"],
  })),
  {
    path: "/resources/blog",
    kind: "marketing",
    title: "Ckript Blog - AI Filmmaking, Script Discovery and Film Funding",
    description:
      "Insights on AI script analysis, script marketplaces, screenplay pitching, producers, film investors, and entertainment technology.",
    keywords: [...baseKeywords, "Ckript blog", "AI filmmaking blog"],
    h1: "Ckript blog",
    eyebrow: "Blog",
    sections: [
      "Read analysis and practical playbooks for writers, producers, directors, investors, and entertainment technology teams.",
      "Every article connects readers to relevant tools, guides, and marketplace workflows inside Ckript.",
    ],
    links: ["/resources/blog/ai-script-analysis-for-screenwriters", "/resources/blog/how-producers-discover-scripts", "/tools/screenplay-analyzer"],
  },
  {
    path: "/tools",
    kind: "marketing",
    title: "AI Screenwriting Tools for Script Analysis and Pitching | Ckript",
    description:
      "Use Ckript tools for screenplay analysis, story generation, script formatting, AI concept trailers, and pitch preparation.",
    keywords: [...baseKeywords, "screenwriting tools", "story generator", "script formatter"],
    h1: "AI tools for script development and entertainment pitching",
    eyebrow: "Tools",
    sections: [
      "Ckript tools support screenplay analysis, story ideation, formatting, concept packaging, and script-to-cinema workflows.",
      "Designed for writers, producers, directors, readers, and investors who need faster story evaluation.",
    ],
    links: ["/tools/screenplay-analyzer", "/tools/story-generator", "/tools/script-formatter"],
  },
  ...[
    ["screenplay-analyzer", "AI Screenplay Analyzer", "Analyze screenplay structure, character arcs, dialogue, pacing, genre fit, and market potential."],
    ["story-generator", "AI Story Generator", "Generate story concepts, loglines, beats, and pitch-ready development material."],
    ["script-formatter", "Script Formatter", "Prepare scripts with clean formatting expectations for professional entertainment workflows."],
  ].map(([slug, title, copy]) => ({
    path: `/tools/${slug}`,
    kind: "tool",
    title: `${title} | Ckript`,
    description: copy,
    keywords: [...baseKeywords, title.toLowerCase()],
    h1: title,
    eyebrow: "Tool",
    sections: [copy, "Use this workflow inside Ckript's broader AI-powered script marketplace and discovery ecosystem."],
    links: ["/features/ai-script-analysis", "/resources/screenplay-guide", "/for/writers"],
  })),
  {
    path: "/pricing",
    kind: "marketing",
    title: "Ckript Pricing - Script Marketplace and AI Filmmaking Tools",
    description:
      "Explore Ckript pricing for script uploads, AI screenplay analysis, concept trailers, marketplace discovery, and entertainment deal workflows.",
    keywords: [...baseKeywords, "Ckript pricing", "AI script analysis pricing"],
    h1: "Pricing for AI-powered script discovery",
    eyebrow: "Pricing",
    sections: [
      "Ckript is designed to support creators and entertainment teams from early discovery through analysis, pitching, and deal readiness.",
      "Plans can support writers, producers, investors, directors, readers, and production houses as the marketplace expands.",
    ],
    links: ["/features", "/tools", "/contact"],
  },
  {
    path: "/faq",
    kind: "faq",
    title: "Ckript FAQ - AI Script Marketplace Questions",
    description:
      "Find answers about Ckript, AI script analysis, script uploads, concept trailers, producer matching, investor matching, and film funding.",
    keywords: [...baseKeywords, "Ckript FAQ"],
    h1: "Ckript FAQ",
    eyebrow: "FAQ",
    sections: homepageFaqs.map((faq) => `${faq.question} ${faq.answer}`),
    links: ["/features", "/resources", "/contact"],
  },
];

export const genrePages = {
  thriller: {
    title: "Thriller Script Marketplace and AI Screenplay Analysis | Ckript",
    description:
      "Discover thriller scripts, analyze suspense-driven screenplays, and pitch high-concept stories to producers and investors on Ckript.",
  },
  horror: {
    title: "Horror Script Marketplace for Producers and Writers | Ckript",
    description:
      "Find horror scripts, evaluate genre hooks, and connect scary story concepts with producers, directors, and film investors.",
  },
  scifi: {
    title: "Sci-Fi Script Marketplace and AI Concept Trailers | Ckript",
    description:
      "Discover science fiction screenplays, generate AI concept trailer ideas, and connect futuristic stories with entertainment partners.",
  },
  drama: {
    title: "Drama Script Marketplace for Screenwriters | Ckript",
    description:
      "Analyze and discover drama scripts with strong characters, emotional arcs, and producer-ready screenplay packages.",
  },
};

export const guidePages = {
  "/how-to-sell-a-script": {
    title: "How to Sell a Script with Ckript",
    description:
      "Learn how to prepare, analyze, pitch, and monetize your screenplay using Ckript's AI-powered script marketplace.",
  },
  "/how-to-find-producers": {
    title: "How to Find Producers for Your Script | Ckript",
    description:
      "Use Ckript to make scripts discoverable, package story potential, and connect with producers seeking film and series projects.",
  },
  "/how-to-pitch-screenplay": {
    title: "How to Pitch a Screenplay to Producers and Investors | Ckript",
    description:
      "Build stronger screenplay pitches with loglines, AI analysis, concept trailers, and marketplace-ready project pages.",
  },
  "/how-to-find-film-investors": {
    title: "How to Find Film Investors for a Script | Ckript",
    description:
      "Understand how to prepare entertainment projects for investor discovery, film funding conversations, and production packaging.",
  },
  "/film-investment-india": {
    title: "Film Investment in India - Script Funding and Producers | Ckript",
    description:
      "Explore film investment in India and how Ckript helps scripts, producers, and investors evaluate entertainment opportunities.",
  },
  "/bollywood-script-submission": {
    title: "Bollywood Script Submission Platform | Ckript",
    description:
      "Submit and package Bollywood-ready scripts for discovery by producers, directors, readers, investors, and production houses.",
  },
  "/web-series-screenplay-guide": {
    title: "Web-Series Screenplay Guide for Writers | Ckript",
    description:
      "Learn how to develop, analyze, pitch, and package web-series screenplays for producer and platform discovery.",
  },
};

export const blogPosts = [
  {
    slug: "ai-script-analysis-for-screenwriters",
    title: "AI Script Analysis for Screenwriters",
    description:
      "How AI screenplay analysis helps writers improve structure, pacing, character arcs, market positioning, and pitch readiness.",
    date: "2026-05-29",
    author: "Ckript Editorial",
  },
  {
    slug: "how-producers-discover-scripts",
    title: "How Producers Discover Scripts in an AI Marketplace",
    description:
      "A practical look at producer discovery signals, screenplay metadata, AI analysis, and script marketplace workflows.",
    date: "2026-05-29",
    author: "Ckript Editorial",
  },
  {
    slug: "film-investors-and-script-packaging",
    title: "What Film Investors Need Before Funding a Script",
    description:
      "Understand the story, team, budget, market, and proof-of-concept signals investors expect before film funding conversations.",
    date: "2026-05-29",
    author: "Ckript Editorial",
  },
];
