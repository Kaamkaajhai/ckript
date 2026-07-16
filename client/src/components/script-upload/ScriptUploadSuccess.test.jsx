// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScriptUploadSuccess from "./ScriptUploadSuccess";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
});

describe("ScriptUploadSuccess", () => {
  it("renders only the submitted message and the two requested actions", () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root.render(
      <MemoryRouter>
        <ScriptUploadSuccess projectTitle="A Monsoon Story" reviewPath="/a-monsoon-story/writer" />
      </MemoryRouter>
    ));

    expect(container.textContent).toContain("Your project has been submitted.");
    expect(container.textContent).toContain("A Monsoon Story");
    const actions = container.querySelectorAll(".su-success-actions a");
    expect(actions).toHaveLength(2);
    expect(actions[0].textContent).toContain("Create more");
    expect(actions[0].getAttribute("href")).toBe("/upload");
    expect(actions[1].textContent).toContain("Review your project");
    expect(actions[1].getAttribute("href")).toBe("/a-monsoon-story/writer");
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});
