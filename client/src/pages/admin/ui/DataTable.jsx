import { useEffect, useMemo, useRef, useState } from "react";
import Button from "./Button";
import { SearchInput } from "./fields";
import { EmptyState, ErrorState, SkeletonTable } from "./feedback";

/**
 * The admin's one table. Every list screen renders THIS — sorting, search, column visibility,
 * sticky header, selection with bulk actions, pagination, CSV export, and the four non-happy states
 * — so those behaviours exist once instead of once per screen.
 *
 * Column contract:
 *   {
 *     key,                  unique id; also the default row field
 *     header,               column heading text
 *     render(row),          custom cell (defaults to row[key])
 *     sortValue(row),       value to sort/search/export by (defaults to row[key])
 *     sortable: true,
 *     align: "right",       numeric columns — also sets tabular numerals
 *     width,                px or CSS width
 *     hideable: true,       user may toggle it in the columns menu
 *     hidden: true,         starts hidden (secondary detail columns)
 *   }
 *
 * Deliberately CLIENT-side: the existing admin endpoints return full lists, so filtering here adds
 * zero requests. When a screen moves to server pagination it should drive `rows` itself and switch
 * off the internals it replaces (`search={false}`, `paginate={false}`) rather than this component
 * growing a second remote mode nobody can reason about.
 */

const cellValue = (row, col) => {
  const v = col.sortValue ? col.sortValue(row) : row[col.key];
  return v === null || v === undefined ? "" : v;
};

const compare = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
};

