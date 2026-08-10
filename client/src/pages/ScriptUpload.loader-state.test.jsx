// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import {
  buildUploadWorkingDraftSnapshot,
  writeUploadWorkingDraft,
} from "./CreateProject/lib/uploadWorkingDraft";

const { apiMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

vi.mock("../services/api", () => ({ default: apiMock }));
vi.mock("../context/DarkModeContext", () => ({ useDarkMode: () => ({ isDarkMode: false }) }));
vi.mock("../context/AuthModalContext", () => ({ useAuthModal: () => ({ openPricingModal: vi.fn() }) }));

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
let latestVm;

function Probe({ vm }) {
  useEffect(() => { latestVm = vm; }, [vm]);
  return <div data-testid="source-probe">{vm.state.sourceLoad?.status}</div>;
}

const flushAsync = async (turns = 3) => {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
};

const renderUpload = async (entry) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user }}>
          <ScriptUpload Workspace={Probe} nativeChrome hostClassName="test-host" />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await flushAsync();
  });
};

const sourcePayload = ({ id, title, updatedAt = "2026-08-10T10:00:00.000Z" }) => ({
  _id: id,
  title,
  textContent: `INT. ROOM - NIGHT\n${title}`,
  updatedAt,
  roles: [],
  tags: [],
  classification: {},
  services: {},
  legal: {},
  rightsLicensing: {},
  filmDetails: {},
});

beforeEach(() => {
  latestVm = null;
  localStorage.clear();
  localStorage.setItem("user", JSON.stringify({ token: "token-1" }));
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

describe("ScriptUpload source-loader safety (DEF-8)", () => {
  it.each([
    ["edit", 404, "not-found"],
    ["draft", 403, "forbidden"],
  ])("keeps a %s source closed after HTTP %s", async (kind, status, expected) => {
    const id = `${kind}-source`;
    writeUploadWorkingDraft(
      kind === "edit" ? { editId: id } : { draftId: id },
      buildUploadWorkingDraftSnapshot({
        userId: user._id,
        ...(kind === "edit" ? { editId: id } : { draftId: id }),
        data: { formData: { title: "Cached title" }, textContent: "Cached content" },
      }),
    );
    apiMock.get.mockImplementation((url) => {
      if (url === "/scripts/script-limit") return Promise.resolve({ data: {} });
      if (url === `/scripts/${id}`) return Promise.reject({ response: { status, data: { message: "Denied" } } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderUpload(`/upload?${kind}=${id}`);

    expect(latestVm.state.sourceLoad.status).toBe(expected);
    expect(latestVm.state.sourceLoad.hasLocalRecovery).toBe(false);
    expect(latestVm.state.sourceWriteBlocked).toBe(true);
    expect(latestVm.actions.recoverSourceFromDevice()).toBe(false);
    expect(latestVm.state.formData.title).toBe("");
  });

  it("distinguishes an offline failure and offers a valid same-user device copy", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    writeUploadWorkingDraft(
      { editId: "offline-edit" },
      buildUploadWorkingDraftSnapshot({
        userId: user._id,
        editId: "offline-edit",
        baseUpdatedAt: "2026-08-10T08:00:00.000Z",
        data: { formData: { title: "Device-only title" }, textContent: "Unsynced scene" },
      }),
    );

    await renderUpload("/upload?edit=offline-edit");

    expect(latestVm.state.sourceLoad).toMatchObject({
      status: "failed", offline: true, hasLocalRecovery: true,
    });
    act(() => latestVm.actions.recoverSourceFromDevice());
    expect(latestVm.state.sourceLoad.status).toBe("local-only");
    expect(latestVm.state.formData.title).toBe("Device-only title");
    expect(latestVm.state.sourceWriteBlocked).toBe(true);
  });

  it("retries from a device copy and does not clobber a newer server version", async () => {
    let sourceAttempts = 0;
    writeUploadWorkingDraft(
      { editId: "retry-edit" },
      buildUploadWorkingDraftSnapshot({
        userId: user._id,
        editId: "retry-edit",
        baseUpdatedAt: "2026-08-10T08:00:00.000Z",
        data: { formData: { title: "Older local title" }, textContent: "Older local text" },
      }),
    );
    apiMock.get.mockImplementation((url) => {
      if (url === "/scripts/script-limit") return Promise.resolve({ data: {} });
      if (url === "/scripts/retry-edit") {
        sourceAttempts += 1;
        return sourceAttempts === 1
          ? Promise.reject(new Error("network"))
          : Promise.resolve({ data: sourcePayload({
            id: "retry-edit",
            title: "Newer server title",
            updatedAt: "2026-08-10T12:00:00.000Z",
          }) });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    await renderUpload("/upload?edit=retry-edit");
    act(() => latestVm.actions.recoverSourceFromDevice());
    expect(latestVm.state.formData.title).toBe("Older local title");

    await act(async () => {
      latestVm.actions.retrySourceLoad();
      await flushAsync();
    });

    expect(sourceAttempts).toBe(2);
    expect(latestVm.state.sourceLoad.status).toBe("ready");
    expect(latestVm.state.formData.title).toBe("Newer server title");
    expect(latestVm.state.toastMessage.text).toMatch(/server copy changed/i);
    expect(latestVm.state.toastMessage.action.label).toMatch(/restore local/i);
  });

  it("blocks every edit write until GET /scripts/:id has succeeded", async () => {
    writeUploadWorkingDraft(
      { editId: "blocked-edit" },
      buildUploadWorkingDraftSnapshot({
        userId: user._id,
        editId: "blocked-edit",
        data: { formData: { title: "Recovered edit" }, textContent: "Recovered text" },
      }),
    );
    await renderUpload("/upload?edit=blocked-edit");
    act(() => latestVm.actions.recoverSourceFromDevice());

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await latestVm.actions.handleSubmit(event);
      await flushAsync(1);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(apiMock.put).not.toHaveBeenCalled();
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(latestVm.state.toastMessage.text).toMatch(/reload the server copy/i);
  });
});
