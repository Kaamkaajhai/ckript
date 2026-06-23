import { useMemo } from "react";
import { formatScreenplayLikeText } from "../utils/screenplayText";
import { textToBlocks } from "./screenplay/classify";

const getLineClassName = (type = "") => {
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
          <div key={`${block.type}-${index}`} className={getLineClassName(block.type)}>
            {block.text}
          </div>
        );
      })}
    </div>
  );
}
