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
let createElement;

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
};

function NativeMediaHarness({ vm }) {
  return (
    <div data-testid="native-media-harness">
      <button
        type="button"
        data-testid="native-set-title"
        onClick={() => vm.actions.handleChange({ target: { name: "title", value: "A Monsoon Story", type: "text" } })}
      >
        Set title
      </button>
      <button
        type="button"
        data-testid="native-set-trailer"
        onClick={() => {
          const trailer = new File(["media"], "feature-cut.mp4", { type: "video/mp4", lastModified: 7 });
          Object.defineProperty(trailer, "size", { value: 30 * 1024 * 1024 });
          vm.actions.handleTrailerSelect(trailer);
        }}
      >
        Set large trailer
      </button>
      <button type="button" data-testid="native-submit" onClick={vm.actions.handleSubmit}>Submit</button>
      {vm.state.mediaUploadPreflight && (
        <button type="button" data-testid="native-confirm" onClick={vm.actions.confirmMediaUploadPreflight}>
          Confirm large upload
        </button>
      )}
      {vm.state.mediaUploadActive && (
        <button type="button" data-testid="native-cancel" onClick={vm.actions.cancelMediaUpload}>
          Cancel upload
        </button>
      )}
      {vm.state.mediaRecovery?.cancelledTypes?.length > 0 && (
        <p data-testid="native-cancelled">Cancelled: {vm.state.mediaRecovery.cancelledTypes.join(",")}</p>
      )}
    </div>
  );
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(window, "fetch").mockResolvedValue(new window.Response(new Uint8Array(), { status: 200 }));
  vi.spyOn(URL, "createObjectURL").mockReturnValue("data:video/mp4;base64,");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  createElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    if (String(tagName).toLowerCase() === "video") {
      return { preload: "", src: "", onloadedmetadata: null, onerror: null };
    }
    return createElement(tagName, options);
  });
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

  it("preflights a large native upload and preserves cancellation as recovery, not failure", async () => {
    const user = {
      role: "writer",
      username: "writer_one",
      writerProfile: { username: "writer_one" },
      subscription: { plan: "gold" },
    };
    apiMock.post.mockImplementation((url, _body, config) => {
      if (url === "/scripts/upload") {
        return Promise.resolve({ data: { _id: "script-42", title: "A Monsoon Story" } });
      }
      if (url === "/scripts/script-42/upload-trailer") {
        return new Promise((_resolve, reject) => {
          config.signal.addEventListener(
            "abort",
            () => reject({ code: "ERR_CANCELED" }),
            { once: true },
          );
        });
      }
      return Promise.reject(new Error(`Unexpected POST ${url}`));
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/upload"]}>
          <AuthContext.Provider value={{ user }}>
            <ScriptUpload Workspace={NativeMediaHarness} nativeChrome />
          </AuthContext.Provider>
        </MemoryRouter>
      );
      await flushAsync();
    });

    act(() => container.querySelector("[data-testid='native-set-title']").click());
    act(() => container.querySelector("[data-testid='native-set-trailer']").click());
    await act(async () => {
      container.querySelector("[data-testid='native-submit']").click();
      await flushAsync();
    });

    expect(container.querySelector("[data-testid='native-confirm']")).toBeTruthy();
    expect(apiMock.post).not.toHaveBeenCalledWith("/scripts/upload", expect.anything());

    await act(async () => {
      container.querySelector("[data-testid='native-confirm']").click();
      await flushAsync();
    });
    expect(container.querySelector("[data-testid='native-cancel']")).toBeTruthy();

    await act(async () => {
      container.querySelector("[data-testid='native-cancel']").click();
      await flushAsync();
    });

    expect(container.querySelector("[data-testid='native-cancelled']").textContent)
      .toBe("Cancelled: trailer");
    expect(container.textContent).not.toMatch(/failed/i);
    expect(apiMock.post).toHaveBeenCalledWith(
      "/scripts/script-42/upload-trailer",
      expect.any(FormData),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