const csvCell = (value) => {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function DataTable({
  columns,
  rows = [],
  rowKey = "_id",
  loading = false,
  error = "",
  onRetry = null,
  empty = { title: "Nothing here yet" },
  search = true,
  searchPlaceholder = "Search…",
  toolbar = null,               // caller's filter controls, rendered beside the search
  selectable = false,
  bulkActions = [],             // [{ label, onClick(selectedRows), variant, disabled }]
  onRowClick = null,
  paginate = true,
  pageSize = 25,
  exportName = "",              // enables the Export CSV button when set
  columnsMenu = true,
  fetchAllData = null,          // async () => any[] (fetches full unpaginated dataset)
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState(() => new Set(columns.filter((c) => c.hidden).map((c) => c.key)));
  const [selected, setSelected] = useState(() => new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef(null);

  const visibleCols = columns.filter((c) => !hidden.has(c.key));

  // ── derive: filter → sort → page ─────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => visibleCols.some((c) => String(cellValue(row, c)).toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, columns, hidden]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    return [...filtered].sort((a, b) => sort.dir * compare(cellValue(a, col), cellValue(b, col)));
  }, [filtered, sort, columns]);

  const pages = paginate ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  // Clamped in RENDER, not corrected in an effect: a narrowing filter can strand the stored page
  // past the end, and deriving the effective page means there is never a frame showing a phantom
  // empty page while an effect catches up.
  const effectivePage = Math.min(page, pages);
  const pageRows = paginate
    ? sorted.slice((effectivePage - 1) * pageSize, effectivePage * pageSize)
    : sorted;

  // Selection refers to rows by key; drop keys that filtered out of the data entirely.
  const keyOf = (row) => String(row[rowKey]);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(keyOf(r)));
  const someOnPage = pageRows.some((r) => selected.has(keyOf(r)));
  const headerCheckRef = useRef(null);
  useEffect(() => {
    if (headerCheckRef.current) headerCheckRef.current.indeterminate = someOnPage && !allOnPage;
  }, [someOnPage, allOnPage]);

  // The columns menu dismisses on any outside pointer press.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const cycleSort = (col) => {
    if (!col.sortable) return;
    setSort((s) => {
      if (s.key !== col.key) return { key: col.key, dir: 1 };
      if (s.dir === 1) return { key: col.key, dir: -1 };
      return { key: null, dir: 1 };
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) pageRows.forEach((r) => next.delete(keyOf(r)));
      else pageRows.forEach((r) => next.add(keyOf(r)));
      return next;
    });
  };

  const toggleRow = (row) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(row);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const exportCsv = async () => {
    if (!sorted.length && !fetchAllData) return;
    
    setExporting(true);
    let dataToExport = sorted;
    if (fetchAllData) {
      try {
        dataToExport = await fetchAllData();
      } catch (err) {
        console.error("Failed to fetch full data for export", err);
        setExporting(false);
        return;
      }
    }
    
    // The full filtered+sorted set, not the visible page — a partial export understates whatever
    // the admin is counting. Export all data fields from the raw objects.
    const allKeys = Array.from(new Set(dataToExport.flatMap((row) => Object.keys(row))));
    
    const head = allKeys.map((k) => csvCell(k));
    const body = dataToExport.map((row) => {
      return allKeys.map((k) => {
        let val = row[k];
        if (typeof val === "object" && val !== null) {
          try {
            val = JSON.stringify(val);
          } catch (e) {
            val = String(val);
          }
        }
        return csvCell(val);
      }).join(",");
    });
    
    const csv = [head.join(","), ...body].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const selectedRows = rows.filter((r) => selected.has(keyOf(r)));

  // ── non-happy states ─────────────────────────────────────────────────────
  if (error) return <ErrorState title="Couldn't load this table" body={error} onRetry={onRetry} />;

  return (
    <div className="adtb">
      {(search || toolbar || exportName || (columnsMenu && columns.some((c) => c.hideable))) && (
        <div className="adtb-bar">
          {search ? (
            <SearchInput
              className="adtb-search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            />
          ) : <span />}
          <div className="adtb-bar-end">
            {toolbar}
            {columnsMenu && columns.some((c) => c.hideable) ? (
              <div className="adtb-menu" ref={menuRef}>
                <Button variant="secondary" size="sm" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                  Columns
                </Button>
                {menuOpen ? (
                  <div className="adtb-menu-pop" role="group" aria-label="Visible columns">
                    {columns.filter((c) => c.hideable).map((c) => (
                      <label key={c.key} className="adtb-menu-item">
                        <input
                          type="checkbox"
                          checked={!hidden.has(c.key)}
                          onChange={() => setHidden((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                            return next;
                          })}
                        />
                        {c.header}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {exportName ? (
              <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!sorted.length}>
                Export CSV
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {selectable && selected.size > 0 ? (
        <div className="adtb-bulk" role="toolbar" aria-label="Bulk actions">
          <span className="adtb-bulk-count">{selected.size} selected</span>
          {bulkActions.map((a) => (
            <Button key={a.label} size="sm" variant={a.variant || "secondary"} disabled={a.disabled} onClick={() => a.onClick(selectedRows)}>
              {a.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      ) : null}

      <div className="adtb-scroll">
        {loading ? <SkeletonTable rows={Math.min(pageSize, 8)} columns={visibleCols.length || 4} /> : (
          <table className="adtb-table">
            <thead>
              <tr>
                {selectable ? (
                  <th className="adtb-th adtb-th--check">
                    <input
                      ref={headerCheckRef}
                      type="checkbox"
                      checked={allOnPage}
                      onChange={toggleAllOnPage}
                      aria-label="Select all rows on this page"
                    />
                  </th>
                ) : null}
                {visibleCols.map((c) => (
                  <th
                    key={c.key}
                    className={`adtb-th ${c.align === "right" ? "adtb-th--right" : ""}`}
                    style={c.width ? { width: c.width } : undefined}
                    aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                  >
                    {c.sortable ? (
                      <button type="button" className="adtb-sort" onClick={() => cycleSort(c)}>
                        {c.header}
                        <span className="adtb-sort-ico" aria-hidden="true">
                          {sort.key === c.key ? (sort.dir === 1 ? "↑" : "↓") : "↕"}
                        </span>
                      </button>
                    ) : c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={keyOf(row)}
                  className={[
                    onRowClick ? "adtb-tr--link" : "",
                    selected.has(keyOf(row)) ? "adtb-tr--selected" : "",
                  ].filter(Boolean).join(" ") || undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable ? (
                    <td className="adtb-td adtb-td--check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(keyOf(row))}
                        onChange={() => toggleRow(row)}
                        aria-label="Select row"
                      />
                    </td>
                  ) : null}
                  {visibleCols.map((c) => (
                    <td key={c.key} className={`adtb-td ${c.align === "right" ? "ckad-num adtb-td--right" : ""}`}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {!pageRows.length ? (
                <tr>
                  <td className="adtb-td" colSpan={visibleCols.length + (selectable ? 1 : 0)}>
                    <EmptyState
                      title={query ? "No rows match this search" : empty.title}
                      body={query ? "Try a different term or clear the search." : empty.body}
                      actionLabel={empty.actionLabel}
                      onAction={empty.onAction}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {paginate && pages > 1 ? (
        <div className="adtb-pager">
          <span className="adtb-pager-info">
            {sorted.length} row{sorted.length === 1 ? "" : "s"} · page {effectivePage} of {pages}
          </span>
          <div className="adtb-pager-btns">
            <Button size="sm" variant="secondary" disabled={effectivePage <= 1} onClick={() => setPage(effectivePage - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={effectivePage >= pages} onClick={() => setPage(effectivePage + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
