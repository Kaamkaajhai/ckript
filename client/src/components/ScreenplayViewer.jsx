import { useMemo } from "react";
import { formatScreenplayLikeText } from "../utils/screenplayText";
import { textToBlocks, parseInlineEmphasis } from "./screenplay/classify";

const getLineClassName = (type = "", centered = false) => {
  const base = (() => {
    switch (type) {
      case "frontmatter":
        return "screenplay-line screenplay-line--frontmatter";
      case "scene":
        return "screenplay-line screenplay-line--scene";
      case "transition":
        return "screenplay-line screenplay-line--transition";
      case "shot":
        return "screenplay-line screenplay-line--shot";
      case "character":
      case "dual": // dual cue renders like a character cue (Stage 1; pairing is editor-only)
        return "screenplay-line screenplay-line--character";
      case "parenthetical":
        return "screenplay-line screenplay-line--parenthetical";
      case "dialogue":
      case "lyrics":
        return "screenplay-line screenplay-line--dialogue";
      case "action":
      case "sequence":
      case "act":
      case "endact":
      default:
        return "screenplay-line screenplay-line--action";
    }
  })();
  return centered ? `${base} screenplay-line--centered` : base;
};

// Render a line's text with inline Fountain emphasis (*italic* **bold** ***both*** _underline_) as
// real styled spans — the same emphasis the editor shows while typing, via the ONE shared parser.
const renderEmphasis = (text = "") => {
  const runs = parseInlineEmphasis(text);
  if (runs.length === 1 && !runs[0].bold && !runs[0].italic && !runs[0].underline) return text;
  return runs.map((r, i) => {
    if (!r.bold && !r.italic && !r.underline) return r.text;
    const style = {};
    if (r.bold) style.fontWeight = 700;
    if (r.italic) style.fontStyle = "italic";
    if (r.underline) style.textDecoration = "underline";
    return (
      <span key={i} style={style}>
        {r.text}
      </span>
    );
  });
};

export default function ScreenplayViewer({ text = "", className = "" }) {
  // ONE classifier: normalize messy/uploaded text, then classify with the editor's classifier so a
  // line renders here exactly as the editor types it (multi-word cues included). No second parser.
  const blocks = useMemo(() => textToBlocks(formatScreenplayLikeText(text)), [text]);

  if (!blocks.length) return null;

  return (
    <div className={`screenplay-viewer ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "spacer") {
          return <div key={`spacer-${index}`} className="screenplay-spacer" aria-hidden="true" />;
        }

        return (
          <div key={`${block.type}-${index}`} className={getLineClassName(block.type, block.centered)}>
            {renderEmphasis(block.text)}
          </div>
        );
      })}
    </div>
  );
}
