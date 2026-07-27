/* Copy for the landing's challenge section, one entry per phase.
 *
 * Two rules encoded here, both deliberate:
 *
 * • No cadence is ever claimed. "Three times a year" would be wrong the first time a fourth runs,
 *   and the homepage is the last place anyone remembers to correct.
 *
 * • The AI evaluation leads, prizes follow. Cash is true for roughly one entrant in a hundred;
 *   feedback is true for all of them. Leading with prizes only speaks to people who already believe
 *   they can win — which is not who needs convincing.
 */

export const THE_PROMISE = "Every entry gets an AI evaluation.";

/** The three beats of the event, for the landing. The competition page carries all six. */
export const STEPS = [
  { n: "01", label: "Register" },
  { n: "02", label: "Write for 48 hours" },
  { n: "03", label: "Get evaluated" },
];

export const OPEN_TO = "Open to anyone who writes — first script or fiftieth.";

/* `lead` may be a function of the live competition where the copy needs a real date or name. */
export const COPY = {
  dormant: {
    kicker: "The Ckript Challenge",
    line1: "One theme.",
    line2: "48 hours.",
    lead: () =>
      "A finished script in a single weekend. No outline, no second draft — just what you can write "
      + "with the clock running.",
    primary: { label: "Explore Challenge", to: "/challenge" },
    secondary: { label: "See past winners", to: "/challenge?tab=hall-of-fame" },
  },

  announced: {
    kicker: "Next challenge",
    line1: "One theme.",
    line2: "48 hours.",
    lead: (c) => {
      const opens = c?.dates?.regOpensAt
        ? new Date(c.dates.regOpensAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })
        : null;
      return opens
        ? `Registration opens ${opens}. The theme stays sealed until the starting gun.`
        : "Registration opens soon. The theme stays sealed until the starting gun.";
    },
    primary: { label: "Explore Challenge", to: "/challenge" },
    secondary: { label: "See past winners", to: "/challenge?tab=hall-of-fame" },
  },

  registration_open: {
    kicker: "Registration open",
    line1: "One theme.",
    line2: "48 hours.",
    lead: () =>
      "Enter now and the theme reaches you the moment the clock starts. Everyone gets it at once.",
    primary: { label: "Register", to: (c) => `/challenge/register?c=${c.slug}` },
    secondary: { label: "How it works", to: (c) => `/challenge/c/${c.slug}` },
  },

  registration_closed: {
    kicker: "Starting soon",
    line1: "One theme.",
    line2: "48 hours.",
    lead: () => "Entries are in and the theme is sealed. Writing begins shortly.",
    primary: { label: "Explore Challenge", to: "/challenge" },
    secondary: { label: "See past winners", to: "/challenge?tab=hall-of-fame" },
  },

  // Registration is shut, so this is the one phase a newcomer cannot act on. Rather than a dead end,
  // give them the thing that is genuinely interesting this week — the theme is public once the gun
  // fires — and a way to be ready next time.
  live: {
    kicker: "Writing now",
    line1: "The theme is out.",
    line2: "The clock is running.",
    lead: (c) => (c?.theme
      ? `This weekend's theme: "${c.theme}". Entries close when the 48 hours are up.`
      : "Writers around the world are 48 hours into a single theme."),
    primary: { label: "See this year's theme", to: (c) => `/challenge/c/${c.slug}` },
    secondary: { label: "Get ready for the next one", to: "/challenge" },
  },

  judging: {
    kicker: "Judging",
    line1: "Every script.",
    line2: "Every writer.",
    lead: () => "Entries are being read and evaluated. Results within days.",
    primary: { label: "See past winners", to: "/challenge?tab=hall-of-fame" },
    secondary: { label: "Explore Challenge", to: "/challenge" },
  },

  // Deliberately names nobody: a headline built around one writer dates the homepage the moment the
  // next competition runs.
  results: {
    kicker: "Results are in",
    line1: "Meet this year's",
    line2: "winners.",
    lead: () => "Read the record — who won, what they wrote, and how it was judged.",
    primary: { label: "View the Hall of Fame", to: "/challenge?tab=hall-of-fame" },
    secondary: { label: "Explore Challenge", to: "/challenge" },
  },
};

export default COPY;
