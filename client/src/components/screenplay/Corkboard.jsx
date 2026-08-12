import { useEffect, useRef, useState } from "react";
import { headingKey } from "./sceneIdentity";

// Corkboard / index-card view (Phase 4 §2). A grid of cards — one per scene — that the writer
// drags to restructure the script. This is purely a presentation of the SAME script the page
// editor holds: dragging a card calls onReorder(from, to), which rewrites the Fountain text;
// the card list re-derives from that text on the next render.
//
// Rules baked in here:
//   • A scene locked by another writer shows the lock badge and is NOT draggable (Phase 3).
//   • The one-line synopsis is metadata keyed by heading (never part of the script text), so it
//     never exports — see sceneSynopses on the Script model.
//   • Reorder is NEVER drag-only (DEF-3 / WCAG 2.1.1 + 2.5.7). Every card carries Move up /
//     Move down / Move to position controls that call the SAME onReorder(from, to) the drop
//     handler calls, so the keyboard, a screen reader and a touch device all reach the exact
//     transform a mouse drag performs. Drag remains as the shortcut, not the only path.

// The reorder controls drive the same insert-at semantics as moveScene(text, from, to): the
// destination is an index in the POST-REMOVAL ordering, which is exactly the 1-based position
// the card will display afterwards. So "move to position 3" is toIndex 2, with no fudge factor.
const clampIndex = (value, total) => Math.min(Math.max(value, 0), Math.max(total - 1, 0));

