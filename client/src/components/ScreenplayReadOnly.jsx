import { useMemo } from "react";
import ScreenplayEditor from "./screenplay/ScreenplayEditor";
import { formatScreenplayLikeText } from "../utils/screenplayText";

// Canonical read-only screenplay renderer. It uses the SAME ScreenplayEditor (CodeMirror) the Create
// Project editor uses, in read-only mode — so a screenplay looks byte-for-byte identical everywhere it
// is shown (create-project preview, producer view, admin view) and matches what the writer authored,
// instead of an approximate <div> re-render that can drift on font/indent/spacing.
export default function ScreenplayReadOnly({ text = "", dark = false, zoom = 1, sheet = true, className = "" }) {
  const value = useMemo(() => formatScreenplayLikeText(text), [text]);
  if (!value.trim()) return null;

  const editor = <ScreenplayEditor value={value} readOnly dark={dark} zoom={zoom} />;

  if (!sheet) return <div className={`relative z-0 ${className}`.trim()}>{editor}</div>;

  return (
    <div
      className={`relative w-full max-w-[760px] max-[1200px]:max-w-none mx-auto shadow-2xl ${dark ? "bg-[#111827]" : "bg-white"} ${className}`.trim()}
      style={{ paddingTop: 56, paddingBottom: 56 }}
    >
      <div className="relative z-0">{editor}</div>
    </div>
  );
}
