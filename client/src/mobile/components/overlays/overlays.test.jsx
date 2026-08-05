// @vitest-environment happy-dom
import { act, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sheet from "./Sheet";
import Dialog from "./Dialog";
import ConfirmDialog from "./ConfirmDialog";
import ActionSheet from "./ActionSheet";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/*
 * What this suite can and cannot prove, stated up front so nobody reads more
 * into a green run than is there.
 *
 * happy-dom implements `inert` as an attribute but does NOT enforce it, and it
 * does not enforce a modal's focus containment either — a probe moved focus to
 * a button outside an open <dialog showModal()> and it took it. So these tests
 * assert the *contract*: the attributes, the roles, the wiring, the ordering,
 * and the focus calls this code makes. That real keyboard traversal is actually
 * contained is proved over CDP with dispatched key events, and recorded in §19.
 */

let container;
let root;

function mount(ui) {
  container = document.createElement("div");
  // The overlay hooks look for `.ckm-root` (inert boundary) and
  // `.ckm-shell__scroll` (scroll lock, focus fallback), which is the DOM the
  // shell guarantees. Reproduce it rather than mocking the hooks.
  container.className = "ckm";
  container.innerHTML = '<div class="ckm-root"><main class="ckm-shell__scroll ckm-scroll"></main></div>';
  document.body.appendChild(container);
  const host = document.createElement("div");
  container.querySelector(".ckm-root").appendChild(host);
  root = createRoot(host);
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return host;
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

const scrollSurface = () => container.querySelector(".ckm-shell__scroll");
const surface = () => container.querySelector(".ckm-overlay__surface");

function press(key, options = {}) {
  act(() => {
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
      key, bubbles: true, cancelable: true, ...options,
    }));
  });
}

describe("Sheet", () => {
  it("renders nothing until it is opened", () => {
    mount(<Sheet open={false} title="Filters">body</Sheet>);
    expect(surface()).toBeNull();
  });

  it("is a modal dialog named by its own title", () => {
    mount(<Sheet open title="Filters">body</Sheet>);
    const dialog = surface();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(labelId).textContent).toBe("Filters");
  });

  it("makes everything outside it inert, and gives that back on close", () => {
    const { rerender } = renderSheet();
    expect(scrollSurface().hasAttribute("inert")).toBe(true);
    rerender(false);
    expect(scrollSurface().hasAttribute("inert")).toBe(false);
  });

  /*
   * Regression, and the reason useOverlay takes two refs. The scrim is a
   * sibling of the surface, so an inert walk that starts at the surface marks
   * the scrim inert — and inert elements fire no click events, so tap-to-
   * dismiss dies silently. happy-dom does not enforce inert, so this test can
   * only assert the attribute; the CDP sweep is what proves the click still
   * lands. Both are recorded in §19.
   */
  it("leaves the scrim interactive so tap-to-dismiss still works", () => {
    const onClose = vi.fn();
    mount(<Sheet open onClose={onClose} title="Filters">body</Sheet>);
    const scrim = container.querySelector(".ckm-overlay__scrim");
    expect(scrim.hasAttribute("inert")).toBe(false);
    expect(scrim.closest("[inert]")).toBeNull();
    act(() => scrim.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks the scroll surface while open and restores where the user was", () => {
    // Scrolled *before* opening: the lock captures the position it is given,
    // and the point of the test is that closing gives that position back.
    const { rerender } = renderSheet(false);
    const scroller = scrollSurface();
    scroller.scrollTop = 240;

    rerender(true);
    expect(scroller.classList.contains("is-scroll-locked")).toBe(true);
    scroller.scrollTop = 0; // a re-layout while the sheet is open

    rerender(false);
    expect(scroller.classList.contains("is-scroll-locked")).toBe(false);
    expect(scroller.scrollTop).toBe(240);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    mount(<Sheet open onClose={onClose} title="Filters">body</Sheet>);
    press("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has a close control that is not the scrim", () => {
    const onClose = vi.fn();
    mount(<Sheet open onClose={onClose} title="Filters">body</Sheet>);
    const close = container.querySelector(".ckm-bottom-sheet__close");
    expect(close.getAttribute("aria-label")).toBe("Close");
    act(() => close.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides the scrim from assistive technology", () => {
    mount(<Sheet open title="Filters">body</Sheet>);
    expect(container.querySelector(".ckm-overlay__scrim").getAttribute("aria-hidden")).toBe("true");
  });

  it("moves focus into the sheet on open", () => {
    mount(
      <Sheet open title="Filters">
        <button type="button">Apply</button>
      </Sheet>,
    );
    expect(surface().contains(document.activeElement)).toBe(true);
  });

  it("returns focus to the control that opened it", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" id="opener" onClick={() => setOpen(true)}>Open</button>
          <Sheet open={open} onClose={() => setOpen(false)} title="Filters">body</Sheet>
        </>
      );
    }
    mount(<Harness />);
    const opener = document.getElementById("opener");
    opener.focus();
    act(() => opener.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.activeElement).not.toBe(opener);
    press("Escape");
    expect(document.activeElement).toBe(opener);
  });

  it("lands on the scroll surface when the opener is gone", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      const [openerExists, setOpenerExists] = useState(true);
      return (
        <>
          {openerExists && <button type="button" id="opener">Open</button>}
          <Sheet
            open={open}
            onClose={() => { setOpenerExists(false); setOpen(false); }}
            title="Filters"
          >
            body
          </Sheet>
        </>
      );
    }
    mount(<Harness />);
    press("Escape");
    expect(document.getElementById("opener")).toBeNull();
    expect(document.activeElement).toBe(scrollSurface());
  });

  function renderSheet(open = true) {
    const render = (next) => act(() => root.render(
      <MemoryRouter><Sheet open={next} title="Filters">body</Sheet></MemoryRouter>,
    ));
    mount(<Sheet open={open} title="Filters">body</Sheet>);
    return { rerender: render };
  }
});

