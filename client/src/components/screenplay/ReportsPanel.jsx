import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { buildSceneReport, buildCharacterReport } from "./screenplayReports";

// Scene & Character reports (Phase 4 §3) — read-only, auto-generated tables in the right rail.
// Both are exportable to CSV and PDF for a producer to take away.

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// RFC-4180-ish CSV cell escaping.
const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportCsv = (headers, rows, filename) => {
  const lines = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  triggerDownload(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
};

// Minimal table drawer for jsPDF (no autotable dependency).
const exportPdf = (heading, columns, rows, filename) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - marginX * 2;
  const totalWeight = columns.reduce((n, c) => n + c.w, 0);
  const colX = [];
  let x = marginX;
  for (const c of columns) { colX.push(x); x += (c.w / totalWeight) * usableWidth; }
  const rowH = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(heading, marginX, 48);

  let y = 78;
  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    columns.forEach((c, i) => doc.text(String(c.label).toUpperCase(), colX[i], y));
    y += 6;
    doc.setDrawColor(180);
    doc.line(marginX, y, marginX + usableWidth, y);
    y += rowH - 6;
  };
  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const row of rows) {
    if (y + rowH > pageHeight - 40) { doc.addPage(); y = 56; drawHeader(); doc.setFont("helvetica", "normal"); doc.setFontSize(10); }
    columns.forEach((c, i) => {
      const cellW = ((c.w / totalWeight) * usableWidth) - 6;
      const text = doc.splitTextToSize(String(row[i] ?? ""), cellW)[0] || "";
      doc.text(text, colX[i], y);
    });
    y += rowH;
  }
  doc.save(filename);
};

