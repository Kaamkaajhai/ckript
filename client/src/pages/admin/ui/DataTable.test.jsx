// @vitest-environment happy-dom
//
// The DataTable's behavioural contract: filter → sort → page order, selection semantics, the
// unknown-state safety of pagination under a narrowing filter, and CSV export of the FULL filtered
// set rather than the visible page. These are the behaviours every migrated admin screen will lean
// on without re-testing.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { DataTable } = await import("./index.js");

const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "role", header: "Role", hideable: true },
  { key: "amount", header: "Amount", sortable: true, align: "right" },
];

const ROWS = [
  { _id: "1", name: "Asha", role: "writer", amount: 300 },
  { _id: "2", name: "Bram", role: "producer", amount: 100 },
  { _id: "3", name: "Chen", role: "writer", amount: 200 },
];

let root;
let host;
const mount = (node) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(node));
};
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
});

const type = (input, text) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const bodyNames = () => [...host.querySelectorAll("tbody tr")]
  .map((tr) => tr.querySelector("td:not(.adtb-td--check)")?.textContent)
  .filter((t) => t && !t.includes("Nothing") && !t.includes("match"));

describe("sorting", () => {
  it("cycles ascending → descending → off, and announces via aria-sort", () => {
    mount(<DataTable columns={COLUMNS} rows={ROWS} />);
    const sortBtn = [...host.querySelectorAll(".adtb-sort")].find((b) => b.textContent.includes("Amount"));

    act(() => sortBtn.click());
    expect(bodyNames()).toEqual(["Bram", "Chen", "Asha"]);          // 100, 200, 300
    expect(sortBtn.closest("th").getAttribute("aria-sort")).toBe("ascending");

    act(() => sortBtn.click());
    expect(bodyNames()).toEqual(["Asha", "Chen", "Bram"]);          // 300, 200, 100

    act(() => sortBtn.click());
    expect(bodyNames()).toEqual(["Asha", "Bram", "Chen"]);          // original order
    expect(sortBtn.closest("th").getAttribute("aria-sort")).toBeNull();
  });
});

describe("search", () => {
  it("filters across visible columns and shows the no-match state", () => {
    mount(<DataTable columns={COLUMNS} rows={ROWS} />);
    const input = host.querySelector("input[type=search]");

    act(() => type(input, "writer"));
    expect(bodyNames()).toEqual(["Asha", "Chen"]);

    act(() => type(input, "zzz"));
    expect(host.textContent).toContain("No rows match this search");
  });
});

describe("pagination", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ _id: String(i), name: `Row ${String(i).padStart(2, "0")}`, role: "writer", amount: i }));

  it("pages and snaps back when a filter shrinks the set", () => {
    mount(<DataTable columns={COLUMNS} rows={many} pageSize={10} />);
    expect(host.querySelector(".adtb-pager-info").textContent).toContain("page 1 of 3");

    const next = [...host.querySelectorAll(".adtb-pager-btns button")][1];
    act(() => next.click());
    act(() => next.click());
    expect(host.querySelector(".adtb-pager-info").textContent).toContain("page 3 of 3");

    // Narrow to a single row while sitting on page 3: the table must snap to page 1, not render
    // a phantom empty page.
    const input = host.querySelector("input[type=search]");
    act(() => type(input, "Row 05"));
    expect(bodyNames()).toEqual(["Row 05"]);
  });
});

describe("selection and bulk actions", () => {
  it("selects per page, reports selected rows, and clears", () => {
    const onBulk = vi.fn();
    mount(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        selectable
        bulkActions={[{ label: "Approve", onClick: onBulk }]}
      />,
    );
    // Header checkbox selects the page; the bulk bar appears with the count.
    act(() => host.querySelector("thead input[type=checkbox]").click());
    expect(host.querySelector(".adtb-bulk-count").textContent).toBe("3 selected");

    act(() => [...host.querySelectorAll(".adtb-bulk button")].find((b) => b.textContent === "Approve").click());
    expect(onBulk).toHaveBeenCalledTimes(1);
    expect(onBulk.mock.calls[0][0].map((r) => r._id)).toEqual(["1", "2", "3"]);

    act(() => [...host.querySelectorAll(".adtb-bulk button")].find((b) => b.textContent === "Clear").click());
    expect(host.querySelector(".adtb-bulk")).toBeNull();
  });

  it("row checkbox does not trigger onRowClick", () => {
    const onRow = vi.fn();
    mount(<DataTable columns={COLUMNS} rows={ROWS} selectable onRowClick={onRow} />);
    act(() => host.querySelector("tbody input[type=checkbox]").click());
    expect(onRow).not.toHaveBeenCalled();
    act(() => host.querySelector("tbody tr").click());
    expect(onRow).toHaveBeenCalledTimes(1);
  });
});

describe("column visibility", () => {
  it("hides a column from the menu and keeps non-hideable ones out of it", () => {
    mount(<DataTable columns={COLUMNS} rows={ROWS} />);
    act(() => [...host.querySelectorAll("button")].find((b) => b.textContent === "Columns").click());
    const items = [...host.querySelectorAll(".adtb-menu-item")];
    expect(items.map((i) => i.textContent)).toEqual(["Role"]);      // only hideable columns

    act(() => items[0].querySelector("input").click());
    expect([...host.querySelectorAll("thead th")].map((th) => th.textContent.replace(/[↑↓↕]/g, "").trim()))
      .toEqual(["Name", "Amount"]);
  });
});

describe("export", () => {
  it("exports the full filtered set, not the visible page", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ _id: String(i), name: `N${i}`, role: "writer", amount: i }));
    let blobText = "";
    const realCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob) => { blob.text().then((t) => { blobText = t; }); return "blob:x"; });
    URL.revokeObjectURL = vi.fn();

    mount(<DataTable columns={COLUMNS} rows={many} pageSize={5} exportName="users" />);
    act(() => [...host.querySelectorAll("button")].find((b) => b.textContent === "Export CSV").click());

    return new Promise((resolve) => setTimeout(resolve, 0)).then(() => {
      const lines = blobText.trim().split("\r\n");
      expect(lines[0]).toContain("Name,Role,Amount");
      expect(lines.length).toBe(13);                                 // header + all 12, not header + 5
      URL.createObjectURL = realCreate;
    });
  });
});

describe("states", () => {
  it("loading renders the skeleton, error renders retry, empty renders the empty state", () => {
    const onRetry = vi.fn();
    mount(<DataTable columns={COLUMNS} rows={[]} loading />);
    expect(host.querySelector(".ads-row")).toBeTruthy();
    act(() => root.unmount());

    mount(<DataTable columns={COLUMNS} rows={[]} error="boom" onRetry={onRetry} />);
    act(() => [...host.querySelectorAll("button")].find((b) => b.textContent === "Try again").click());
    expect(onRetry).toHaveBeenCalled();
    act(() => root.unmount());

    mount(<DataTable columns={COLUMNS} rows={[]} empty={{ title: "No users yet" }} />);
    expect(host.textContent).toContain("No users yet");
  });
});
