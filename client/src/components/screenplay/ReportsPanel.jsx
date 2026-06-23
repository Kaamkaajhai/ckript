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

const SortHeader = ({ label, col, sort, setSort, dark, align = "left" }) => {
  const active = sort.col === col;
  return (
    <th
      onClick={() => setSort({ col, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
      className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${align === "right" ? "text-right" : "text-left"} ${dark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
    >
      {label}{active ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
};

export default function ReportsPanel({ value = "", wordsPerPage = 250, title = "Script", dark = false, onJumpScene }) {
  const [sub, setSub] = useState("scenes"); // "scenes" | "characters"
  const [sceneSort, setSceneSort] = useState({ col: "number", dir: "asc" });
  const [charSort, setCharSort] = useState({ col: "lines", dir: "desc" });

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
  const cellCls = dark ? "text-gray-300 border-[#152234]" : "text-gray-700 border-gray-100";
  const exportBtn = `px-2.5 py-1 rounded-md text-[10px] font-bold border transition ${dark ? "border-[#2a4a6a] text-gray-300 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`;
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
    <div className="flex flex-col min-h-0 flex-1">
      {/* Sub-tabs + export */}
      <div className={`flex items-center gap-1 px-2 py-2 border-b ${dark ? "border-[#182840]" : "border-gray-200"}`}>
        {[["scenes", `Scenes (${scenes.length})`], ["characters", `Characters (${characters.length})`]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSub(id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide transition ${sub === id
              ? "bg-[#1e3a5f] text-white"
              : (dark ? "text-gray-500 hover:bg-white/[0.06]" : "text-gray-400 hover:bg-gray-200/60")}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => handleExport("pdf")} className={exportBtn}>PDF</button>
          <button type="button" onClick={() => handleExport("csv")} className={exportBtn}>CSV</button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {sub === "scenes" ? (
          scenes.length === 0 ? (
            <p className={`px-4 py-3 text-[12px] italic ${muted}`}>No scenes yet.</p>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className={`sticky top-0 ${dark ? "bg-[#0b1320]" : "bg-[#f6f5f2]"}`}>
                <tr>
                  <SortHeader label="#" col="number" sort={sceneSort} setSort={setSceneSort} dark={dark} />
                  <SortHeader label="Heading" col="heading" sort={sceneSort} setSort={setSceneSort} dark={dark} />
                  <SortHeader label="Pg" col="page" sort={sceneSort} setSort={setSceneSort} dark={dark} align="right" />
                  <SortHeader label="Len" col="elements" sort={sceneSort} setSort={setSceneSort} dark={dark} align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedScenes.map((s) => (
                  <tr key={s.number} onClick={() => onJumpScene?.(s.line)}
                    className={`cursor-pointer ${dark ? "hover:bg-white/[0.04]" : "hover:bg-gray-100/70"}`}>
                    <td className={`px-2 py-1.5 border-t font-mono ${muted} ${cellCls}`}>{s.number}</td>
                    <td className={`px-2 py-1.5 border-t uppercase tracking-tight truncate max-w-[150px] ${cellCls}`} title={s.heading}>{s.heading}</td>
                    <td className={`px-2 py-1.5 border-t text-right font-mono ${cellCls}`}>{s.page}</td>
                    <td className={`px-2 py-1.5 border-t text-right font-mono ${cellCls}`}>{s.elements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          characters.length === 0 ? (
            <p className={`px-4 py-3 text-[12px] italic ${muted}`}>No speaking characters yet.</p>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead className={`sticky top-0 ${dark ? "bg-[#0b1320]" : "bg-[#f6f5f2]"}`}>
                <tr>
                  <SortHeader label="Character" col="name" sort={charSort} setSort={setCharSort} dark={dark} />
                  <SortHeader label="Lines" col="lines" sort={charSort} setSort={setCharSort} dark={dark} align="right" />
                  <SortHeader label="Scenes" col="scenes" sort={charSort} setSort={setCharSort} dark={dark} align="right" />
                  <SortHeader label="First" col="first" sort={charSort} setSort={setCharSort} dark={dark} align="right" />
                  <SortHeader label="Last" col="last" sort={charSort} setSort={setCharSort} dark={dark} align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedChars.map((c) => (
                  <tr key={c.name} className={dark ? "hover:bg-white/[0.04]" : "hover:bg-gray-100/70"}>
                    <td className={`px-2 py-1.5 border-t font-semibold uppercase tracking-tight truncate max-w-[130px] ${cellCls}`} title={c.name}>{c.name}</td>
                    <td className={`px-2 py-1.5 border-t text-right font-mono ${cellCls}`}>{c.lines}</td>
                    <td className={`px-2 py-1.5 border-t text-right font-mono ${cellCls}`}>{c.scenes}</td>
                    <td className={`px-2 py-1.5 border-t text-right font-mono ${cellCls}`}>{c.first}</td>
                    <td className={`px-2 py-1.5 border-t text-right font-mono ${cellCls}`}>{c.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
