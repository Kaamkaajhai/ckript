/*
 * icons.jsx — Material Symbols helper for the 2B dashboard shell.
 *
 * The reference design (Ckript Dashboard 2B) renders every shell icon with
 * Google's "Material Symbols Outlined" webfont (loaded once in index.html).
 * Using the font — rather than hand-drawn SVG paths — keeps us pixel-faithful
 * to the reference and lets a single component control weight / fill / grade.
 */

// Semantic name → Material Symbol ligature. Centralised so a rename only
// happens in one place and call sites stay readable.
export const SYMBOLS = {
  menu:         "menu",
  dashboard:    "dashboard",
  home:         "home",
  create:       "add_circle",
  ideas:        "lightbulb",
  add:          "add",
  upload:       "upload",
  messages:     "chat",
  projects:     "movie",
  search:       "search",
  logout:       "logout",
  bell:         "notifications",
  chevronDown:  "expand_more",
  chevronLeft:  "chevron_left",
  chevronRight: "chevron_right",
  collapseLeft: "keyboard_double_arrow_left",
  profile:      "person",
  contact:      "mail",
  terms:        "description",
  shield:       "shield",
  close:        "close",
  analytics:    "insights",
  sparkles:     "auto_awesome",
  offers:       "gavel",
  writers:      "groups",
  featured:     "star",
  top:          "leaderboard",
};

/**
 * <MatIcon name="dashboard" size={24} weight={400} fill={false} />
 *
 * `name` accepts either a semantic key from SYMBOLS or a raw ligature.
 */
export const MatIcon = ({
  name,
  size = 24,
  weight = 400,
  fill = false,
  grade = 0,
  className = "",
  style,
  ...rest
}) => {
  const ligature = SYMBOLS[name] || name;
  return (
    <span
      className={`material-symbols-outlined${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{
        fontSize: size,
        lineHeight: 1,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size}`,
        ...style,
      }}
      {...rest}
    >
      {ligature}
    </span>
  );
};

export default MatIcon;
