import { describe, expect, it } from "vitest";
import { getScenes } from "../../../components/screenplay/sceneIdentity";
import { extractOutline } from "../../../components/screenplay/screenplayMode";
import {
  buildNavigatorPages,
  buildNavigatorScenes,
  buildNavigatorTabs,
} from "./navigatorModel";

/*
 * The Navigator's data, tested without a browser. What is worth pinning is the
 * arithmetic a reader cannot check by eye — scene numbering across sequence
 * headings, which line a page row jumps to, and which of lock/presence wins on
 * a row — plus the promise both lists make: they are derived from the script,
 * never stored, so they cannot drift from it.
 */

const SCRIPT = [
  "Title: The Board",
  "",
  "# ACT ONE",
  "",
  "INT. KITCHEN - DAY",
  "",
  "Ana burns the toast.",
  "",
  "EXT. STREET - NIGHT",
  "",
  "She walks.",
  "",
  "# ACT TWO",
  "",
  "INT. CAR - NIGHT",
  "",
  "He waits.",
].join("\n");

/*
 * The component is fed `outlineWithSceneIds`, not the bare outline — the ids
 * are what the locks and presence are keyed by. Attaching them here the way
 * `useScreenplayCollab` does is what makes this a fixture and not a fiction.
 */
const outline = () => extractOutline(SCRIPT).map((item) => (
  item.type === "scene"
    ? { ...item, sceneId: getScenes(SCRIPT).find((s) => s.startLine <= item.line && item.line <= s.endLine)?.sceneId }
    : item
));

describe("buildNavigatorScenes", () => {
  it("numbers SCENES only, so a sequence heading never consumes a number", () => {
    const rows = buildNavigatorScenes(outline());
    expect(rows.map((r) => `${r.kind}:${r.number ?? "-"}`)).toEqual([
      "sequence:-", "scene:1", "scene:2", "sequence:-", "scene:3",
    ]);
    // The numbers must be the corkboard's card numbers, or two views of one
    // script disagree about which scene is scene 3.
    expect(rows.filter((r) => r.kind === "scene").map((r) => r.text)).toEqual([
      "INT. KITCHEN - DAY", "EXT. STREET - NIGHT", "INT. CAR - NIGHT",
    ]);
  });

  it("keeps sequence headings as destinations, not decoration", () => {
    const rows = buildNavigatorScenes(outline());
    const acts = rows.filter((r) => r.kind === "sequence");
    expect(acts.map((r) => r.text)).toEqual(["ACT ONE", "ACT TWO"]);
    // They carry a line, which is what makes them tappable — the desktop rail
    // jumps to them and dropping that would remove a target that exists today.
    expect(acts.every((r) => Number.isInteger(r.line) && r.line > 0)).toBe(true);
  });

  it("marks a lock held by someone else, and distinguishes it from my own", () => {
    const ids = getScenes(SCRIPT).map((s) => s.sceneId);
    const rows = buildNavigatorScenes(outline(), {
      myUserId: "me",
      locks: {
        [ids[0]]: { holderId: "other", holderName: "Ravi", color: "#c46a3f" },
        [ids[1]]: { holderId: "me", holderName: "Me" },
      },
    });
    const scenes = rows.filter((r) => r.kind === "scene");
    expect(scenes[0].lock).toEqual({ holderName: "Ravi", color: "#c46a3f", byOther: true });
    expect(scenes[1].lock.byOther).toBe(false);
    expect(scenes[2].lock).toBeNull();
  });

  it("caps presence at three, as the desktop rail does", () => {
    const rows = buildNavigatorScenes(outline(), {
      presenceBySceneId: {
        [getScenes(SCRIPT)[0].sceneId]: [1, 2, 3, 4, 5].map((n) => ({ userId: `u${n}`, name: `W${n}`, color: "#111" })),
      },
    });
    expect(rows.find((r) => r.kind === "scene").presence).toHaveLength(3);
  });

  it("returns nothing rather than inventing a row for a script with no scenes", () => {
    expect(buildNavigatorScenes(extractOutline("Just notes."))).toEqual([]);
  });
});

describe("buildNavigatorPages", () => {
  it("labels each page with its first meaningful line, because a bare number navigates nothing", () => {
    const rows = buildNavigatorPages(SCRIPT);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "page", page: 1, badge: "1", line: 1 });
    expect(rows[0].label).toBe("Title: The Board");
  });

  it("gives every page a 1-based line, which is what scrollToLine takes", () => {
    // Blank-SEPARATED, because `paginate` keeps a run of consecutive non-blank
    // lines together as one block that never splits: 300 unseparated lines are
    // a single page, which is the pagination being right and a first draft of
    // this fixture being wrong. 300 separated action lines are several pages —
    // enough that an off-by-one in the line base lands on the wrong one.
    const long = Array.from({ length: 300 }, (_, i) => `Action line ${i + 1}.`).join("\n\n");
    const rows = buildNavigatorPages(long);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0].line).toBe(1);
    for (const row of rows) {
      expect(row.line).toBeGreaterThanOrEqual(1);
      expect(long.split("\n")[row.line - 1]).toBe(row.label);
    }
  });

  it("adds the title page as its own row only when the script has one", () => {
    expect(buildNavigatorPages(SCRIPT, { hasTitlePage: true })[0])
      .toMatchObject({ kind: "title", badge: "Title", label: "Title page" });
    expect(buildNavigatorPages(SCRIPT, { hasTitlePage: false })[0].kind).toBe("page");
  });
});

describe("buildNavigatorTabs", () => {
  it("counts scenes and pages, not rows — a sequence heading is neither", () => {
    const scenes = buildNavigatorScenes(outline());
    const pages = buildNavigatorPages(SCRIPT, { hasTitlePage: true });
    expect(buildNavigatorTabs(scenes, pages)).toEqual([
      { id: "scenes", label: "Scenes", count: 3 },
      { id: "pages", label: "Pages", count: 1 },
    ]);
  });
});
