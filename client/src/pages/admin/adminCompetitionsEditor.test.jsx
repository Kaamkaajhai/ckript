// @vitest-environment happy-dom
//
// The competition editor's text fields must accumulate what you type.
//
// The original bug: an admin typing into any field got ONE character, then the caret jumped out.
// The cause was a field component declared inside the editor's own body — every keystroke re-ran
// the parent, which produced a brand-new component TYPE, so React unmounted the live input and
// mounted a fresh one. The old value survived in state; the focus and the caret did not.
//
// That inline editor has since been replaced by a routed, modular one
// (pages/admin/competitions/AdminCompetitionsEditor.jsx). This test follows the behaviour rather
// than the file: the same class of bug is trivially easy to reintroduce when a module grows a
// helper component, and it is invisible to a passing build.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// The editor pulls its authenticated axios instance from AdminDashboard, which drags in the entire
// admin bundle. Only the calls this test triggers need to exist.
vi.mock("../AdminDashboard", () => ({
  adminApi: {
    get: vi.fn(async () => ({ data: { competitions: [] } })),
    post: vi.fn(async () => ({ data: {} })),
    put: vi.fn(async () => ({ data: {} })),
  },
}));

const AdminCompetitionsEditor = (await import("./competitions/AdminCompetitionsEditor")).default;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container, root;
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Type one character the way a browser does: set the value, then fire input. */
const typeChar = (input, char) => {
  const proto = Object.getPrototypeOf(input);
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter ? setter.call(input, input.value + char) : (input.value += char);
  act(() => input.dispatchEvent(new Event("input", { bubbles: true })));
};

/** Mount the editor on its real route, in its "new competition" state. */
const openEditor = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/admin/competitions/new"]}>
        <Routes>
          <Route path="/admin/competitions/:id" element={<AdminCompetitionsEditor />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await act(async () => {});   // let the load effect settle
  return container;
};

describe("CompetitionEditor — typing", () => {
  it("keeps focus on the same input across many keystrokes", async () => {
    const el = await openEditor();

    const nameInput = el.querySelector('input[type="text"], input:not([type])');
    expect(nameInput, "the editor should render a text field").toBeTruthy();
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);

    const word = "Global Script Challenge";
    for (const char of word) {
      typeChar(document.activeElement === nameInput ? nameInput : el.querySelector('input[type="text"], input:not([type])'), char);
    }

    // Both assertions matter. The value proves the keystrokes were not dropped; the identity proves
    // React kept the SAME element, which is what the caret is attached to.
    const after = el.querySelector('input[type="text"], input:not([type])');
    expect(after).toBe(nameInput);
    expect(nameInput.value).toBe(word);
    expect(document.activeElement).toBe(nameInput);
  });

  it("accumulates text in a textarea too, so the fix is not specific to one control", async () => {
    const el = await openEditor();

    // Asserted, not skipped: a test that quietly no-ops when the selector misses is not a guard.
    const area = el.querySelector("textarea");
    expect(area, "the overview module should render a textarea").toBeTruthy();

    area.focus();
    const phrase = "A weekend of writing.";
    for (const char of phrase) typeChar(area, char);

    expect(el.querySelector("textarea")).toBe(area);
    expect(area.value).toBe(phrase);
    expect(document.activeElement).toBe(area);
  });
});
