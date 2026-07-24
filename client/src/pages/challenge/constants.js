// Copy and option lists for the competition screens.

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "professional", label: "Professional" },
];

export const JUDGING_CRITERIA = [
  "Originality",
  "Story & structure",
  "Character & dialogue",
  "Theme interpretation",
  "Craft and formatting",
];

export const SUBMIT_CHECKLIST = [
  { key: "confirmOriginal", label: "This is my own original work, written during the competition window." },
  { key: "confirmFinal", label: "I have reviewed my script and understand submission is final — the script locks and cannot be edited." },
];

export const PARTICIPANT_COMPLETION_MESSAGE = (name) =>
  `Thank you for competing in the ${name}. Finishing a script in 48 hours is a real achievement — your AI evaluation and story materials are yours to keep, and your script stays in your Ckript library.`;

export const STUDIO_LOCKED_MESSAGE = "The Script Studio unlocks when the competition begins.";

export const WRITING_RESOURCES = [
  {
    title: "Writing under time pressure",
    body: "Outline before you draft. Two hours spent on beats saves ten hours of rewriting, and a rough scene you can fix beats a perfect scene you never reach.",
  },
  {
    title: "Fountain formatting basics",
    body: "Scene headings start with INT./EXT., character cues are written in CAPS on their own line, and everything else is action. The editor handles the rest of the formatting for you.",
  },
  {
    title: "Structure in 48 hours",
    body: "Aim for a clear want, a hard obstacle, and a cost. Judges read for a story that lands, not for page count — a tight short beats a sprawling half-feature.",
  },
];

export const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Bangladesh", "Belgium", "Brazil", "Bulgaria", "Canada",
  "Chile", "China", "Colombia", "Croatia", "Czechia", "Denmark", "Egypt", "Estonia", "Finland",
  "France", "Germany", "Ghana", "Greece", "Hungary", "Iceland", "India", "Indonesia", "Iran",
  "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kenya", "Malaysia", "Mexico", "Morocco",
  "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Serbia", "Singapore",
  "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden",
  "Switzerland", "Taiwan", "Thailand", "Tunisia", "Turkey", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Vietnam",
];
