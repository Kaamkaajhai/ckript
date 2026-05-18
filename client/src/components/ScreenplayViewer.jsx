import { useMemo } from "react";
import { parseScreenplayBlocks } from "../utils/screenplayText";

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
      return "screenplay-line screenplay-line--character";
    case "parenthetical":
      return "screenplay-line screenplay-line--parenthetical";
    case "dialogue":
      return "screenplay-line screenplay-line--dialogue";
    case "action":
    default:
      return "screenplay-line screenplay-line--action";
  }
};

export default function ScreenplayViewer({ text = "", className = "" }) {
  const blocks = useMemo(() => parseScreenplayBlocks(text), [text]);

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
