const topicLinks = {
  writer: ["/for/writers", "/resources/screenplay-guide", "/how-to-sell-a-script"],
  producer: ["/for/producers", "/features/producer-matching", "/how-to-find-producers"],
  investor: ["/for/investors", "/features/investor-matching", "/how-to-find-film-investors"],
  ai: ["/features/ai-script-analysis", "/features/ai-concept-trailer", "/tools/screenplay-analyzer"],
  marketplace: ["/features/script-marketplace", "/industries/films", "/resources/script-pitching-guide"],
};

const defaultLinks = [
  "/features/ai-script-analysis",
  "/features/script-marketplace",
  "/tools/screenplay-analyzer",
  "/resources/script-pitching-guide",
];

export function getInternalLinksForSeoPage(seo) {
  const text = `${seo.title || ""} ${seo.description || ""}`.toLowerCase();
  const selected = new Set();

  Object.entries(topicLinks).forEach(([topic, links]) => {
    if (text.includes(topic)) {
      links.forEach((link) => selected.add(link));
    }
  });

  defaultLinks.forEach((link) => selected.add(link));
  selected.delete(seo.canonicalPath);

  return Array.from(selected).slice(0, 6);
}
