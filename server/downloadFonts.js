// Fetch the Courier Prime family used by the screenplay PDF exporter.
//
// Run from the server directory:  node downloadFonts.js
//
// This previously downloaded GitHub HTML pages instead of fonts and wrote them to disk as .ttf,
// which is how a set of corrupt fonts ended up committed — PDF export then died with "Unknown font
// format". Two things prevent a repeat:
//   • hit raw.githubusercontent.com directly rather than github.com/.../raw/... (which redirects,
//     and the old code opened its write stream *before* handling the redirect, so two streams
//     interleaved into one file), and
//   • validate the sfnt magic number in memory and only write once the bytes really are a TrueType
//     font. A bad response now fails loudly instead of silently poisoning the asset.

import fs from "fs";
import path from "path";

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");
// Upstream restructured: the fonts moved from `ttf/Courier Prime*.ttf` to `fonts/ttf/CourierPrime-*.ttf`.
// The old paths now 404, which is the other half of why this script produced garbage.
const BASE = "https://raw.githubusercontent.com/quoteunquoteapps/CourierPrime/master/fonts/ttf";

const FILES = [
  ["CourierPrime-Regular.ttf", "CourierPrime-Regular.ttf"],
  ["CourierPrime-Bold.ttf", "CourierPrime-Bold.ttf"],
  ["CourierPrime-Italic.ttf", "CourierPrime-Italic.ttf"],
  ["CourierPrime-BoldItalic.ttf", "CourierPrime-BoldItalic.ttf"],
];

// Accepted sfnt signatures: TrueType (0x00010000), 'true', 'ttcf' (collection), 'OTTO' (CFF).
const isFont = (buf) => {
  if (!buf || buf.length < 4) return false;
  const be = buf.readUInt32BE(0);
  const tag = buf.subarray(0, 4).toString("latin1");
  return be === 0x00010000 || tag === "true" || tag === "ttcf" || tag === "OTTO";
};

const fetchFont = async (remote, dest) => {
  const url = `${BASE}/${encodeURIComponent(remote)}`;
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "ckript-font-fetch" } });
  if (!res.ok) throw new Error(`${remote}: HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (!isFont(buf)) {
    const head = buf.subarray(0, 4).toString("hex");
    throw new Error(`${remote}: not a font (starts 0x${head}, ${buf.length} bytes) — refusing to write`);
  }

  fs.writeFileSync(dest, buf);
  return buf.length;
};

const run = async () => {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  for (const [remote, local] of FILES) {
    const size = await fetchFont(remote, path.join(FONTS_DIR, local));
    console.log(`  ok  ${local.padEnd(30)} ${size} bytes`);
  }
  console.log("Fonts downloaded and verified.");
};

run().catch((err) => {
  console.error("Font download failed:", err.message);
  process.exitCode = 1;
});