// A compact sort control pill (the report rail is too narrow for a multi-column table header).
const SortPill = ({ label, col, sort, setSort, dark }) => {
  const active = sort.col === col;
  return (
    <button
      type="button"
      onClick={() => setSort({ col, dir: active && sort.dir === "desc" ? "asc" : "desc" })}
      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition whitespace-nowrap ${active
        ? "bg-[#1e3a5f] text-white"
        : (dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-200/60")}`}
    >
      {label}{active ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
};

// One small labelled stat used inside the report cards.
const Stat = ({ label, value, dark }) => (
  <div className="flex flex-col items-center min-w-0">
    <span className={`text-[13px] font-bold font-mono leading-none ${dark ? "text-gray-200" : "text-gray-800"}`}>{value}</span>
    <span className={`text-[9px] uppercase tracking-wide mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
  </div>
);

export default function ReportsPanel({ value = "", wordsPerPage = 250, title = "Script", dark = false, onJumpScene }) {
  const [sub, setSub] = useState("scenes"); // "scenes" | "characters"
  const [sceneSort, setSceneSort] = useState({ col: "number", dir: "asc" });
  const [charSort, setCharSort] = useState({ col: "lines", dir: "desc" });
  const [exportOpen, setExportOpen] = useState(false);

  const scenes = useMemo(() => buildSceneReport(value, wordsPerPage), [value, wordsPerPage]);
  const characters = useMemo(() => buildCharacterReport(value), [value]);

  const sortRows = (rows, sort) => [...rows].sort((a, b) => {
    const av = a[sort.col]; const bv = b[sort.col];
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const sortedScenes = useMemo(() => sortRows(scenes, sceneSort), [scenes, sceneSort]);
  const sortedChars = useMemo(() => sortRows(characters, charSort), [characters, charSort]);

  const muted = dark ? "text-gray-500" : "text-gray-400";
  const cardCls = dark ? "bg-[#0b1320] border-[#1d3350]" : "bg-white border-gray-200";
  const exportBtn = `px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${dark ? "border-[#22364f] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`;
  const safeTitle = String(title || "Script").trim() || "Script";

  const handleExport = (kind) => {
    if (sub === "scenes") {
      const headers = ["#", "Heading", "Page", "Length (elements)", "Lines"];
      const rows = sortedScenes.map((s) => [s.number, s.heading, s.page, s.elements, s.lineLength]);
      if (kind === "csv") exportCsv(headers, rows, `${safeTitle} - Scenes.csv`);
      else exportPdf(`${safeTitle} — Scene Report`,
        [{ label: "#", w: 1 }, { label: "Heading", w: 6 }, { label: "Page", w: 1.2 }, { label: "Elements", w: 1.5 }, { label: "Lines", w: 1.2 }],
        rows, `${safeTitle} - Scenes.pdf`);
    } else {
      const headers = ["Character", "Lines", "Scenes", "First", "Last"];
      const rows = sortedChars.map((c) => [c.name, c.lines, c.scenes, c.first, c.last]);
      if (kind === "csv") exportCsv(headers, rows, `${safeTitle} - Characters.csv`);
      else exportPdf(`${safeTitle} — Character Report`,
        [{ label: "Character", w: 4 }, { label: "Lines", w: 1.5 }, { label: "Scenes", w: 1.5 }, { label: "First", w: 1.2 }, { label: "Last", w: 1.2 }],
        rows, `${safeTitle} - Characters.pdf`);
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Sub-tabs (Scenes / Characters) + export */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2.5">
        {[["scenes", "Scenes", scenes.length], ["characters", "Characters", characters.length]].map(([id, label, count]) => (
          <button key={id} type="button" onClick={() => setSub(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${sub === id
              ? "bg-[#1e3a5f] text-white"
              : (dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-200/60")}`}>
            {label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sub === id ? "bg-white/20" : (dark ? "bg-white/[0.06]" : "bg-gray-200/70")}`}>{count}</span>
          </button>
        ))}
        <div className="ml-auto relative shrink-0">
          <button type="button" onClick={() => setExportOpen((o) => !o)}
            className={`flex items-center gap-1 ${exportBtn}`} title="Export report">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className={`absolute right-0 mt-1.5 w-36 rounded-xl border shadow-xl z-50 py-1.5 text-[12px] ${dark ? "bg-[#0d1829] border-[#2a4a6a] text-gray-200" : "bg-white border-gray-200 text-gray-700"}`}>
                <button type="button" onClick={() => { setExportOpen(false); handleExport("pdf"); }}
                  className={`w-full text-left px-3.5 py-2 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>Export PDF</button>
                <button type="button" onClick={() => { setExportOpen(false); handleExport("csv"); }}
                  className={`w-full text-left px-3.5 py-2 ${dark ? "hover:bg-white/[0.06]" : "hover:bg-gray-50"}`}>Export CSV</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sort toolbar */}
      <div className={`flex items-center gap-1 px-4 pb-2.5 border-b overflow-x-auto ${dark ? "border-[#182840]" : "border-gray-200"}`}>
        <span className={`text-[9px] font-bold uppercase tracking-wide mr-0.5 shrink-0 ${muted}`}>Sort</span>
        {sub === "scenes" ? (
          <>
            <SortPill label="#" col="number" sort={sceneSort} setSort={setSceneSort} dark={dark} />
            <SortPill label="Page" col="page" sort={sceneSort} setSort={setSceneSort} dark={dark} />
            <SortPill label="Length" col="elements" sort={sceneSort} setSort={setSceneSort} dark={dark} />
          </>
        ) : (
          <>
            <SortPill label="Lines" col="lines" sort={charSort} setSort={setCharSort} dark={dark} />
            <SortPill label="Scenes" col="scenes" sort={charSort} setSort={setCharSort} dark={dark} />
            <SortPill label="A–Z" col="name" sort={charSort} setSort={setCharSort} dark={dark} />
          </>
        )}
      </div>

      {/* Card list */}
      <div className="overflow-y-auto flex-1 px-3 py-3 space-y-2">
        {sub === "scenes" ? (
          scenes.length === 0 ? (
            <p className={`px-2 py-3 text-[12.5px] leading-relaxed italic ${muted}`}>No scenes yet. Add an INT./EXT. heading to populate this report.</p>
          ) : (
            sortedScenes.map((s) => (
              <button key={s.number} type="button" onClick={() => onJumpScene?.(s.line)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${cardCls} ${dark ? "hover:border-[#2f4a6e] hover:bg-white/[0.02]" : "hover:border-gray-300 hover:shadow-sm"}`}>
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <span className={`text-[10px] font-mono font-bold shrink-0 w-5 ${muted}`}>{s.number}</span>
                  <span className={`text-[12px] font-semibold uppercase tracking-tight truncate ${dark ? "text-gray-200" : "text-gray-800"}`} title={s.heading}>{s.heading}</span>
                </div>
                <div className="flex items-center justify-around gap-2 pl-7">
                  <Stat label="Page" value={s.page} dark={dark} />
                  <Stat label="Elements" value={s.elements} dark={dark} />
                  <Stat label="Words" value={s.words} dark={dark} />
                </div>
              </button>
            ))
          )
        ) : (
          characters.length === 0 ? (
            <p className={`px-2 py-3 text-[12.5px] leading-relaxed italic ${muted}`}>No speaking characters yet. Cues with dialogue beneath them appear here.</p>
          ) : (
            sortedChars.map((c) => (
              <div key={c.name}
                className={`rounded-xl border px-3 py-2.5 ${cardCls}`}>
                <div className="flex items-center gap-2 mb-2 min-w-0">
                  <span className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[11px] font-bold bg-[#1e3a5f]">
                    {(c.name || "?").trim().charAt(0)}
                  </span>
                  <span className={`text-[12px] font-bold uppercase tracking-tight truncate ${dark ? "text-gray-200" : "text-gray-800"}`} title={c.name}>{c.name}</span>
                </div>
                <div className="flex items-center justify-around gap-2 pl-9">
                  <Stat label="Lines" value={c.lines} dark={dark} />
                  <Stat label="Scenes" value={c.scenes} dark={dark} />
                  <Stat label="First" value={c.first} dark={dark} />
                  <Stat label="Last" value={c.last} dark={dark} />
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
