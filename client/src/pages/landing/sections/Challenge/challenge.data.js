/* Copy for the landing's Challenge sequence.
 *
 * FIVE BEATS, and the division of labour is the whole point:
 *
 *   Landing        inspire and convert — one feeling per beat, nothing to read
 *   /challenge     inform and guide — six steps, judging criteria, ownership, eligibility
 *   /challenge/c/  manage a specific event — register, theme, deadline, submit
 *
 * So there are no numbered steps here, no judging criteria, no ownership paragraphs and no tab
 * strip. Long-form content lives in exactly one place, which is what stops the two surfaces
 * drifting apart. A visitor should think "interesting", not "I am reading documentation".
 *
 * Deliberately evergreen: competitions run three or four times a year, so copy that only makes
 * sense while one is open would be wrong most of the time. Urgency belongs to ChallengeStrip,
 * which only renders when there is something to be urgent about. No cadence is ever claimed —
 * "three times a year" would be wrong the first time a fourth runs, and the homepage is the last
 * place anyone remembers to correct.
 */

export const KICKER = "The Ckript Challenge";

/* The number is the section's one strong visual. Set as an object rather than a string so the unit
   can be tracked and coloured separately from the numeral. */
export const HERO_FIGURE = { value: "48", unit: "Hours" };

export const HERO_LINES = ["One Theme.", "Every Writer Starts Together."];

export const LEAD =
  "A single theme is revealed. Every writer has forty-eight hours to turn it into a screenplay. "
  + "Every submission receives an AI evaluation, while the strongest stories earn awards, "
  + "recognition and a permanent place in Ckript's Hall of Fame.";

/* Three cards, one idea each. `icon` values are Material Symbols ligatures — `lock` is already
   proven elsewhere on this landing; the other two are core glyphs. A ligature the font lacks
   renders as its own literal name, so any new icon here must be checked in a browser, not just in
   the build. */
export const CARDS = [
  {
    icon: "lock",
    title: "One Theme",
    body: "Nobody knows the prompt before the timer starts. Every participant begins with the same "
      + "blank page.",
  },
  {
    icon: "timer",
    title: "48 Hours",
    body: "Write inside the Ckript editor with autosave, live progress and a deadline that cannot "
      + "move.",
  },
  {
    icon: "trophy",
    title: "Every Story Matters",
    body: "Every script receives an AI evaluation. The best stories earn awards and become part of "
      + "Ckript history.",
  },
];

/* Two quiet facts set beside the laureate. Deliberately NOT a statistics band: the real figures are
   still in single digits, and "1 script written" on a homepage advertises that nothing has happened
   yet. These two are true from the very first entrant. */
export const WINNER_FACTS = [
  { label: "AI evaluation", value: "Every entry received feedback" },
  { label: "Written in", value: "48 hours" },
];

/* Examples, never a gate. Nobody should self-exclude because their own label is missing, so this
   list stays short and obviously illustrative — the real eligibility rules live on /challenge. */
export const ENTRY_CHIPS = ["Student", "First Script", "Professional", "Screen", "TV", "Anime"];

/* Four beats, not the hub's six, and no ordinals: numbers are the documentation signal. This says
   "there is a shape to this" and nothing more. */
export const FLOW = ["Register", "Write", "Submit", "Results"];

export const CTA = {
  headline: "Think you have a story?",
  line: "The next challenge could begin any time.",
  label: "Explore Challenge",
  to: "/challenge",
};
