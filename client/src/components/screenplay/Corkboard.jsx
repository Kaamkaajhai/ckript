import { useState } from "react";
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
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const cardBase = dark ? "bg-[#0d1829] border-[#1d3350]" : "bg-white border-gray-200";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const headingCls = dark ? "text-gray-100" : "text-gray-800";

  const lockInfo = (sceneId) => {
    const lock = sceneId ? locks[sceneId] : null;
    if (!lock) return null;
    return { ...lock, byOther: String(lock.holderId) !== String(myUserId) };
  };

  const handleDrop = (targetIndex) => {
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from == null || from === targetIndex) return;
    // Never let a reorder move a scene locked by someone else (the reorder bypasses the
    // editor's lock guard, so it's enforced here too).
    const source = scenes[from];
    if (lockInfo(source?.sceneId)?.byOther) return;
    onReorder?.(from, targetIndex);
  };

  if (!scenes.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className={`text-[13px] italic ${muted}`}>No scenes yet. Add an INT./EXT. heading on the page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-w-[1100px] mx-auto">
        {scenes.map((scene, i) => {
          const lock = lockInfo(scene.sceneId);
          const lockedByOther = Boolean(lock?.byOther);
          const draggable = canEdit && !lockedByOther;
          const key = headingKey(scene.heading);
          const here = presenceBySceneId[scene.sceneId] || [];
          const isOver = overIndex === i && dragIndex != null && dragIndex !== i;

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
                <span className={`text-[10px] font-mono font-bold w-6 h-6 inline-flex items-center justify-center rounded-md shrink-0
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
                  {lock && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: lock.color || "#888" }} title={`Locked by ${lock.holderName}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
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
                onClick={() => onOpenScene?.(scene.startLine)}
                className={`pl-2 text-left text-[12px] font-bold uppercase tracking-tight leading-snug truncate ${lockedByOther ? muted : headingCls} hover:underline`}
                title={scene.heading}
              >
                {scene.heading}
              </button>

              {/* one-line synopsis (metadata — never exported) */}
              <textarea
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
            </div>
          );
        })}
      </div>

      <p className={`text-center mt-6 text-[11px] ${muted}`}>Drag a card to reorder the script.</p>
    </div>
  );
}
