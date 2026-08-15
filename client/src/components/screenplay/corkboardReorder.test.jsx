// @vitest-environment happy-dom
//
// DEF-3 — corkboard reorder must not be drag-only (WCAG 2.1.1 / 2.5.7). These tests mount the
// REAL Corkboard and prove four things a keyboard, screen-reader or touch user depends on:
//
//   1. the button path calls onReorder with the SAME (from, to) a drop produces, and the same
//      resulting document text once moveScene applies it — parity, not an approximation;
//   2. the ends are disabled rather than silently no-op, and a locked scene has no path at all;
//   3. the move is announced politely, naming the scene and its new position;
//   4. focus lands on the moved card's control at its NEW index, so repeated presses work.
//
// NOT tested here: the text transform itself (sceneReorder has its own suite) and the card's
// presentation. What is tested is the seam between the controls and onReorder.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Corkboard from "./Corkboard";
import { getScenes } from "./sceneIdentity";
import { moveScene } from "./sceneReorder";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SCRIPT = [
  "Title: Parity",
  "",
  "INT. KITCHEN - DAY",
  "",
  "Ana burns the toast.",
  "",
  "EXT. STREET - NIGHT",
  "",
  "She walks.",
  "",
  "INT. CAR - NIGHT",
  "",
  "He waits.",
  "",
  "EXT. PIER - DAWN",
  "",
  "Nobody is there.",
].join("\n");

let container;
let root;

const render = (props = {}) => {
  act(() => root.render(<Corkboard scenes={getScenes(SCRIPT)} {...props} />));
  return container;
};

const control = (index, name) =>
  container.querySelector(`[data-cork-index="${index}"][data-cork-control="${name}"]`);

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

const announcement = () => container.querySelector('[data-testid="corkboard-announcer"]').textContent;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Corkboard has a non-drag reorder path", () => {
  it("renders Move up / Move down / Move to… on every card, with accessible names carrying the position", () => {
    render({ onReorder: vi.fn() });
    const scenes = getScenes(SCRIPT);
    expect(scenes).toHaveLength(4);
    for (let i = 0; i < scenes.length; i += 1) {
      expect(control(i, "up")).toBeTruthy();
      expect(control(i, "down")).toBeTruthy();
      expect(control(i, "position")).toBeTruthy();
      expect(control(i, "up").getAttribute("aria-label"))
        .toBe(`Move scene ${i + 1} of 4, ${scenes[i].heading} up`);
    }
  });

  it("disables Move up on the first card and Move down on the last, and nothing else", () => {
    render({ onReorder: vi.fn() });
    expect(control(0, "up").disabled).toBe(true);
    expect(control(0, "down").disabled).toBe(false);
    expect(control(3, "up").disabled).toBe(false);
    expect(control(3, "down").disabled).toBe(true);
    expect(control(1, "up").disabled).toBe(false);
    expect(control(2, "down").disabled).toBe(false);
  });

  it("keeps every control at or above the 44x44 CSS px touch target", () => {
    render({ onReorder: vi.fn() });
    // happy-dom does not lay out, so this asserts the declared classes rather than measured
    // boxes — the CDP sweep measures the real geometry. w-11/h-11 is Tailwind's 44px.
    expect(control(0, "down").className).toMatch(/\bw-11\b/);
    expect(control(0, "down").className).toMatch(/\bh-11\b/);
    expect(control(0, "position").className).toMatch(/\bh-11\b/);
  });
});

