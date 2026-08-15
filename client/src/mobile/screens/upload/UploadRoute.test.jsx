// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import process from "node:process";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
/* Imported statically, not with a dynamic `import()` inside the test: this
   module pulls in the whole chrome tree and its stylesheet, and a cold load of
   that inside a timed assertion is several seconds of module resolution being
   charged to the first test. `vi.mock` is hoisted above this either way. */
import UploadRoute from "./UploadRoute";

/*
 * The seam, tested from the mobile side.
 *
 * The whole promotion rests on one claim: `pages/ScriptUpload.jsx` is shared
 * code, and the mobile route changes only which chrome it renders. These tests
 * check that claim in both directions — that the mobile route passes the three
 * props, and that a caller who passes none of them (which is every desktop call
 * site) still gets the desktop workspace and the desktop early returns.
 *
 * `ScriptUpload` is stubbed as an inspector rather than mounted for real: the
 * real one fetches the plan limit on mount and needs Auth, DarkMode and
 * AuthModal contexts, none of which say anything about whether the seam is
 * wired. What the seam IS, is the props.
 */

const received = { props: null };

vi.mock("../../../pages/ScriptUpload", () => ({
  default: (props) => {
    received.props = props;
    return <div data-testid="orchestrator" />;
  },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

const render = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<MemoryRouter><div className="ckm"><UploadRoute /></div></MemoryRouter>);
  });
};

beforeEach(() => { document.body.innerHTML = ""; received.props = null; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

describe("UploadRoute", () => {
  it("mounts the SHARED orchestrator rather than a mobile fork of it", () => {
    render();
    expect(document.querySelector("[data-testid='orchestrator']")).toBeTruthy();
  });

  it("passes exactly the three seam props, and nothing else", () => {
    /*
     * The count matters. Every extra prop is a place the two platforms can start
     * to differ, and the seam's whole argument is that the difference is chrome
     * — so `Shell`-style injection, the native flag and the host class are the
     * complete list.
     */
    render();

    expect(Object.keys(received.props).sort()).toEqual(["Workspace", "hostClassName", "nativeChrome"]);
    expect(received.props.nativeChrome).toBe(true);
    expect(received.props.hostClassName).toBe("ckm-upload__host");
    expect(typeof received.props.Workspace).toBe("function");
  });

  it("hands over the chrome that knows about all four surfaces", () => {
    // Not `Upload` directly: the three non-flow states (refused, resolving,
    // submitted) are chosen above the flow, and a route that mounted `Upload`
    // would draw a form for a visitor who may not upload at all.
    render();
    expect(received.props.Workspace.name).toBe("ScriptUploadChrome");
  });
});

/* Vitest runs with the client package as its working directory, which is a
   steadier anchor here than `import.meta.url` — the latter is a transformed
   module URL under Vite and is not guaranteed to be a `file:` scheme. */
const readOrchestratorSource = () => readFileSync(
  resolve(process.cwd(), "src/pages/ScriptUpload.jsx"),
  "utf8",
);

describe("the desktop defaults", () => {
  /*
   * Read off the file rather than the module, because the module is mocked in
   * this suite and because what is being asserted is the SIGNATURE: every seam
   * prop must be defaulted, so App.jsx's bare `<ScriptUpload />` renders exactly
   * what it rendered before the promotion.
   *
   * Reading from disk rather than importing `?raw` keeps the check from being
   * quietly skipped if a Vite feature changes.
   */
  it("defaults every seam prop, so the desktop call site is unchanged", () => {
    const source = readOrchestratorSource();

    expect(source).toMatch(/Workspace = ScriptUploadWorkspace/);
    expect(source).toMatch(/nativeChrome = false/);
    expect(source).toMatch(/hostClassName = ""/);
    // And the desktop branch still renders the workspace it always did.
    expect(source).toMatch(/<Workspace vm=\{workspaceVm\} \/>/);
  });

  it("gates each desktop-only route state on `!nativeChrome`, never removes it", () => {
    // An early return deleted rather than gated is a desktop regression that no
    // mobile test would ever catch.
    const source = readOrchestratorSource();

    expect(source).toMatch(/if \(accessDenied && !nativeChrome\)/);
    expect(source).toMatch(/sourceLoad\.status === UPLOAD_SOURCE_LOAD_STATUS\.LOADING && !nativeChrome/);
    expect(source).toMatch(/sourceIssue && !nativeChrome/);
    expect(source).toMatch(/if \(submissionSuccess && !nativeChrome\)/);
  });
});