export default function Corkboard({
  scenes = [],            // from getScenes(): { index, heading, sceneId, startLine, endLine }
  synopses = {},          // headingKey -> one-line synopsis (metadata, not script text)
  onSynopsisChange,       // (headingKey, value) => void
  onReorder,              // (fromIndex, toIndex) => void
  onOpenScene,            // (startLine) => void — jump to the scene in the page editor
  locks = {},             // sceneId -> { holderId, holderName, color }
  myUserId = null,
  presenceBySceneId = {},
  canEdit = true,
  dark = false,
  // The mobile editor mounts this same board inside a ckm-dialog, where the desktop
  // page padding is doubled by the dialog's own and the root's overflow would be a
  // second scroller inside the dialog's. One class the host owns is the whole seam:
  // it lets the mobile stylesheet restyle a class of its own rather than reach
  // through these Tailwind utilities, which §7.1 forbids.
  className = "",
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  // Which card has its "Move to position" form open, and the position selected in it.
  const [positionForm, setPositionForm] = useState(null); // { index, value } | null
  // Reorder is a silent DOM rearrangement for a screen reader unless we say what happened.
  const [announcement, setAnnouncement] = useState("");

  // After a reorder the whole grid re-renders with new keys (sceneId embeds the index, so every
  // card past the move is a fresh element) — which drops focus to <body>. We remember the control
  // the writer pressed and re-focus its counterpart on the card at its NEW position, so a run of
  // "Move down" presses keeps working without hunting for the card again.
  const pendingFocusRef = useRef(null);
  const rootRef = useRef(null);

  const cardBase = dark ? "bg-[#0d1829] border-[#1d3350]" : "bg-white border-gray-200";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const headingCls = dark ? "text-gray-100" : "text-gray-800";
  // Measured, not chosen by eye: the badge and the lock label are the two small
  // labels on a card, and both must clear 4.5:1 on either card ground.
  const metaCls = dark ? "text-gray-300" : "text-gray-600";
  const btnCls = `inline-flex items-center justify-center rounded-md border text-[12px] font-semibold transition
    ${dark
      ? "border-[#1d3350] text-gray-300 hover:bg-white/[0.06] disabled:text-gray-600"
      : "border-gray-200 text-gray-600 hover:bg-gray-50 disabled:text-gray-300"}
    disabled:cursor-not-allowed disabled:hover:bg-transparent`;

  const total = scenes.length;

  const lockInfo = (sceneId) => {
    const lock = sceneId ? locks[sceneId] : null;
    if (!lock) return null;
    return { ...lock, byOther: String(lock.holderId) !== String(myUserId) };
  };

  const canMove = (index) => {
    if (!canEdit || total < 2) return false;
    return !lockInfo(scenes[index]?.sceneId)?.byOther;
  };

  // The one entry point every reorder path goes through — arrows, the position form, and the
  // drop handler. Guards, announcement and focus intent live here exactly once.
  const requestMove = (from, to, control) => {
    const source = scenes[from];
    if (!source) return;
    if (!canEdit) return;
    // Never let a reorder move a scene locked by someone else (the reorder bypasses the
    // editor's lock guard, so it's enforced here too).
    if (lockInfo(source.sceneId)?.byOther) {
      setAnnouncement(`${source.heading} is locked by another writer and cannot be moved.`);
      return;
    }
    const target = clampIndex(to, total);
    if (from === target) return;
    // control === null is a mouse drop: the pointer is already where the writer wants it, so
    // stealing focus onto the card would be a change nobody asked for.
    if (control) pendingFocusRef.current = { index: target, control };
    setAnnouncement(`Moved ${source.heading} to position ${target + 1} of ${total}.`);
    setPositionForm(null);
    onReorder?.(from, target);
  };

  // Runs after every render; only acts when a reorder asked for focus. Falls back down the card's
  // controls when the one that was pressed is now disabled (moving to the top disables "Move up").
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;
    const root = rootRef.current;
    if (!root) return;
    const at = (control) => root.querySelector(`[data-cork-index="${pending.index}"][data-cork-control="${control}"]`);
    // First control in this order that both exists and is ENABLED. Checking existence alone is
    // the wrong test: at the top of the board "Move up" is present but disabled, and focusing it
    // would drop the writer on a dead control after their own successful move.
    const order = [pending.control, pending.control === "up" ? "down" : "up", "position", "heading"];
    for (const name of order) {
      const el = at(name);
      if (el && !el.disabled) { el.focus(); return; }
    }
  });

  const handleDrop = (targetIndex) => {
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from == null || from === targetIndex) return;
    requestMove(from, targetIndex, null);
  };

  const openPositionForm = (index) => {
    setPositionForm((prev) => (prev?.index === index ? null : { index, value: index + 1 }));
  };

  if (!scenes.length) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <p className={`text-[13px] italic ${muted}`}>No scenes yet. Add an INT./EXT. heading on the page.</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto px-6 py-8 ${className}`} ref={rootRef}>
      {/* Polite, not assertive: a reorder is the writer's own action, so it must not interrupt. */}
      <p aria-live="polite" className="sr-only" data-testid="corkboard-announcer">{announcement}</p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-w-[1100px] mx-auto">
        {scenes.map((scene, i) => {
          const lock = lockInfo(scene.sceneId);
          const lockedByOther = Boolean(lock?.byOther);
          const draggable = canEdit && !lockedByOther;
          const movable = canMove(i);
          const key = headingKey(scene.heading);
          const here = presenceBySceneId[scene.sceneId] || [];
          const isOver = overIndex === i && dragIndex != null && dragIndex !== i;
          const formOpen = positionForm?.index === i;
          const formId = `cork-move-${i}`;
          const selectId = `cork-move-select-${i}`;
          // Screen-reader names carry the position, because "Move up" on its own says nothing
          // about which of twelve identical-looking cards is about to move.
          const where = `scene ${i + 1} of ${total}, ${scene.heading}`;

          return (
            <div
              key={scene.sceneId || i}
              draggable={draggable}
              onDragStart={(e) => { if (!draggable) return; setDragIndex(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              onDragOver={(e) => { if (dragIndex == null) return; e.preventDefault(); setOverIndex(i); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
              className={`group relative rounded-xl border p-3 flex flex-col gap-2 transition shadow-sm
                ${cardBase}
                ${draggable ? "cursor-grab hover:shadow-md" : "cursor-default"}
                ${dragIndex === i ? "opacity-40" : ""}
                ${isOver ? (dark ? "ring-2 ring-blue-400/70" : "ring-2 ring-[#1e3a5f]/60") : ""}`}
            >
              {/* color stripe (act/storyline label — neutral by default) */}
              <span
                className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                style={{ backgroundColor: lock?.color || (dark ? "#1d3350" : "#e5e7eb") }}
              />

              {/* header row: number badge + presence/lock */}
              <div className="flex items-center gap-2 pl-2">
                <span className={`text-[11px] font-mono font-bold w-6 h-6 inline-flex items-center justify-center rounded-md shrink-0
                  ${dark ? "bg-white/[0.06] text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                  {i + 1}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  {here.length > 0 && !lockedByOther && (
                    <span className="flex items-center -space-x-1">
                      {here.slice(0, 3).map((p) => (
                        <span key={p.userId} className="w-2 h-2 rounded-full ring-1 ring-white/30" style={{ backgroundColor: p.color }} title={p.name} />
                      ))}
                    </span>
                  )}
                  {/* The holder's colour stays on the ICON, which is a graphical
                      object and needs only 3:1. It was on the LABEL, where an
                      assigned collaborator colour measured 3.83:1 against a 4.5:1
                      floor — a text colour is not somewhere arbitrary data gets
                      to decide contrast. */}
                  {lock && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${metaCls}`} title={`Locked by ${lock.holderName}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ color: lock.color || undefined }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M3.75 21.75h16.5a.75.75 0 00.75-.75v-9a.75.75 0 00-.75-.75H3.75a.75.75 0 00-.75.75v9a.75.75 0 00.75.75z" />
                      </svg>
                      {lock.byOther ? (lock.holderName || "locked") : "you"}
                    </span>
                  )}
                </div>
              </div>

              {/* heading — click to jump to the scene on the page */}
              <button
                type="button"
                data-cork-index={i}
                data-cork-control="heading"
                onClick={() => onOpenScene?.(scene.startLine)}
                /* min-h-11 is the 44px target. It was a 22px-tall line of text —
                   which fails the phone floor and WCAG 2.5.8's 24px on desktop
                   too — and it is the control that opens the scene, so it is the
                   most-tapped thing on the card. */
                className={`pl-2 min-h-11 flex items-center text-left text-[12px] font-bold uppercase tracking-tight leading-snug truncate ${lockedByOther ? muted : headingCls} hover:underline`}
                title={scene.heading}
              >
                {scene.heading}
              </button>

              {/* one-line synopsis (metadata — never exported) */}
              <textarea
                /* Named, because a placeholder is not a name — and on a locked or
                   read-only card the placeholder is empty, so this control was a
                   silent focus stop with nothing to announce at all (WCAG 4.1.2). */
                aria-label={`One-line summary for ${scene.heading}`}
                value={synopses[key] || ""}
                onChange={(e) => onSynopsisChange?.(key, e.target.value)}
                onDragStart={(e) => e.stopPropagation()}
                draggable={false}
                disabled={lockedByOther || !canEdit}
                rows={2}
                placeholder={lockedByOther ? "" : "One-line summary…"}
                className={`ml-2 w-[calc(100%-0.5rem)] resize-none rounded-md px-2 py-1.5 text-[11px] leading-snug outline-none border bg-transparent
                  ${dark ? "border-[#182840] text-gray-300 placeholder:text-gray-600 focus:border-[#2a4a6a]" : "border-gray-100 text-gray-600 placeholder:text-gray-300 focus:border-gray-300"}
                  disabled:opacity-60`}
              />

              {/* DEF-3 — the non-drag reorder path. 44px targets so this works on a phone too. */}
              {movable && (
                <div className="mt-auto flex items-center gap-1 pl-2">
                  <button
                    type="button"
                    data-cork-index={i}
                    data-cork-control="up"
                    disabled={i === 0}
                    aria-label={`Move ${where} up`}
                    onClick={() => requestMove(i, i - 1, "up")}
                    className={`${btnCls} w-11 h-11 shrink-0`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-cork-index={i}
                    data-cork-control="down"
                    disabled={i === total - 1}
                    aria-label={`Move ${where} down`}
                    onClick={() => requestMove(i, i + 1, "down")}
                    className={`${btnCls} w-11 h-11 shrink-0`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l6-6m-6 6l-6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-cork-index={i}
                    data-cork-control="position"
                    aria-expanded={formOpen}
                    aria-controls={formOpen ? formId : undefined}
                    aria-label={`Move ${where} to a chosen position`}
                    onClick={() => openPositionForm(i)}
                    className={`${btnCls} h-11 flex-1 min-w-0 px-2`}
                  >
                    <span className="truncate">Move to…</span>
                  </button>
                </div>
              )}

              {/* Not modal — it is a control that belongs to this card, so focus is not trapped;
                  Escape closes it and hands focus back to the button that opened it. */}
              {movable && formOpen && (
                <div
                  id={formId}
                  className={`ml-2 flex items-center gap-1 rounded-md border p-1.5 ${dark ? "border-[#1d3350]" : "border-gray-200"}`}
                  onKeyDown={(e) => {
                    if (e.key !== "Escape") return;
                    e.stopPropagation();
                    setPositionForm(null);
                    rootRef.current?.querySelector(`[data-cork-index="${i}"][data-cork-control="position"]`)?.focus();
                  }}
                >
                  <label htmlFor={selectId} className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${muted}`}>
                    Position
                  </label>
                  <select
                    id={selectId}
                    value={positionForm.value}
                    onChange={(e) => setPositionForm({ index: i, value: Number(e.target.value) })}
                    className={`h-11 min-w-0 flex-1 rounded-md border px-1 text-[12px] bg-transparent
                      ${dark ? "border-[#1d3350] text-gray-200" : "border-gray-200 text-gray-700"}`}
                  >
                    {scenes.map((_, n) => (
                      <option key={n} value={n + 1}>{n + 1}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    data-cork-index={i}
                    data-cork-control="position-commit"
                    onClick={() => requestMove(i, positionForm.value - 1, "position")}
                    className={`${btnCls} h-11 px-2 shrink-0`}
                  >
                    Move
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className={`text-center mt-6 text-[11px] ${muted}`}>
        Drag a card to reorder the script, or use a card&rsquo;s Move controls.
      </p>
    </div>
  );
}
