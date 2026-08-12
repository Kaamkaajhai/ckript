import { useMemo, useState } from "react";
import Button from "../../../components/buttons/Button";
import EmptyState from "../../../components/EmptyState";
import List from "../../../components/lists/List";
import ListRow from "../../../components/lists/ListRow";
import Sheet from "../../../components/overlays/Sheet";
import Tabs, { TabPanel } from "../../../components/tabs/Tabs";
import {
  buildNavigatorPages,
  buildNavigatorScenes,
  buildNavigatorTabs,
  NAVIGATOR_TAB,
} from "../navigatorModel";

/*
 * NavigatorSheet — the desktop left rail, as a jump list
 * (plan §11 Phase 3 bullet 4, decision D16).
 *
 * Its classes live under `ckm-editor__nav-*` and its rules in `Editor.css`,
 * following `TitlePageDialog`'s precedent: an overlay belongs to the page
 * family that summons it, so §7.2 gains no prefix for a surface that is part of
 * the editor.
 *
 * D16 — AND IT IS A SHEET, WHICH IS WHY D15 IS A RULE AND NOT "EVERYTHING IS A
 * DIALOG NOW".
 * -----------------------------------------------------------------------------
 * D15 says: choose by what the surface REPLACES. The corkboard replaces the
 * script page, so it is a Dialog. The navigator does not replace anything — it
 * is a list you open, pick a destination from, and leave. The script is still
 * the thing you are doing, and the strip of scrim above a bottom sheet is
 * exactly the statement "the thing you were doing is still there". A short,
 * contextual task, in Sheet.jsx's own words.
 *
 * WHAT DID NOT COME ACROSS, AND WHY
 * ---------------------------------
 *   • Desktop's Page ⇄ Cards toggle. Scene cards is its own overflow entry
 *     (D15); putting a second door to it inside the navigator would mean two
 *     entry points to one surface and two places to keep in sync.
 *   • The rail's persistent open/closed state. A rail is furniture that stays;
 *     a sheet is summoned. There is nothing to persist.
 *
 * WHAT CAME ACROSS THAT WAS MISSING ENTIRELY (DEF-13)
 * ---------------------------------------------------
 * The Pages tab's title-page button. On mobile the title page could only be
 * edited by TAPPING THE TITLE PAGE — which is only rendered when one already
 * exists. So a writer with no title page had no way to make one, on a route
 * that has been live since 2026-08-09. Desktop puts the control here, and so
 * does this.
 *
 * ONE ROW, ONE DESTINATION
 * ------------------------
 * Every row closes the sheet and then scrolls, in that order and for the reason
 * the corkboard's scene-open has it: moving the caret under a surface the
 * writer is still looking at is a jump they cannot see happen.
 */
export default function NavigatorSheet({
  open = false,
  onClose = null,
  outline = [],
  screenplayValue = "",
  locks = {},
  myUserId = null,
  presenceBySceneId = {},
  hasTitlePage = false,
  onConfigureTitlePage = null,
  onGoToLine = null,
  returnFocusTo = null,
}) {
  const [tab, setTab] = useState(NAVIGATOR_TAB.SCENES);

  const scenes = useMemo(
    () => buildNavigatorScenes(outline, { locks, myUserId, presenceBySceneId }),
    [outline, locks, myUserId, presenceBySceneId],
  );
  /* Pagination walks the whole document, so it is derived only while the sheet
     is open — a navigator nobody opened must not cost a 100-page repaginate on
     every keystroke of the editor behind it (§15). */
  const pages = useMemo(
    () => (open ? buildNavigatorPages(screenplayValue, { hasTitlePage }) : []),
    [open, screenplayValue, hasTitlePage],
  );
  const tabs = buildNavigatorTabs(scenes, pages);

  const go = (line) => {
    onClose?.();
    requestAnimationFrame(() => onGoToLine?.(line));
  };

  const sceneRows = scenes.filter((row) => row.kind === "scene");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Navigator"
      description="Jump to a scene or a page."
      closeLabel="Close the navigator"
      returnFocusTo={returnFocusTo}
      className="ckm-editor__nav"
      bodyClassName="ckm-editor__nav-body"
    >
      <Tabs
        tabsId="ckm-editor-nav"
        label="Navigate by"
        fitted
        value={tab}
        onChange={setTab}
        tabs={tabs.map((entry) => ({ id: entry.id, label: `${entry.label} (${entry.count})` }))}
      />

      <TabPanel tabsId="ckm-editor-nav" id={NAVIGATOR_TAB.SCENES} value={tab}>
        {sceneRows.length === 0 ? (
          <EmptyState
            icon="movie"
            title="No scenes yet"
            body="Add an INT./EXT. heading on the page and it will appear here."
          />
        ) : (
          <List label="Scenes">
            {scenes.map((row) => (row.kind === "sequence" ? (
              /* A sequence is a heading AND a destination on desktop, so it stays
                 a row rather than becoming a decorative section label. */
              <ListRow
                key={row.key}
                className="ckm-editor__nav-sequence"
                title={row.text}
                onClick={() => go(row.line)}
              />
            ) : (
              <ListRow
                key={row.key}
                title={row.text}
                subtitle={row.lock?.byOther ? `Locked by ${row.lock.holderName || "another writer"}` : ""}
                onClick={() => go(row.line)}
                leading={(
                  <span className="ckm-editor__nav-num" aria-hidden="true">{row.number}</span>
                )}
                trailing={<RowStatus row={row} />}
              />
            )))}
          </List>
        )}
      </TabPanel>

      <TabPanel tabsId="ckm-editor-nav" id={NAVIGATOR_TAB.PAGES} value={tab}>
        {/* DEF-13: the ONLY way to add a title page on mobile. */}
        <div className="ckm-editor__nav-title-action">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { onClose?.(); requestAnimationFrame(() => onConfigureTitlePage?.()); }}
          >
            {hasTitlePage ? "Edit title page" : "Add a title page"}
          </Button>
        </div>

        <List label="Pages">
          {pages.map((row) => (
            <ListRow
              key={row.key}
              title={row.label}
              onClick={row.kind === "title"
                ? () => { onClose?.(); requestAnimationFrame(() => onConfigureTitlePage?.()); }
                : () => go(row.line)}
              leading={(
                <span
                  className={`ckm-editor__nav-page${row.kind === "title" ? " ckm-editor__nav-page--title" : ""}`}
                  aria-hidden="true"
                >
                  {row.badge}
                </span>
              )}
            />
          ))}
        </List>
      </TabPanel>
    </Sheet>
  );
}

/*
 * Lock beats presence, as on desktop: a held scene is the more urgent fact, and
 * stacking both makes a 320px row unreadable. The lock is TEXT in the row's
 * subtitle as well as this glyph — a colour and an icon are not a status (§14).
 */
function RowStatus({ row }) {
  if (row.lock) {
    return (
      <span className="ckm-editor__nav-lock" style={row.lock.color ? { color: row.lock.color } : undefined}>
        <span className="material-symbols-outlined" aria-hidden="true">lock</span>
      </span>
    );
  }
  if (row.presence.length === 0) return null;
  return (
    <span className="ckm-editor__nav-presence">
      {row.presence.map((person) => (
        <span
          key={person.userId}
          className="ckm-editor__nav-dot"
          style={{ backgroundColor: person.color }}
          title={person.name}
        />
      ))}
      <span className="ckm-sr-only">
        {row.presence.length === 1
          ? `${row.presence[0].name} is here`
          : `${row.presence.length} writers are here`}
      </span>
    </span>
  );
}
