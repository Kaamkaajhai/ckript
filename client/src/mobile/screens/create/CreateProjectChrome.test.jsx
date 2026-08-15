// @vitest-environment happy-dom
/* `createElement` rather than `<Component />`: this repo's eslint has no React
   plugin, so a component referenced only as a JSX tag reads as an unused
   variable. Same reason `motion` is a standing false positive in index.jsx. */
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectContext } from "../../../pages/CreateProject/CreateProjectContext";
import { ToastContext } from "../../components/feedback/toastContext";
import CreateProjectChrome from "./CreateProjectChrome";
import useCreateProjectToasts from "./useCreateProjectToasts";

/*
 * Two things this layer owns, and nothing else: which surface is mounted, and
 * where the orchestrator's transient messages go now that its own toast is
 * suppressed. Both are small and both are easy to get silently wrong — a chrome
 * that renders the wizard on step 1 looks fine until someone opens the route,
 * and a dropped toast is invisible by definition.
 */

vi.mock("./Editor", () => ({ default: () => <div data-testid="editor" /> }));
vi.mock("./Wizard", () => ({ default: () => <div data-testid="wizard" /> }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

const toastApi = () => ({
  show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(),
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(),
});

const render = (ctx, toast, Component = CreateProjectChrome) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ToastContext.Provider value={toast}>
        <CreateProjectContext.Provider value={ctx}>
          {createElement(Component)}
        </CreateProjectContext.Provider>
      </ToastContext.Provider>
    );
  });
  return (next) => act(() => {
    root.render(
      <ToastContext.Provider value={toast}>
        <CreateProjectContext.Provider value={next}>
          {createElement(Component)}
        </CreateProjectContext.Provider>
      </ToastContext.Provider>
    );
  });
};

beforeEach(() => { document.body.innerHTML = ""; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("CreateProjectChrome — which surface", () => {
  it("mounts the editor on step 1 and the wizard on every later step", () => {
    const base = { toastMessage: null, setToastMessage: vi.fn() };

    const rerender = render({ ...base, step: 1 }, toastApi());
    expect(document.querySelector("[data-testid='editor']")).toBeTruthy();
    expect(document.querySelector("[data-testid='wizard']")).toBeNull();

    [2, 3, 4, 5].forEach((step) => {
      rerender({ ...base, step });
      expect(document.querySelector("[data-testid='wizard']")).toBeTruthy();
      expect(document.querySelector("[data-testid='editor']")).toBeNull();
    });
  });

  it("mounts exactly one surface, so the shared overlays inside them cannot double up", () => {
    render({ step: 2, toastMessage: null, setToastMessage: vi.fn() }, toastApi());

    expect(document.querySelectorAll("[data-testid='editor'], [data-testid='wizard']")).toHaveLength(1);
  });
});

describe("useCreateProjectToasts — the forwarding bridge", () => {
  const Probe = () => { useCreateProjectToasts(); return null; };

  it("re-raises a suppressed message through the mobile toast layer", () => {
    // `nativeChrome` removes the orchestrator's own fixed toast because it lands
    // on the editor's docked bar and the wizard's footer. Suppressing without
    // forwarding would silently swallow every failed save.
    const toast = toastApi();
    const setToastMessage = vi.fn();
    render(
      { toastMessage: { text: "Could not save.", type: "error", action: null }, setToastMessage },
      toast,
      Probe,
    );

    expect(toast.show).toHaveBeenCalledWith(expect.objectContaining({
      tone: "error",
      title: "Could not save.",
    }));
    // Handed over: the orchestrator's own 5s clear timer now has nothing to do,
    // and a later message is unambiguously new.
    expect(setToastMessage).toHaveBeenCalledWith(null);
  });

  it.each([
    ["error", "error"],
    ["warning", "warning"],
    ["info", "info"],
    ["something-else", "info"],
  ])("maps the orchestrator's %s tone to %s", (type, tone) => {
    const toast = toastApi();
    render({ toastMessage: { text: "Message", type }, setToastMessage: vi.fn() }, toast, Probe);

    expect(toast.show).toHaveBeenCalledWith(expect.objectContaining({ tone }));
  });

  it("never invents success — nothing in create-project raises one", () => {
    const toast = toastApi();
    render({ toastMessage: { text: "Message", type: "info" }, setToastMessage: vi.fn() }, toast, Probe);

    expect(toast.show).not.toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });

  it("carries an action across, renamed to the toast layer's contract", () => {
    const onClick = vi.fn();
    const toast = toastApi();
    render(
      { toastMessage: { text: "Plan limit reached", type: "warning", action: { label: "Get plan", onClick } }, setToastMessage: vi.fn() },
      toast,
      Probe,
    );

    const raised = toast.show.mock.calls[0][0];
    expect(raised.action.label).toBe("Get plan");
    raised.action.onAction();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not re-raise the same message object on a re-render", () => {
    const toast = toastApi();
    const message = { text: "Could not save.", type: "error" };
    const rerender = render({ toastMessage: message, setToastMessage: vi.fn() }, toast, Probe);

    rerender({ toastMessage: message, setToastMessage: vi.fn() });

    expect(toast.show).toHaveBeenCalledTimes(1);
  });

  it("raises a repeat of the same text again, because it happened twice", () => {
    // The orchestrator builds a new object per raise, so identity is a truthful
    // "is this new?" test — and a second failed save deserves a second toast.
    const toast = toastApi();
    const rerender = render(
      { toastMessage: { text: "Could not save.", type: "error" }, setToastMessage: vi.fn() },
      toast,
      Probe,
    );

    rerender({ toastMessage: { text: "Could not save.", type: "error" }, setToastMessage: vi.fn() });

    expect(toast.show).toHaveBeenCalledTimes(2);
  });

  it("raises nothing when there is nothing to raise", () => {
    const toast = toastApi();
    render({ toastMessage: null, setToastMessage: vi.fn() }, toast, Probe);

    expect(toast.show).not.toHaveBeenCalled();
  });
});
