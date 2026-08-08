// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import useFocusTrap from "./useFocusTrap";
import useInertBackground from "./useInertBackground";
import { lockScrollSurface } from "./useScrollLock";
import { canReceiveFocus, isTabbable, tabbableWithin } from "./tabbable";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(ui) {
  container = document.createElement("div");
  container.className = "ckm";
  container.innerHTML = '<div class="ckm-root"><main class="ckm-shell__scroll ckm-scroll"></main></div>';
  document.body.appendChild(container);
  const host = document.createElement("div");
  container.querySelector(".ckm-root").appendChild(host);
  root = createRoot(host);
  act(() => root.render(ui));
  return host;
}

function tab({ shift = false } = {}) {
  act(() => {
    document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Tab", shiftKey: shift, bubbles: true, cancelable: true,
    }));
  });
}

describe("tabbable", () => {
  it("excludes what Tab genuinely cannot reach", () => {
    const host = document.createElement("div");
    host.innerHTML = `
      <button id="ok">ok</button>
      <button id="off" disabled>disabled</button>
      <a id="anchor">no href</a>
      <div id="skipped" tabindex="-1">programmatic only</div>
      <input id="field" />
    `;
    document.body.appendChild(host);

    expect(tabbableWithin(host).map((el) => el.id)).toEqual(["ok", "field"]);
    expect(isTabbable(host.querySelector("#off"))).toBe(false);
    expect(isTabbable(host.querySelector("#skipped"))).toBe(false);
    host.remove();
  });

  it("excludes anything inside an inert subtree", () => {
    const host = document.createElement("div");
    host.innerHTML = '<div inert><button id="hidden">no</button></div><button id="live">yes</button>';
    document.body.appendChild(host);
    expect(tabbableWithin(host).map((el) => el.id)).toEqual(["live"]);
    host.remove();
  });

  it("knows when a remembered element can no longer take focus back", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    expect(canReceiveFocus(button)).toBe(true);
    button.remove();
    expect(canReceiveFocus(button)).toBe(false);
    expect(canReceiveFocus(null)).toBe(false);
  });
});

describe("useFocusTrap", () => {
  function Trapped({ enabled = true }) {
    const ref = useRef(null);
    useFocusTrap(ref, { enabled });
    return (
      <div ref={ref} tabIndex={-1}>
        <button id="first" type="button">first</button>
        <button id="middle" type="button">middle</button>
        <button id="last" type="button">last</button>
      </div>
    );
  }

  it("focuses the first tabbable element on open", () => {
    mount(<Trapped />);
    expect(document.activeElement.id).toBe("first");
  });

  it("wraps forward from the last element to the first", () => {
    mount(<Trapped />);
    document.getElementById("last").focus();
    tab();
    expect(document.activeElement.id).toBe("first");
  });

  it("wraps backward from the first element to the last", () => {
    mount(<Trapped />);
    document.getElementById("first").focus();
    tab({ shift: true });
    expect(document.activeElement.id).toBe("last");
  });

  it("leaves Tab alone in the middle of the surface", () => {
    mount(<Trapped />);
    const middle = document.getElementById("middle");
    middle.focus();
    tab();
    // Not intercepted: the browser's own sequential navigation applies, which
    // happy-dom does not run, so focus simply stays put. The assertion that
    // matters is that the trap did not yank it to the first element.
    expect(document.activeElement.id).toBe("middle");
  });

  it("holds focus on a surface with nothing tabbable in it", () => {
    function Empty() {
      const ref = useRef(null);
      useFocusTrap(ref, { enabled: true });
      return <div ref={ref} tabIndex={-1} id="surface"><p>nothing to focus</p></div>;
    }
    mount(<Empty />);
    expect(document.activeElement.id).toBe("surface");
    tab();
    expect(document.activeElement.id).toBe("surface");
  });

  it("pulls focus back when something outside steals it", () => {
    mount(<Trapped />);
    const outsider = document.createElement("button");
    document.body.appendChild(outsider);
    act(() => {
      outsider.focus();
      outsider.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    });
    expect(document.activeElement.id).toBe("first");
    outsider.remove();
  });
});

describe("useInertBackground", () => {
  it("marks siblings and restores only what it marked", () => {
    function Harness({ enabled }) {
      const ref = useRef(null);
      useInertBackground(ref, enabled);
      return <div ref={ref} id="overlay" />;
    }
    const host = mount(<Harness enabled />);
    const sibling = container.querySelector(".ckm-shell__scroll");
    expect(sibling.hasAttribute("inert")).toBe(true);
    expect(host.querySelector("#overlay").hasAttribute("inert")).toBe(false);

    act(() => root.render(<Harness enabled={false} />));
    expect(sibling.hasAttribute("inert")).toBe(false);
  });

  /*
   * An element that was already inert for its own reasons before an overlay
   * opened must still be inert after it closes. Without this, opening and
   * closing a sheet would quietly re-enable a region some other part of the app
   * had deliberately disabled.
   */
  it("never clears an inert attribute that was not its own", () => {
    function Harness({ enabled }) {
      const ref = useRef(null);
      useInertBackground(ref, enabled);
      return <div ref={ref} id="overlay" />;
    }
    mount(<Harness enabled={false} />);
    const sibling = container.querySelector(".ckm-shell__scroll");
    sibling.setAttribute("inert", "");

    act(() => root.render(<Harness enabled />));
    act(() => root.render(<Harness enabled={false} />));
    expect(sibling.hasAttribute("inert")).toBe(true);
  });

  /*
   * `inert` removes a subtree from the accessibility tree, so an inert live
   * region cannot announce. If the toast layer were swept up by this walk, a
   * message raised while a dialog is open would reach nobody: not shown to
   * assistive technology, not dismissible, not spoken.
   */
  it("leaves an app-level live region live, so it can still announce", () => {
    function Harness({ enabled }) {
      const ref = useRef(null);
      useInertBackground(ref, enabled);
      return <div ref={ref} id="overlay" />;
    }
    mount(<Harness enabled={false} />);

    const layer = document.createElement("div");
    layer.setAttribute("data-ckm-live-region", "");
    container.querySelector(".ckm-root").appendChild(layer);

    act(() => root.render(<Harness enabled />));

    // The screen behind is hidden, as it must be; the toast layer is not.
    expect(container.querySelector(".ckm-shell__scroll").hasAttribute("inert")).toBe(true);
    expect(layer.hasAttribute("inert")).toBe(false);
  });
});

describe("lockScrollSurface", () => {
  it("reference-counts so the first release cannot unlock a surface still in use", () => {
    const node = document.createElement("div");
    node.scrollTop = 0;
    document.body.appendChild(node);

    const releaseA = lockScrollSurface(node);
    const releaseB = lockScrollSurface(node);
    expect(node.classList.contains("is-scroll-locked")).toBe(true);

    releaseA();
    expect(node.classList.contains("is-scroll-locked")).toBe(true);
    releaseB();
    expect(node.classList.contains("is-scroll-locked")).toBe(false);
    node.remove();
  });

  it("ignores a release called twice", () => {
    const node = document.createElement("div");
    document.body.appendChild(node);
    const release = lockScrollSurface(node);
    const other = lockScrollSurface(node);
    release();
    release(); // must not decrement the count a second time
    expect(node.classList.contains("is-scroll-locked")).toBe(true);
    other();
    expect(node.classList.contains("is-scroll-locked")).toBe(false);
    node.remove();
  });
});
