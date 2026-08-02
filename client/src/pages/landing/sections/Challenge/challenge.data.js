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

export const HERO_LINES = ["A sealed theme, a shared clock —", "and whatever you make of it."];

export const LEAD =
  "Nobody sees the theme early and nobody gets extra time. You write in the Ckript editor, every "
  + "entry is read and evaluated, and the strongest stories are recorded in the Hall of Fame.";

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
    // The AI-evaluation claim moved to ENTRANT_GETS, which states it in detail. Repeating it here
    // made the same promise twice within about 600px of scroll.
    body: "The strongest stories earn awards, recognition and a permanent place in Ckript's Hall "
      + "of Fame.",
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
   "there is a shape to this" and nothing more.

   "Enter", not "Register": while registration is open the word "Register" would otherwise appear
   twice within one screen — once as an inert step label, once as the live call to action. */
export const FLOW = ["Enter", "Write", "Submit", "Results"];

export const CTA = {
  headline: "Think you have a story?",
  line: "The next challenge could begin any time.",
  label: "Explore Challenge",
  to: "/challenge",
};

/* ── /challenges page copy ───────────────────────────────────────────────────────────────────────
   Everything below serves the prospectus page only. It is deliberately STATIC and evergreen: a
   competition runs three or four times a year, so `dormant` is what most visitors see, and any copy
   that only makes sense mid-event would be wrong most of the time. Nothing here restates the hub —
   eligibility, judging criteria, prizes, judges, sponsors and the dated timeline live there. */

/* The one sentence the page says when nothing is running. It has to answer "is this dead?" without
   claiming a cadence — see the note at the top of this file. */
export const DORMANT_STATUS = "No challenge is open right now.";
export const DORMANT_STATUS_SUB =
  "Challenges run in windows — the next one is announced here first.";

/* The masthead motif: ten pages, one of them claimed. Carries "the same blank page, for everyone"
   without a word of explanation, and unlike a headline number it says something a sentence cannot. */
export const PAGE_STRIP = { count: 10, marked: 3 };

/* Register → results, in six beats. The hub owns the dated timeline; this is only the shape. */
export const STEPS = [
  { label: "Register", sub: "An account and the entry fee" },
  { label: "Theme released", sub: "Sealed until the start — nobody sees it early" },
  { label: "Write", sub: "48 hours, inside the Ckript editor with autosave" },
  { label: "Submit", sub: "Locks at the deadline" },
  { label: "AI review", sub: "Every entry is read and evaluated" },
  { label: "Results", sub: "Awards, recorded in the Hall of Fame" },
];

/* What every entrant receives, whether or not they place. The answer to "why enter if I probably
   will not win?", which no other marketing surface gives.

   Every line is backed by shipped behaviour: the AI read by competitionAI.js, the certificate by
   getCompetitionCertificate (which gates on `status === "judged"`, hence "every entry that is
   judged" — an unsubmitted registration is refused), and the ownership terms by Competition.js. */
/* What every entrant receives, whether or not they place — the answer to "why enter if I probably
   will not win?", which no other surface gives.

   Every claim is backed by shipped behaviour: the AI read by competitionAI.js; the certificate by
   getCompetitionCertificate, which gates on `status === "judged"` — hence "every entry that is
   judged", never "every entry", since an unsubmitted registration is refused; the badge by the
   award badges granted in competitionAdminController.js.

   `icon` values are Material Symbols ligatures. A ligature the font lacks renders as its own
   literal NAME, so any new icon here has to be checked in a browser, not just in the build. */
export const REWARDS = [
  {
    icon: "rate_review",
    title: "An AI evaluation",
    body: "A generated logline, a synopsis and a scored evaluation — for every submitted script, "
      + "not only the ones that place.",
  },
  {
    icon: "workspace_premium",
    title: "A certificate",
    body: "Issued for every entry that is judged. It records the challenge, the year and your "
      + "finished script.",
  },
  {
    icon: "military_tech",
    title: "A badge on your profile",
    body: "Placing earns a badge that sits on your public Ckript profile, next to your competition "
      + "history — visible to producers browsing your work.",
  },
  {
    icon: "trophy",
    title: "Awards & recognition",
    body: "The strongest stories earn awards and a permanent place in Ckript's Hall of Fame.",
  },
];

