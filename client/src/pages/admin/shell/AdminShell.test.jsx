// @vitest-environment happy-dom
//
// The shell's contract: one nav tree with correct landmarks and active state, collapse and theme
// that PERSIST across a remount (an admin who collapsed the sidebar yesterday must not find it
// open today), the global-search keyboard shortcut that never hijacks typing, and the guarantee
// that every tab key placed in a group renders — plus the leftover net for keys that are not.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { default: AdminShell } = await import("./AdminShell.jsx");
const { ADMIN_NAV_GROUPS, groupNavItems } = await import("./adminNavGroups.js");

const TABS = [
  { key: "overview", label: "Overview", icon: "M3 3h18" },
  { key: "writers", label: "Writers", icon: "M4 4h16" },
  { key: "payments", label: "Payments", icon: "M2 8h20" },
  { key: "mystery", label: "Mystery Tab", icon: "M0 0h24" },   // in no group on purpose
];

const GROUPS = [
  { title: "", keys: ["overview"] },
  { title: "People", keys: ["writers", "ghost-key"] },          // ghost-key exists in no TABS
  { title: "Revenue", keys: ["payments"] },
];

let root;
let host;
const mount = (node) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(node));
};

beforeEach(() => localStorage.clear());
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
});

const shell = (props = {}) => (
  <AdminShell
    groups={groupNavItems(GROUPS, TABS)}
    activeKey="writers"
    onNavigate={props.onNavigate || (() => {})}
    onSearchChange={props.onSearchChange}
    crumbs={props.crumbs || ["People", "Writers"]}
  >
    <p>content</p>
  </AdminShell>
);

describe("grouping", () => {
  it("places every key once, drops unknown keys, and nets leftovers into More", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const groups = groupNavItems(GROUPS, TABS);
    expect(groups.map((g) => g.title)).toEqual(["", "People", "Revenue", "More"]);
    expect(groups[1].items.map((i) => i.key)).toEqual(["writers"]);          // ghost-key dropped
    expect(groups[3].items.map((i) => i.key)).toEqual(["mystery"]);          // leftover netted
    spy.mockRestore();
  });

  it("every real ADMIN_NAV_GROUPS key is unique — a tab cannot render twice", () => {
    const keys = ADMIN_NAV_GROUPS.flatMap((g) => g.keys);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("navigation", () => {
  it("renders landmarks, marks the active item, and navigates by key", () => {
    const onNavigate = vi.fn();
    mount(shell({ onNavigate }));

    expect(host.querySelector("nav[aria-label='Admin sections']")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("nav[aria-label='Breadcrumb']").textContent).toContain("Writers");

    const active = host.querySelector(".adsh-item.is-active");
    expect(active.textContent).toContain("Writers");
    expect(active.getAttribute("aria-current")).toBe("page");

    act(() => [...host.querySelectorAll(".adsh-item")].find((b) => b.textContent.includes("Payments")).click());
    expect(onNavigate).toHaveBeenCalledWith("payments");
  });
});

describe("collapse", () => {
  it("hides labels to sr-only, persists, and restores on remount", () => {
    mount(shell());
    const collapse = host.querySelector(".adsh-collapse");
    expect(collapse.getAttribute("aria-expanded")).toBe("true");

    act(() => collapse.click());
    expect(host.querySelector(".adsh").className).toContain("adsh--collapsed");
    // Labels leave the visual layout but never the accessibility tree.
    const sideLabels = [...host.querySelectorAll(".adsh-side .adsh-item .ckad-sr-only")];
    expect(sideLabels.length).toBeGreaterThan(0);
    expect(localStorage.getItem("ckad-nav-collapsed")).toBe("1");

    act(() => root.unmount());
    mount(shell());
    expect(host.querySelector(".adsh").className).toContain("adsh--collapsed");
  });
});

describe("theme", () => {
  it("toggles data-theme and persists it", () => {
    mount(shell());
    const toggle = host.querySelector(".adsh-theme");
    expect(host.querySelector(".ckad").getAttribute("data-theme")).toBeNull();

    act(() => toggle.click());
    expect(host.querySelector(".ckad").getAttribute("data-theme")).toBe("dark");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("ckad-theme")).toBe("dark");

    act(() => root.unmount());
    mount(shell());
    expect(host.querySelector(".ckad").getAttribute("data-theme")).toBe("dark");
  });
});

describe("global search", () => {
  it("'/' focuses the search, but not while typing elsewhere", () => {
    mount(shell({ onSearchChange: () => {} }));
    const search = host.querySelector("input[type=search]");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }));
    });
    expect(document.activeElement).toBe(search);

    // While an input has focus, "/" must type a slash, not steal the caret.
    const decoy = document.createElement("input");
    document.body.appendChild(decoy);
    decoy.focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }));
    });
    expect(document.activeElement).toBe(decoy);
    decoy.remove();
  });

  it("renders no search box at all when the screen has no search", () => {
    mount(shell());
    expect(host.querySelector("input[type=search]")).toBeNull();
  });
});

describe("mobile navigation", () => {
  it("burger opens the drawer and navigating closes it", () => {
    const onNavigate = vi.fn();
    mount(shell({ onNavigate }));

    act(() => host.querySelector(".adsh-burger").click());
    const drawer = document.body.querySelector(".ado--drawer-left");
    expect(drawer).toBeTruthy();

    act(() => [...drawer.querySelectorAll(".adsh-item")].find((b) => b.textContent.includes("Overview")).click());
    expect(onNavigate).toHaveBeenCalledWith("overview");
    expect(document.body.querySelector(".ado--drawer-left")).toBeNull();
  });
});
