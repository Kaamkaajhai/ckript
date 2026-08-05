// @vitest-environment happy-dom
// Proof that the read-only ScreenplayViewer (producer/admin surface) now renders the SAME formatting
// the editor produces: element structure (scene/character/dialogue), inline emphasis (bold/italic/
// underline), centered text, and page breaks — not raw markers / flat text.
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import ScreenplayViewer from "./ScreenplayViewer";

let container, root;
const render = (el) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
  return container;
};
afterEach(() => { act(() => root.unmount()); container.remove(); });

const SAMPLE = [
  "INT. KITCHEN - DAY",
  "",
  "Mary reads a **very important** note.",
  "",
  "MARY",
  "We need to talk about ***everything*** right _now_.",
  "",
  ">THE END<",
  "",
  "===",
  "",
  "EXT. STREET - NIGHT",
  "",
  "She leaves.",
].join("\n");

describe("ScreenplayViewer renders full formatting (producer/admin canonical view)", () => {
  it("classifies elements into their screenplay classes", () => {
    const el = render(<ScreenplayViewer text={SAMPLE} />);
    expect(el.querySelector(".screenplay-line--scene")).toBeTruthy();
    expect(el.querySelector(".screenplay-line--character")).toBeTruthy();
    expect(el.querySelector(".screenplay-line--dialogue")).toBeTruthy();
  });

  it("renders inline emphasis as real styled spans, not raw markers", () => {
    const el = render(<ScreenplayViewer text={SAMPLE} />);
    expect(el.textContent).not.toContain("**");
    expect(el.textContent).not.toContain("***");
    expect(el.textContent).not.toContain("_now_");
    // bold span present
    const bold = Array.from(el.querySelectorAll("span")).find((s) => s.style.fontWeight === "700");
    expect(bold).toBeTruthy();
    const italicBold = Array.from(el.querySelectorAll("span")).find((s) => s.style.fontStyle === "italic" && s.style.fontWeight === "700");
    expect(italicBold?.textContent).toBe("everything");
    const underline = Array.from(el.querySelectorAll("span")).find((s) => s.style.textDecoration === "underline");
    expect(underline?.textContent).toBe("now");
  });

  it("centers >text< and strips the markers", () => {
    const el = render(<ScreenplayViewer text={SAMPLE} />);
    const centered = el.querySelector(".screenplay-line--centered");
    expect(centered).toBeTruthy();
    expect(centered.textContent).toBe("THE END");
    expect(el.textContent).not.toContain(">THE END<");
  });

  it("drops legacy === (page breaks removed) — no divider, no literal ===", () => {
    const el = render(<ScreenplayViewer text={SAMPLE} />);
    expect(el.querySelector(".screenplay-pagebreak")).toBeNull();
    expect(el.textContent).not.toContain("===");
  });
});
