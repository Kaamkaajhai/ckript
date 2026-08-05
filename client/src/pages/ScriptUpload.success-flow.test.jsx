// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({ default: apiMock }));
vi.mock("../context/DarkModeContext", () => ({ useDarkMode: () => ({ isDarkMode: false }) }));
vi.mock("../context/AuthModalContext", () => ({ useAuthModal: () => ({ openPricingModal: vi.fn() }) }));
vi.mock("../components/script-upload/ScriptUploadWorkspace", () => ({
  default: ({ vm }) => (
    <div data-testid="upload-workspace">
      <button
        type="button"
        data-testid="set-title"
        onClick={() => vm.actions.handleChange({ target: { name: "title", value: "A Monsoon Story", type: "text" } })}
      >
        Set title
      </button>
      <button type="button" data-testid="submit-upload" onClick={vm.actions.handleSubmit}>Submit</button>
    </div>
  ),
}));
vi.mock("../utils/scriptUploadValidation", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    validateUploadScreen: vi.fn(() => []),
    validateUploadWorkflow: vi.fn(() => []),
  };
});

import ScriptUpload from "./ScriptUpload";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
};

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("alert", vi.fn());
  vi.stubGlobal("confirm", vi.fn(() => true));
  apiMock.get.mockImplementation((url) => {
    if (url === "/scripts/script-limit") {
      return Promise.resolve({ data: { applies: true, used: 0, limit: 8, plan: "gold", limitReached: false } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  apiMock.post.mockImplementation((url) => {
    if (url === "/scripts/upload") {
      return Promise.resolve({ data: { _id: "script-42", title: "A Monsoon Story" } });
    }
    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ScriptUpload success flow", () => {
  it("replaces the complete workspace after submission without legacy alerts or confirms", async () => {
    const user = {
      role: "writer",
      username: "writer_one",
      writerProfile: { username: "writer_one" },
      subscription: { plan: "gold" },
    };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/upload"]}>
          <AuthContext.Provider value={{ user }}>
            <ScriptUpload />
          </AuthContext.Provider>
        </MemoryRouter>
      );
      await flushAsync();
    });

    act(() => container.querySelector("[data-testid='set-title']").click());
    await act(async () => {
      container.querySelector("[data-testid='submit-upload']").click();
      await flushAsync();
    });

    expect(apiMock.post).toHaveBeenCalledWith("/scripts/upload", expect.objectContaining({ title: "A Monsoon Story" }));
    expect(container.querySelector("[data-testid='upload-workspace']")).toBeNull();
    expect(container.textContent).toContain("Your project has been submitted.");
    expect(container.querySelectorAll(".su-success-actions a")).toHaveLength(2);
    expect(container.querySelector(".su-success-button--primary").getAttribute("href")).toBe("/a-monsoon-story/writer_one");
    expect(window.alert).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(container.querySelector("[role='dialog']")).toBeNull();
  });
});