/* The ownership promise, set as one quiet line under the cards rather than as a fourth card — it is
   a reassurance, not a reward, and giving it a card would have made it compete with them. */
export const OWNERSHIP_NOTE =
  "Your script stays yours throughout — a private draft in your own library, locked while it is "
  + "judged and released back to you when results are declared.";

/* The three facts a prospectus owes a reader before they commit. Set as a definition list, not
   cards: these are terms, and terms are read, not scanned. */
export const ENTRY_TERMS = [
  { term: "Entry fee", detail: "₹98 (INR) or $2 (USD), once, per challenge." },
  { term: "Who can enter", detail: "Writers, with a Ckript account. Reader and investor accounts cannot register." },
  { term: "What you submit", detail: "One original screenplay, written inside the window." },
  { term: "The window", detail: "48 hours, fixed. The deadline does not move for anyone." },
];

/* Static and evergreen on purpose — NOT the hub's admin-authored `faq[]`, which is per-competition
   and therefore empty exactly when most visitors arrive. */
export const QUESTIONS = [
  {
    q: "Do I need experience?",
    a: "No. Anyone who writes — wherever you are, whatever you have written before. Students, "
      + "first-time writers and working professionals enter the same challenge.",
    link: { to: "/writer-onboarding", label: "How writing on Ckript works" },
  },
  {
    q: "Who owns what I write?",
    a: "You do. Your entry is a private draft in your library throughout, and it is released back "
      + "to you when results are declared. Winning does not publish it.",
    link: { to: "/terms-of-service", label: "The full terms" },
  },
  {
    q: "What happens if I don't place?",
    a: "Your entry is still read and evaluated, and your certificate is still issued.",
    link: { to: "/challenge", label: "How judging works" },
  },
  {
    q: "When is the next one?",
    a: "There is no fixed calendar. A challenge is announced here first, and the date appears at "
      + "the top of this page the moment it does.",
    link: null,
  },
];

/* Where a reader goes from the bottom of the page. Three described destinations rather than one
   button, because the page's job ends by handing off — the hub informs, this page persuades. */
export const DESTINATIONS = [
  { title: "The challenge hub", to: "/challenge", body: "Live and past challenges, the full rules, prizes, judges and FAQ." },
  { title: "Hall of Fame", to: "/hall-of-fame", body: "Every writer Ckript has honoured, by challenge and by year." },
  { title: "Questions about Ckript", to: "/faq", body: "How the platform works, for writers and for producers." },
];

/**
 * The page's two actions, for a given phase.
 *
 * ONE resolver, consumed by the masthead and the closing ask, so the page can never offer a
 * different primary at the top and the bottom. Before this, `registration_open` fired three
 * competing destinations with no hierarchy between them.
 *
 * `announced` and `registration_closed` deliberately carry no register action — the hub disables
 * its own button in those phases, and offering one here would lead to a dead end.
 *
 * `needsAuth` is true only while registration is open, because registering requires a WRITER
 * account: the server 403s readers and investors, so sending a signed-out visitor straight to the
 * form would fail after they filled it in.
 */
export const resolveActions = (phase, competition) => {
  const slug = competition?.slug;
  const hall = { label: "See the Hall of Fame", to: "/hall-of-fame" };
  const details = slug
    ? { label: "Read the details", to: `/challenge/c/${slug}` }
    : { label: "Explore the challenge", to: "/challenge" };

  if (!slug) {
    return { primary: hall, secondary: { label: "Past challenges", to: "/challenge" } };
  }

  switch (phase) {
    case "registration_open":
      return {
        primary: { label: "Register", to: `/challenge/register?c=${slug}`, needsAuth: true },
        secondary: details,
      };
    case "live":
      return { primary: { label: "See the theme", to: `/challenge/c/${slug}` }, secondary: hall };
    case "judging":
      return { primary: { label: "Follow the judging", to: `/challenge/c/${slug}` }, secondary: hall };
    case "results":
      return { primary: { label: "See the results", to: `/challenge/c/${slug}` }, secondary: hall };
    case "announced":
    case "registration_closed":
      return { primary: details, secondary: hall };
    default:
      return { primary: hall, secondary: { label: "Past challenges", to: "/challenge" } };
  }
};
