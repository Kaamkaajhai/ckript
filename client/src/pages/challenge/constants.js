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

// Every country a writer can enter from. Deliberately the *common* names people recognise, not the
// formal ISO legal names ("South Korea", not "Korea, Republic of").
//
// This list is the single source of truth for the registration dropdown, and server/utils/countries.js
// holds a byte-identical copy used to validate what actually arrives. There is no "Other" entry on
// purpose: the Hall of Fame publishes a "N countries represented" figure, and a free-text bucket
// would quietly corrupt it.
export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina",
  "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana",
  "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada",
  "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo",
  "Congo (DRC)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti",
  "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti",
  "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Ivory Coast", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait",
  "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
  "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
  "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
  "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
  "Zambia", "Zimbabwe",
];
