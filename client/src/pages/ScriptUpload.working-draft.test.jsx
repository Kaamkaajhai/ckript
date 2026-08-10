// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import {
  buildUploadWorkingDraftSnapshot,
  readUploadWorkingDraft,
  uploadWorkingDraftKey,
  writeUploadWorkingDraft,
} from "./CreateProject/lib/uploadWorkingDraft";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

let latestVm = null;

vi.mock("../services/api", () => ({ default: apiMock }));
vi.mock("../context/DarkModeContext", () => ({ useDarkMode: () => ({ isDarkMode: false }) }));
vi.mock("../context/AuthModalContext", () => ({ useAuthModal: () => ({ openPricingModal: vi.fn() }) }));
vi.mock("../components/script-upload/ScriptUploadWorkspace", () => ({
  default: ({ vm }) => {
    latestVm = vm;
    return <div data-testid="working-draft-probe">{vm.state.formData.title}</div>;
  },
}));

import ScriptUpload from "./ScriptUpload";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const user = {
  _id: "writer-1",
  role: "writer",
  username: "writer_one",
  writerProfile: { username: "writer_one" },
  subscription: { plan: "gold" },
};

let container;
let root;

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
};

const renderUpload = async (entry = "/upload") => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user }}>
          <ScriptUpload />
        </AuthContext.Provider>
      </MemoryRouter>
    );
    await flushAsync();
  });
};

const setField = (name, value) => {
  act(() => latestVm.actions.handleChange({ target: { name, value, type: "text" } }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("user", JSON.stringify({ token: "token-1" }));
  latestVm = null;
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("confirm", vi.fn(() => false));
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
  apiMock.get.mockImplementation((url) => {
    if (url === "/scripts/script-limit") {
      return Promise.resolve({ data: { applies: true, used: 0, limit: 8, plan: "gold", limitReached: false } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
  latestVm = null;
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ScriptUpload working-draft protection (DEF-7)", () => {
  it("debounces a local snapshot and restores it after a refresh", async () => {
    await renderUpload();
    setField("title", "The Rain Archive");
    act(() => latestVm.actions.setTextContent("INT. ARCHIVE - NIGHT\nRain reaches the files."));

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 340));
    });

    const saved = readUploadWorkingDraft({});
    expect(saved.data.formData.title).toBe("The Rain Archive");
    expect(saved.data.textContent).toContain("ARCHIVE");
    expect(latestVm.state.localSnapshotSaved).toBe(true);

    act(() => root.unmount());
    container.remove();
    root = null;
    container = null;

    await renderUpload();
    expect(latestVm.state.formData.title).toBe("The Rain Archive");
    expect(latestVm.state.textContent).toContain("ARCHIVE");
    expect(latestVm.state.workingDraftDirty).toBe(true);
  });

  it("keeps recovery data when manual Save fails and clears it only after confirmed server success", async () => {
    await renderUpload();
    setField("title", "Manual Save Contract");
    act(() => latestVm.actions.flushWorkingSnapshot());
    expect(readUploadWorkingDraft({})).not.toBeNull();

    apiMock.post.mockRejectedValueOnce({ response: { data: { message: "Offline" } } });
    let saved;
    await act(async () => { saved = await latestVm.actions.handleSaveDraft(); });
    expect(saved).toBe(false);
    expect(readUploadWorkingDraft({})).not.toBeNull();

    apiMock.post.mockResolvedValueOnce({
      data: { _id: "draft-42", updatedAt: "2026-08-10T10:00:00.000Z" },
    });
    await act(async () => { saved = await latestVm.actions.handleSaveDraft(); });
    expect(saved).toBe(true);
    expect(readUploadWorkingDraft({})).toBeNull();
    expect(latestVm.state.fromDraft).toBe(true);
    expect(latestVm.state.workingDraftDirty).toBe(false);
  });

  it("flushes refresh work synchronously and queues a distinct keepalive exit save", async () => {
    await renderUpload();
    setField("title", "Before Unload");

    const event = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(event));

    expect(event.defaultPrevented).toBe(true);
    expect(readUploadWorkingDraft({}).data.formData.title).toBe("Before Unload");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/scripts/draft"),
      expect.objectContaining({
        keepalive: true,
        headers: expect.objectContaining({ "X-Draft-Save-Reason": "beforeunload" }),
      })
    );
    // An unconfirmed keepalive never clears the durable local copy.
    expect(readUploadWorkingDraft({})).not.toBeNull();
  });

  it("intercepts browser Back while dirty and leaves the per-flow snapshot in place", async () => {
    await renderUpload();
    setField("title", "Back-swipe Safe");

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(readUploadWorkingDraft({}).data.formData.title).toBe("Back-swipe Safe");
    expect(container.querySelector("[data-testid='working-draft-probe']")).toBeTruthy();
  });

  it("uses the route-specific ?draft key and never falls back to the fresh-upload key", async () => {
    apiMock.get.mockImplementation((url) => {
      if (url === "/scripts/script-limit") {
        return Promise.resolve({ data: { applies: true, used: 0, limit: 8, plan: "gold", limitReached: false } });
      }
      if (url === "/scripts/draft-a") {
        return Promise.resolve({
          data: {
            _id: "draft-a",
            title: "Server draft",
            textContent: "Server text",
            updatedAt: "2026-08-10T08:00:00.000Z",
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    localStorage.setItem(uploadWorkingDraftKey({}), JSON.stringify({ data: { formData: { title: "Wrong flow" } } }));

    await renderUpload("/upload?draft=draft-a");
    expect(latestVm.state.formData.title).toBe("Server draft");

    setField("title", "Draft-specific local edit");
    act(() => latestVm.actions.flushWorkingSnapshot());
    expect(readUploadWorkingDraft({ draftId: "draft-a" }).data.formData.title).toBe("Draft-specific local edit");
    expect(JSON.parse(localStorage.getItem(uploadWorkingDraftKey({}))).data.formData.title).toBe("Wrong flow");
  });

  it("keeps ?edit recovery isolated and asks before restoring over a server copy that moved", async () => {
    apiMock.get.mockImplementation((url) => {
      if (url === "/scripts/script-limit") {
        return Promise.resolve({ data: { applies: true, used: 0, limit: 8, plan: "gold", limitReached: false } });
      }
      if (url === "/scripts/live-a") {
        return Promise.resolve({
          data: {
            _id: "live-a",
            title: "Newer server title",
            textContent: "Newer server text",
            updatedAt: "2026-08-10T12:00:00.000Z",
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    writeUploadWorkingDraft(
      { editId: "live-a" },
      buildUploadWorkingDraftSnapshot({
        userId: "writer-1",
        editId: "live-a",
        baseUpdatedAt: "2026-08-10T08:00:00.000Z",
        data: {
          formData: { title: "Older local title" },
          textContent: "Older local text with unsent edits",
        },
      })
    );

    await renderUpload("/upload?edit=live-a");
    expect(latestVm.state.formData.title).toBe("Newer server title");
    expect(latestVm.state.toastMessage.text).toMatch(/server copy changed/i);
    expect(latestVm.state.toastMessage.action.label).toMatch(/restore local/i);

    act(() => latestVm.state.toastMessage.action.onClick());
    expect(latestVm.state.formData.title).toBe("Older local title");
    expect(readUploadWorkingDraft({ editId: "live-a" })).not.toBeNull();
    expect(readUploadWorkingDraft({})).toBeNull();
  });
});
