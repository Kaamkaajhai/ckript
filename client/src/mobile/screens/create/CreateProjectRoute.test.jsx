// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateProjectChrome from "./CreateProjectChrome";
import CreateProjectRoute from "./CreateProjectRoute";

/*
 * The seam, from the mobile side. Three props decide whether the shared
 * orchestrator behaves as a phone screen, and each of them fails silently if it
 * is dropped:
 *
 *   Shell           forgotten → the desktop three-pane workspace renders inside
 *                   a 520px frame;
 *   nativeChrome    forgotten → the desktop exit modal, drafts drawer, toast and
 *                   three more modals render *on top of* the mobile ones;
 *   hostClassName   forgotten → `.ckm-shell` is `height: 100%` under a
 *                   default-height div, and the whole screen collapses to the
 *                   height of its content.
 *
 * None of those throws. All three are one word. So they are pinned here rather
 * than left to be noticed on a phone.
 */

const seen = { props: null };

vi.mock("../../../pages/CreateProject", () => ({
  default: (props) => {
    seen.props = props;
    return <div data-testid="orchestrator" />;
  },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

beforeEach(() => {
  seen.props = null;
  document.body.innerHTML = "";
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

describe("CreateProjectRoute — the chrome seam", () => {
  beforeEach(() => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<CreateProjectRoute />));
  });

  it("renders the shared orchestrator rather than a mobile fork of it", () => {
    // The point of the whole seam: autosave, the keepalive exit save, the
    // working-draft snapshot, validation and publish stay one implementation.
    expect(document.querySelector("[data-testid='orchestrator']")).toBeTruthy();
  });

  it("injects the mobile chrome", () => {
    expect(seen.props.Shell).toBe(CreateProjectChrome);
  });

  it("claims the modal surfaces, so the desktop ones stay unrendered", () => {
    expect(seen.props.nativeChrome).toBe(true);
  });

  it("replaces the host class, because the app shell needs its height passed through", () => {
    expect(seen.props.hostClassName).toBe("ckm-create-project__host");
  });
});
