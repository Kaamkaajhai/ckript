const text = (value) => String(value ?? "").trim();

export const formatPublicPrice = (value) => {
  const amount = Number(value || 0);
  return amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "Contact the writer";
};

export const formatPublicBudget = (value) => ({
  micro: "Micro (under ₹1Cr)",
  low: "Low (₹1Cr–₹10Cr)",
  medium: "Medium (₹10Cr–₹150Cr)",
  high: "High (₹150Cr–₹750Cr)",
  blockbuster: "Blockbuster (₹750Cr+)",
}[text(value).toLowerCase()] || "Not specified");

export function buildPublicProjectSections(project = {}) {
  const classification = project.classification || {};
  const evaluation = project.evaluation || null;
  const roles = Array.isArray(project.roles) ? project.roles : [];
  return [
    {
      id: "overview",
      title: "The story",
      body: text(project.logline) || "The writer has not added a logline yet.",
      facts: [
        ["Format", text(project.formatOther || project.format) || "Not specified"],
        ["Genre", text(classification.primaryGenre || project.primaryGenre || project.genre) || "Not specified"],
        ["Pages", Number(project.pageCount || 0) > 0 ? String(project.pageCount) : "Not specified"],
        ["Budget", formatPublicBudget(project.budget)],
      ],
    },
    {
      id: "classification",
      title: "Classification",
      groups: [
        ["Tones", classification.tones],
        ["Themes", classification.themes],
        ["Settings", classification.settings],
      ].filter(([, values]) => Array.isArray(values) && values.length),
    },
    evaluation ? {
      id: "evaluation",
      title: "Evaluation",
      score: Number(evaluation.overall || 0),
      body: text(evaluation.feedback) || "A score is available; written feedback has not been shared.",
    } : null,
    roles.length ? { id: "roles", title: "Roles", roles } : null,
    {
      id: "synopsis",
      title: "Synopsis",
      body: text(project.synopsis) || "No public synopsis is available.",
    },
  ].filter(Boolean);
}
