import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The brand, for documents the company puts its name on.
 *
 * Two things were wrong with how PDFs used to reach for the logo, and both were invisible in
 * development:
 *
 *   1. The only candidates lived in `client/public`. That path exists in a monorepo checkout and
 *      nowhere else — on a server-only deploy every invoice silently fell back to plain text, so the
 *      documents customers actually received were the unbranded ones.
 *   2. The source art is a letterboxed canvas: the landscape logo is 57% transparent padding across
 *      and 37% down. PDFKit's `fit` measures the padding as part of the image, so a logo given a
 *      132x40 box rendered its ink at roughly 57x25 — a smudge in a large empty rectangle, which is
 *      most of why the header read as generic.
 *
 * `assets/ckript-logo.png` is the same official landscape mark cropped to its ink, committed inside
 * server/ so it deploys with the code. LOGO.ratio is its true aspect, so callers size a box from one
 * dimension and get the other right instead of guessing.
 */

const SERVER_LOGO = path.join(__dirname, "..", "assets", "ckript-logo.png");

// Development fallbacks. Untrimmed, so they will letterbox — correct is better than nothing, and a
// missing asset should degrade rather than throw.
const FALLBACKS = [
  path.join(__dirname, "..", "..", "client", "public", "ckript-logo-landscape-nobg.png"),
  path.join(__dirname, "..", "..", "client", "public", "ckript-logo-official-nobg.png"),
];

const readable = (candidate) => {
  try {
    return fs.existsSync(candidate) && fs.statSync(candidate).size > 0;
  } catch {
    return false;
  }
};

/**
 * The authorised signature that appears on invoices.
 *
 * `yash-sign.png` is the file as supplied; `yash-signature.png` is the same signature cropped to its
 * ink and is what documents use. The crop is not cosmetic — it is the same trap the logo hit above.
 * The source has 8% padding on the left and 12% on the top, and PDFKit measures padding as part of
 * the image, so an untrimmed signature given a box would render small and float away from the rule
 * it is supposed to sit on, with the offset differing at every size.
 *
 * SIGNATURE.ratio is measured from the cropped asset (576x374), so a caller sizing by width gets a
 * height that matches the ink rather than the canvas.
 */
const SERVER_SIGNATURE = path.join(__dirname, "..", "assets", "yash-signature.png");
const SIGNATURE_FALLBACK = path.join(__dirname, "..", "assets", "yash-sign.png");

export const SIGNATURE = {
  /** Width ÷ height of the cropped signature. Measured from the asset, not guessed. */
  ratio: 576 / 374,
  /** Absolute path to the best available signature, or "" when neither is readable. */
  get path() {
    return [SERVER_SIGNATURE, SIGNATURE_FALLBACK].find(readable) || "";
  },
  /** Box for a signature of this width, honouring the real aspect. */
  boxForWidth(width) {
    return [width, Math.round(width / SIGNATURE.ratio)];
  },
};

export const LOGO = {
  /** Width ÷ height of the trimmed mark. Measured from the asset, not guessed. */
  ratio: 1559 / 652,
  /** Absolute path to the best available logo, or "" when none is readable. */
  get path() {
    return [SERVER_LOGO, ...FALLBACKS].find(readable) || "";
  },
  /** True when the trimmed, deploy-safe asset is the one in use. */
  get isTrimmed() {
    return readable(SERVER_LOGO);
  },
  /** Box for a logo of this height, honouring the real aspect. */
  boxForHeight(height) {
    return [Math.round(height * LOGO.ratio), height];
  },
};

/**
 * Ckript's document palette: ink on paper, with one accent.
 *
 * The accent is sampled from the logo itself — the red square that dots the "i" is #D14D37 — so a
 * document and the wordmark on it cannot drift apart. Everything else is a neutral. Blue appears
 * nowhere: the previous invoice was built on navy (#0F2A4A, #0B1D3A and four blue-tinted greys),
 * which belongs to no part of this brand.
 */
export const BRAND = {
  accent: "#D14D37",       // the logo's red — rules, the total, and nothing else
  accentSoft: "#FBF1EF",   // the accent at paper weight, for the one filled panel
  accentLine: "#EBC9C1",

  ink: "#141110",          // near-black, warmed slightly so it sits with the accent
  inkSoft: "#4A423F",      // secondary text
  inkMuted: "#8A807C",     // labels, captions, metadata

  rule: "#DED8D5",         // hairlines
  ruleSoft: "#EFEBE9",     // row separators
  paper: "#FFFFFF",
  paperAlt: "#FAF8F7",     // the faintest banding, warm not blue
};

export default { LOGO, SIGNATURE, BRAND };
