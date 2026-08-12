import { paginate } from "../../../components/screenplay/paginate";

/*
 * Ckript Mobile — the Navigator's data model (plan §11 Phase 3 bullet 4, D16).
 *
 * Data, not JSX, for the same reason `editorChrome.js` is: "what does the
 * Scenes tab contain when a scene is locked by someone else?" should be a
 * question a unit test can answer without mounting CodeMirror.
 *
 * BOTH LISTS ARE DERIVED, NEVER STORED. The outline comes from the one
 * classifier (`extractOutline`, via the orchestrator's `outlineWithSceneIds`)
 * and the pages from `paginate` — the same line-based pagination the exported
 * PDF uses. A navigator that cached either would drift from the script the
 * moment the writer typed, which is precisely what it exists to index.
 */

/**
 * Scene rows for the Scenes tab.
 *
 * Sequence headings (Fountain "# ACT ONE") stay in the list as their own kind
 * of row rather than becoming section headers of a `List`: they are TAPPABLE on
 * desktop — they jump to that line — and demoting them to decorative headings
 * would remove a navigation target that exists today.
 *
 * `number` counts scenes only, so it matches the corkboard's card numbers and
 * the numbering a writer sees on the page. Sequences carry `number: null`.
 */
export const buildNavigatorScenes = (outline = [], {
  locks = {},
  myUserId = null,
  presenceBySceneId = {},
} = {}) => {
  let n = 0;
  return outline.map((item, index) => {
    if (item.type === "sequence") {
      return { kind: "sequence", key: `seq-${item.line}-${index}`, line: item.line, text: item.text, number: null };
    }
    n += 1;
    const lock = item.sceneId ? locks[item.sceneId] : null;
    const here = (item.sceneId && presenceBySceneId[item.sceneId]) || [];
    return {
      kind: "scene",
      key: `scene-${item.line}-${index}`,
      line: item.line,
      text: item.text,
      number: n,
      sceneId: item.sceneId || null,
      lock: lock
        ? {
          holderName: lock.holderName || "",
          color: lock.color || null,
          byOther: String(lock.holderId) !== String(myUserId),
        }
        : null,
      // Capped at three on desktop too — a scene with eight people in it is a
      // row of dots, not information.
      presence: here.slice(0, 3).map((p) => ({ userId: p.userId, name: p.name, color: p.color })),
    };
  });
};

/**
 * Page rows for the Pages tab, plus the title page when the script has one.
 *
 * The label is the first meaningful line on the page, which is what makes a
 * list of page numbers navigable at all — "12" tells a writer nothing, "12 ·
 * INT. CAR - NIGHT" tells them whether it is the page they meant.
 */
export const buildNavigatorPages = (text = "", { hasTitlePage = false } = {}) => {
  const rows = [];
  if (hasTitlePage) rows.push({ kind: "title", key: "title-page", line: 1, badge: "Title", label: "Title page" });

  const lines = String(text).split("\n");
  const { pageStarts } = paginate(text || "");
  pageStarts.forEach((startIdx, i) => {
    const endIdx = i + 1 < pageStarts.length ? pageStarts[i + 1] : lines.length;
    let label = "";
    for (let l = startIdx; l < endIdx; l += 1) {
      const t = lines[l].trim();
      if (t && t !== "===") { label = t; break; }
    }
    rows.push({
      kind: "page",
      key: `page-${i + 1}`,
      page: i + 1,
      // 1-based, because that is what `scrollToLine` takes.
      line: startIdx + 1,
      badge: String(i + 1),
      label: label || "(blank page)",
    });
  });
  return rows;
};

/**
 * The tab set, with its counts.
 *
 * The counts are the reason this is a function rather than a constant: a tab
 * that says "Pages" is a guess, and a tab that says "Pages 14" is an answer to
 * the question the writer opened the navigator to ask.
 */
export const buildNavigatorTabs = (scenes = [], pages = []) => [
  { id: "scenes", label: "Scenes", count: scenes.filter((row) => row.kind === "scene").length },
  { id: "pages", label: "Pages", count: pages.filter((row) => row.kind === "page").length },
];

export const NAVIGATOR_TAB = Object.freeze({ SCENES: "scenes", PAGES: "pages" });