describe("button reorder is identical to drag reorder", () => {
  it("Move down sends the same (from, to) as dropping card 1 onto card 2", () => {
    const viaButton = vi.fn();
    render({ onReorder: viaButton });
    click(control(1, "down"));

    act(() => root.unmount());
    container.remove();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const viaDrag = vi.fn();
    render({ onReorder: viaDrag });
    const cards = container.querySelectorAll('[draggable="true"]');
    act(() => {
      cards[1].dispatchEvent(Object.assign(new Event("dragstart", { bubbles: true }), {
        dataTransfer: {},
      }));
    });
    act(() => {
      const over = new Event("dragover", { bubbles: true });
      cards[2].dispatchEvent(over);
      cards[2].dispatchEvent(new Event("drop", { bubbles: true }));
    });

    expect(viaButton).toHaveBeenCalledWith(1, 2);
    expect(viaDrag).toHaveBeenCalledWith(1, 2);
  });

  it("Move up, Move down and Move to position all produce the document moveScene produces", () => {
    const calls = [];
    render({ onReorder: (from, to) => calls.push([from, to]) });

    click(control(2, "up"));
    expect(calls.at(-1)).toEqual([2, 1]);
    expect(moveScene(SCRIPT, 2, 1)).toContain("INT. CAR - NIGHT\n\nHe waits.\n\nEXT. STREET - NIGHT");

    click(control(0, "down"));
    expect(calls.at(-1)).toEqual([0, 1]);

    click(control(0, "position"));
    const select = container.querySelector("#cork-move-select-0");
    expect(select).toBeTruthy();
    act(() => {
      select.value = "4";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    click(control(0, "position-commit"));
    // Position 4 (1-based) is toIndex 3 — insert-at semantics, the same index a drop on the
    // fourth card sends, so the displayed position after the move really is 4.
    expect(calls.at(-1)).toEqual([0, 3]);
    const moved = moveScene(SCRIPT, 0, 3);
    expect(getScenes(moved).map((s) => s.heading)).toEqual([
      "EXT. STREET - NIGHT",
      "INT. CAR - NIGHT",
      "EXT. PIER - DAWN",
      "INT. KITCHEN - DAY",
    ]);
  });
});

describe("reorder guards and announcements", () => {
  it("gives a scene locked by another writer no reorder controls at all", () => {
    const scenes = getScenes(SCRIPT);
    const onReorder = vi.fn();
    render({
      onReorder,
      myUserId: "me",
      locks: { [scenes[1].sceneId]: { holderId: "someone-else", holderName: "Ravi" } },
    });
    expect(control(1, "up")).toBeNull();
    expect(control(1, "down")).toBeNull();
    expect(control(1, "position")).toBeNull();
    // …while a lock I hold myself leaves the card fully operable.
    expect(control(0, "up")).toBeTruthy();
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("hides the controls for a read-only viewer", () => {
    render({ onReorder: vi.fn(), canEdit: false });
    expect(control(0, "down")).toBeNull();
    expect(control(2, "position")).toBeNull();
  });

  it("announces the move politely, naming the scene and its new position", () => {
    render({ onReorder: vi.fn() });
    const announcer = container.querySelector('[data-testid="corkboard-announcer"]');
    expect(announcer.getAttribute("aria-live")).toBe("polite");
    expect(announcement()).toBe("");
    click(control(1, "down"));
    expect(announcement()).toBe("Moved EXT. STREET - NIGHT to position 3 of 4.");
    click(control(0, "down"));
    expect(announcement()).toBe("Moved INT. KITCHEN - DAY to position 2 of 4.");
  });

  it("announces a drop too, so the same move is not silent depending on how it was made", () => {
    render({ onReorder: vi.fn() });
    const cards = container.querySelectorAll('[draggable="true"]');
    act(() => {
      cards[0].dispatchEvent(Object.assign(new Event("dragstart", { bubbles: true }), { dataTransfer: {} }));
    });
    act(() => {
      cards[2].dispatchEvent(new Event("dragover", { bubbles: true }));
      cards[2].dispatchEvent(new Event("drop", { bubbles: true }));
    });
    expect(announcement()).toBe("Moved INT. KITCHEN - DAY to position 3 of 4.");
  });
});

describe("focus survives the reorder", () => {
  // The grid re-keys on every move (sceneId embeds the index), so without explicit restoration
  // focus falls to <body> and a second press is impossible without re-navigating.
  const reorderable = () => {
    let text = SCRIPT;
    const rerender = () => act(() => root.render(
      <Corkboard scenes={getScenes(text)} onReorder={(from, to) => { text = moveScene(text, from, to); rerender(); }} />,
    ));
    rerender();
    return () => text;
  };

  it("keeps focus on Move down at the card's new index, so repeated presses walk the scene", () => {
    const currentText = reorderable();
    control(0, "down").focus();
    click(control(0, "down"));
    expect(document.activeElement?.getAttribute("data-cork-control")).toBe("down");
    expect(document.activeElement?.getAttribute("data-cork-index")).toBe("1");

    click(document.activeElement);
    expect(document.activeElement?.getAttribute("data-cork-index")).toBe("2");
    expect(getScenes(currentText()).map((s) => s.heading)).toEqual([
      "EXT. STREET - NIGHT",
      "INT. CAR - NIGHT",
      "INT. KITCHEN - DAY",
      "EXT. PIER - DAWN",
    ]);
  });

  it("falls back to the opposite arrow when the pressed control becomes disabled at the end", () => {
    reorderable();
    control(2, "up").focus();
    click(control(2, "up"));
    expect(document.activeElement?.getAttribute("data-cork-index")).toBe("1");
    click(document.activeElement); // now at index 1 → moves to 0, where "Move up" is disabled
    expect(document.activeElement?.getAttribute("data-cork-index")).toBe("0");
    expect(document.activeElement?.getAttribute("data-cork-control")).toBe("down");
  });

  it("Escape closes the position form and returns focus to the button that opened it", () => {
    render({ onReorder: vi.fn() });
    const opener = control(1, "position");
    opener.focus();
    click(opener);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    const select = container.querySelector("#cork-move-select-1");
    select.focus();
    act(() => {
      select.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector("#cork-move-select-1")).toBeNull();
    expect(document.activeElement?.getAttribute("data-cork-control")).toBe("position");
    expect(document.activeElement?.getAttribute("data-cork-index")).toBe("1");
  });

  it("labels the position select so it is not an unnamed control", () => {
    render({ onReorder: vi.fn() });
    click(control(0, "position"));
    const label = container.querySelector('label[for="cork-move-select-0"]');
    expect(label).toBeTruthy();
    expect(label.textContent.trim()).toBe("Position");
    expect(container.querySelector("#cork-move-select-0").options).toHaveLength(4);
  });
});

describe("the card's own accessible details", () => {
  /*
   * Every assertion here is a defect the 2026-08-11 five-width CDP sweep FOUND
   * once the board was first rendered on a phone — none was reasoned about.
   * They are pinned in jsdom so the next regression does not need a browser to
   * be caught, and they were live on desktop too: this component had simply
   * never been measured.
   */
  it("names the synopsis field, which a placeholder does not do — and cannot on a locked card", () => {
    const scenes = getScenes(SCRIPT);
    render({
      onReorder: vi.fn(),
      myUserId: "me",
      locks: { [scenes[1].sceneId]: { holderId: "other", holderName: "Ravi" } },
    });
    const fields = container.querySelectorAll("textarea");
    expect(fields[0].getAttribute("aria-label")).toBe("One-line summary for INT. KITCHEN - DAY");
    // The locked card renders NO placeholder, so before this the control had
    // nothing at all to announce.
    expect(fields[1].getAttribute("placeholder")).toBe("");
    expect(fields[1].getAttribute("aria-label")).toBe("One-line summary for EXT. STREET - NIGHT");
  });

  it("gives the scene-opening heading a real target height, not a 22px line of text", () => {
    render({ onReorder: vi.fn() });
    // Measured at 22px across all 15 sweep states — under the 44px product floor
    // and under WCAG 2.5.8's 24px, on the most-tapped control on the card.
    expect(control(0, "heading").className).toMatch(/\bmin-h-11\b/);
  });

  it("keeps the collaborator's assigned colour off text, where it cannot be measured in advance", () => {
    const scenes = getScenes(SCRIPT);
    render({
      onReorder: vi.fn(),
      myUserId: "me",
      locks: { [scenes[0].sceneId]: { holderId: "other", holderName: "Ravi", color: "#c46a3f" } },
    });
    const badge = Array.from(container.querySelectorAll("span")).find((el) => el.title === "Locked by Ravi");
    expect(badge.textContent).toContain("Ravi");
    // The label measured 3.83:1 against a 4.5:1 floor when it wore the holder
    // colour. The colour moved to the icon, which as a graphical object needs
    // only 3:1 — and which is where the identity cue belongs anyway.
    expect(badge.getAttribute("style")).toBeNull();
    expect(badge.querySelector("svg").getAttribute("style")).toContain("#c46a3f");
  });

  it("keeps every label at or above the 11px floor", () => {
    const scenes = getScenes(SCRIPT);
    render({
      onReorder: vi.fn(),
      myUserId: "me",
      locks: { [scenes[0].sceneId]: { holderId: "other", holderName: "Ravi" } },
    });
    const tiny = Array.from(container.querySelectorAll("*"))
      .filter((el) => /text-\[10px\]/.test(typeof el.className === "string" ? el.className : ""));
    expect(tiny).toHaveLength(0);
  });
});
