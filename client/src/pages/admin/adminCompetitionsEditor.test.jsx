// @vitest-environment happy-dom
//
// Regression guard for a bug that made the competition editor unusable: every field accepted exactly
// one character and then dropped the cursor.
//
// The cause was a `Group` wrapper component declared INSIDE CompetitionEditor's body. Each keystroke
// set state, which re-ran the body, which produced a brand-new function identity for `Group`. React
// compares element types by identity, so it saw a different component at that position, unmounted
// the whole group — including the focused <input> — and mounted a fresh one. The character reached
// state, but the DOM node holding the caret was destroyed.
//
// Hence the two assertions below: the value must accumulate AND the same DOM node must survive with
// focus. Testing only the value would still pass with the bug present, because state was never the
// broken part.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

// The editor pulls its authenticated axios instance from AdminDashboard, which drags in the entire
// admin bundle. Only the calls this test triggers need to exist.
vi.mock("../AdminDashboard", () => ({
  adminApi: {
    get: vi.fn(async () => ({ data: { competitions: [] } })),
    post: vi.fn(async () => ({ data: {} })),
    put: vi.fn(async () => ({ data: {} })),
  },
}));

const AdminCompetitions = (await import("./AdminCompetitions")).default;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container, root;
const render = (el) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
  return container;
};
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

const openEditor = async () => {
  const el = render(<AdminCompetitions isDark={false} />);
  await act(async () => {});                       // let loadCompetitions settle
  const newBtn = [...el.querySelectorAll("button")].find((b) => b.textContent.includes("New Competition"));
  expect(newBtn, "the New Competition button should exist").toBeTruthy();
  act(() => newBtn.dispatchEvent(new Event("click", { bubbles: true })));
  return el;
};

describe("CompetitionEditor — typing", () => {
  it("keeps focus on the same input across many keystrokes", async () => {
    const el = await openEditor();

    const nameInput = el.querySelector("input");
    expect(nameInput, "the editor should render its first field").toBeTruthy();
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);

    const word = "Global Script Challenge";
    for (const char of word) {
      typeChar(nameInput, char);
      // The node must survive the re-render. With the bug, this input was detached after the first
      // keystroke and `isConnected` went false.
      expect(nameInput.isConnected, `input was remounted while typing "${char}"`).toBe(true);
      expect(document.activeElement, `focus lost while typing "${char}"`).toBe(nameInput);
    }

    expect(nameInput.value).toBe(word);
  });

  it("accumulates text in a second field too, so the fix is not specific to one group", async () => {
    const el = await openEditor();

    // The overview <textarea> lives in the same "Basics" group.
    const overview = el.querySelector("textarea");
    expect(overview).toBeTruthy();
    overview.focus();

    for (const char of "48 hours") typeChar(overview, char);

    expect(overview.value).toBe("48 hours");
    expect(overview.isConnected).toBe(true);
    expect(document.activeElement).toBe(overview);
  });
});
