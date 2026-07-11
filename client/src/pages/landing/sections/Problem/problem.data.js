/* The two-sided "broken industry" pitch. `kind` selects which
   onboarding modal the card's CTA opens (writer vs. producer). */
export const PROBLEM_CARDS = [
  {
    rd: "0.05",
    kind: "writer",
    kicker: "If you're a writer",
    title: ["Brilliant pages,", "no audience."],
    rows: [
      "Your script sits in a drawer or an inbox nobody opens.",
      'Gatekeepers say "pass" without reading past page three.',
      "No real way to reach professionals who'd actually fund you.",
    ],
    cta: "Start as a writer",
  },
  {
    rd: "0.12",
    kind: "producer",
    kicker: "If you're in the industry",
    title: ["Too much noise,", "too little signal."],
    rows: [
      "Thousands of unfiltered submissions, no way to find the gems.",
      "No preview of tone or vision before reading 110 pages.",
      "Discovery is slow, expensive, and built on who-you-know.",
    ],
    cta: "Start as a professional",
  },
];