describe("Dialog", () => {
  it("titles itself with an h2, not a second h1", () => {
    mount(<Dialog open title="Edit profile">body</Dialog>);
    const heading = container.querySelector(".ckm-dialog__title");
    expect(heading.tagName).toBe("H2");
    expect(surface().getAttribute("aria-labelledby")).toBe(heading.id);
  });

  it("does not close when the scrim is tapped", () => {
    const onClose = vi.fn();
    mount(<Dialog open onClose={onClose} title="Edit profile">body</Dialog>);
    act(() => container.querySelector(".ckm-overlay__scrim")
      .dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismisses with a close control, not a back chevron", () => {
    const onClose = vi.fn();
    mount(<Dialog open onClose={onClose} title="Edit profile">body</Dialog>);
    const close = container.querySelector(".ckm-dialog__close");
    expect(close.getAttribute("aria-label")).toBe("Close");
    act(() => close.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps the body as the only scroll surface", () => {
    mount(<Dialog open title="Edit profile" footer={<button type="button">Save</button>}>body</Dialog>);
    expect(container.querySelectorAll(".ckm-dialog .ckm-scroll").length).toBe(1);
  });
});

describe("ConfirmDialog", () => {
  const base = {
    open: true,
    title: "Delete this script?",
    message: "This removes the script and its reviews. It cannot be undone.",
  };

  it("is an alertdialog described by its message", () => {
    mount(<ConfirmDialog {...base} />);
    const dialog = surface();
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    const describedBy = dialog.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy).textContent).toContain("cannot be undone");
  });

  it("focuses Cancel when the action is destructive", () => {
    mount(<ConfirmDialog {...base} destructive confirmLabel="Delete script" />);
    expect(document.activeElement.textContent).toContain("Cancel");
  });

  it("focuses the confirm button when the action is not destructive", () => {
    mount(<ConfirmDialog {...base} confirmLabel="Publish" />);
    expect(document.activeElement.textContent).toContain("Publish");
  });

  it("puts Cancel before the confirm button in the DOM", () => {
    mount(<ConfirmDialog {...base} destructive confirmLabel="Delete script" />);
    const buttons = [...container.querySelectorAll(".ckm-confirm__actions button")];
    expect(buttons.map((b) => b.textContent.trim())).toEqual(["Cancel", "Delete script"]);
  });

  it("treats Escape and the scrim as cancel, never as confirm", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    mount(<ConfirmDialog {...base} destructive onCancel={onCancel} onConfirm={onConfirm} />);
    press("Escape");
    act(() => container.querySelector(".ckm-overlay__scrim")
      .dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stays open while the confirmed work is pending", () => {
    const onConfirm = vi.fn();
    mount(<ConfirmDialog {...base} destructive pending onConfirm={onConfirm} confirmLabel="Delete script" />);
    const confirm = container.querySelector(".ckm-confirm__confirm");
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    act(() => confirm.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(surface()).not.toBeNull();
  });

  it("announces a failure without closing", () => {
    mount(<ConfirmDialog {...base} error="That script is still being reviewed." />);
    const alert = container.querySelector(".ckm-confirm__error");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(surface()).not.toBeNull();
  });
});

describe("ActionSheet", () => {
  const items = [
    { id: "share", label: "Share", icon: "share", to: "/share" },
    { id: "edit", label: "Edit", icon: "edit", onSelect: vi.fn() },
    { id: "delete", label: "Delete", icon: "delete", destructive: true, onSelect: vi.fn() },
  ];

  it("is a dialog of controls, not a role=menu", () => {
    mount(<ActionSheet open title="Script actions" items={items} />);
    expect(surface().getAttribute("role")).toBe("dialog");
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(container.querySelector('[role="menuitem"]')).toBeNull();
  });

  it("announces its length as a real list", () => {
    mount(<ActionSheet open title="Script actions" items={items} />);
    const list = container.querySelector("ul.ckm-action-sheet__list");
    expect(list.children.length).toBe(3);
    expect([...list.children].every((li) => li.tagName === "LI")).toBe(true);
  });

  it("renders a navigating item as a link and an acting item as a button", () => {
    mount(<ActionSheet open title="Script actions" items={items} />);
    const actions = [...container.querySelectorAll(".ckm-action-sheet__action")];
    expect(actions[0].tagName).toBe("A");
    expect(actions[0].getAttribute("href")).toBe("/share");
    expect(actions[1].tagName).toBe("BUTTON");
  });

  it("closes on a normal action but leaves a destructive one to its confirmation", () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    const onDestroy = vi.fn();
    mount(
      <ActionSheet
        open
        onClose={onClose}
        title="Script actions"
        items={[
          { id: "edit", label: "Edit", onSelect },
          { id: "delete", label: "Delete", destructive: true, onSelect: onDestroy },
        ]}
      />,
    );
    const [edit, remove] = container.querySelectorAll(".ckm-action-sheet__action");

    act(() => remove.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    act(() => edit.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers an explicit cancel", () => {
    const onClose = vi.fn();
    mount(<ActionSheet open onClose={onClose} title="Script actions" items={items} />);
    const cancel = container.querySelector(".ckm-action-sheet__cancel");
    expect(cancel.textContent).toBe("Cancel");
    act(() => cancel.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("stacking", () => {
  it("makes the lower overlay inert and closes only the top one on Escape", () => {
    const onSheetClose = vi.fn();
    const onConfirmClose = vi.fn();

    function Harness() {
      const ref = useRef(null);
      return (
        <div ref={ref}>
          <Sheet open onClose={onSheetClose} title="Script actions">body</Sheet>
          <ConfirmDialog
            open
            onCancel={onConfirmClose}
            title="Delete this script?"
            message="It cannot be undone."
            destructive
          />
        </div>
      );
    }
    mount(<Harness />);

    const surfaces = [...container.querySelectorAll(".ckm-overlay")];
    expect(surfaces.length).toBe(2);
    // The confirm dialog mounted last, so it marked the sheet's layer inert.
    expect(surfaces[0].hasAttribute("inert")).toBe(true);
    expect(surfaces[1].hasAttribute("inert")).toBe(false);

    press("Escape");
    expect(onConfirmClose).toHaveBeenCalledTimes(1);
    expect(onSheetClose).not.toHaveBeenCalled();
  });
});
