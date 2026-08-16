import { describe, expect, it, vi } from "vitest";
import {
  buildMediaUploadPreflight,
  LARGE_MEDIA_WARNING_BYTES,
  mediaRecoveryTypes,
  mergeMediaProgress,
  uploadProjectMedia,
  withoutMediaProgress,
} from "./projectMediaUpload";

const file = (name, type) => new File(["media"], name, { type });

const uploadState = (overrides = {}) => ({
  sessionId: "session-1",
  chunkSize: 6 * 1024 * 1024,
  totalParts: 1,
  nextPart: 0,
  acceptedBytes: 0,
  percent: 0,
  ...overrides,
});

const successfulApi = () => ({
  post: vi.fn((url, body, config) => {
    if (url.endsWith("/media-uploads")) {
      expect(body).toMatchObject({ kind: expect.any(String), fileName: expect.any(String) });
      return Promise.resolve({ data: { upload: uploadState() } });
    }
    if (url.endsWith("/complete")) return Promise.resolve({ data: { ok: true } });
    expect(body).toBeInstanceOf(FormData);
    config?.onUploadProgress?.({ loaded: 3, total: 4 });
    return Promise.resolve({ data: { ok: true } });
  }),
  put: vi.fn((_url, body, config) => {
    expect(body).toBeInstanceOf(Blob);
    expect(config.headers["X-Chunk-SHA256"]).toMatch(/^[a-f0-9]{64}$/);
    config.onUploadProgress({ loaded: body.size, total: body.size });
    return Promise.resolve({ data: { upload: uploadState({ nextPart: 1, acceptedBytes: body.size, percent: 100 }) } });
  }),
  delete: vi.fn(() => Promise.resolve({ data: { ok: true } })),
});

describe("uploadProjectMedia", () => {
  it("reports real byte progress and completion for each selected file", async () => {
    const updates = [];
    const apiClient = successfulApi();

    const result = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {
        thumbnail: file("cover.jpg", "image/jpeg"),
        trailer: file("trailer.mp4", "video/mp4"),
      },
      onProgress: (type, next) => updates.push([type, next]),
    });

    expect(result).toEqual({ failedTypes: [], cancelledTypes: [] });
    expect(apiClient.post).toHaveBeenCalledTimes(3);
    expect(apiClient.put).toHaveBeenCalledOnce();
    expect(updates).toContainEqual(["thumbnail", { percent: 75, status: "uploading" }]);
    expect(updates).toContainEqual(["trailer", { percent: 100, status: "uploading" }]);
    expect(updates).toContainEqual(["thumbnail", { percent: 100, status: "done" }]);
    expect(updates).toContainEqual(["trailer", { percent: 100, status: "done" }]);
  });

  it("marks failures per file while allowing the other uploads to finish", async () => {
    const updates = [];
    const apiClient = {
      ...successfulApi(),
      put: vi.fn(() => Promise.reject(new Error("connection lost"))),
    };

    const result = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {
        thumbnail: file("cover.jpg", "image/jpeg"),
        trailer: file("trailer.mp4", "video/mp4"),
      },
      onProgress: (type, next) => updates.push([type, next]),
    });

    expect(result).toEqual({ failedTypes: ["trailer"], cancelledTypes: [] });
    expect(updates).toContainEqual(["thumbnail", { percent: 100, status: "done" }]);
    expect(updates).toContainEqual(["trailer", { status: "failed", percent: 0 }]);
  });

  it("retries only requested files and resets their progress to zero first", async () => {
    const updates = [];
    const apiClient = successfulApi();

    await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {
        thumbnail: file("cover.jpg", "image/jpeg"),
        trailer: file("trailer.mp4", "video/mp4"),
      },
      requestedTypes: ["trailer"],
      onProgress: (type, next) => updates.push([type, next]),
    });

    expect(apiClient.put).toHaveBeenCalledOnce();
    expect(apiClient.post.mock.calls.some(([url]) => url.endsWith("/media-uploads"))).toBe(true);
    expect(updates[0]).toEqual(["trailer", { percent: 0, status: "uploading" }]);
  });

  it("resumes a video at the first server-unconfirmed part", async () => {
    const updates = [];
    const trailer = new File(["0123456789"], "trailer.mp4", { type: "video/mp4" });
    const apiClient = successfulApi();
    apiClient.post.mockImplementation((url) => {
      if (url.endsWith("/media-uploads")) {
        return Promise.resolve({ data: { upload: uploadState({
          chunkSize: 6,
          totalParts: 2,
          nextPart: 1,
          acceptedBytes: 6,
          percent: 60,
        }) } });
      }
      return Promise.resolve({ data: { ok: true } });
    });
    apiClient.put.mockImplementation((url, body, config) => {
      expect(url).toContain("/parts/1");
      expect(config.headers["Content-Range"]).toBe("bytes 6-9/10");
      return Promise.resolve({ data: { upload: uploadState({
        chunkSize: 6,
        totalParts: 2,
        nextPart: 2,
        acceptedBytes: 10,
        percent: 100,
      }) } });
    });

    const result = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: { trailer },
      onProgress: (type, next) => updates.push([type, next]),
    });

    expect(result).toEqual({ failedTypes: [], cancelledTypes: [] });
    expect(updates).toContainEqual(["trailer", { percent: 60, status: "uploading", resumed: true }]);
    expect(apiClient.put).toHaveBeenCalledOnce();
  });

  it("treats a removed failed file as recovered without sending a request", async () => {
    const apiClient = { post: vi.fn() };
    const result = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {},
      requestedTypes: ["trailer"],
    });

    expect(result).toEqual({ failedTypes: [], cancelledTypes: [] });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("classifies an explicit AbortController cancellation separately from failure", async () => {
    const updates = [];
    const controller = new AbortController();
    const apiClient = {
      ...successfulApi(),
      put: vi.fn((_url, _body, config) => new Promise((_resolve, reject) => {
        expect(config.signal).toBe(controller.signal);
        config.signal.addEventListener("abort", () => reject({ code: "ERR_CANCELED" }), { once: true });
      })),
    };

    const pending = uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: { trailer: file("trailer.mp4", "video/mp4") },
      signal: controller.signal,
      onProgress: (type, next) => updates.push([type, next]),
    });
    controller.abort();

    await expect(pending).resolves.toEqual({ failedTypes: [], cancelledTypes: ["trailer"] });
    expect(updates).toContainEqual(["trailer", { status: "cancelled" }]);
    expect(updates).not.toContainEqual(["trailer", { status: "failed" }]);
    expect(apiClient.delete).toHaveBeenCalledWith("/scripts/script-7/media-uploads/session-1");
  });

  it("keeps a genuine rejection in failedTypes when a supplied signal is still live", async () => {
    const controller = new AbortController();
    const apiClient = {
      ...successfulApi(),
      put: vi.fn(() => Promise.reject(new Error("connection lost"))),
    };

    await expect(uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: { trailer: file("trailer.mp4", "video/mp4") },
      signal: controller.signal,
    })).resolves.toEqual({ failedTypes: ["trailer"], cancelledTypes: [] });
  });
});

describe("large media preflight", () => {
  const large = (name, size, lastModified = 7) => ({ name, size, lastModified });

  it("warns deterministically for trailer and pitch files at 25 MiB and lists their total", () => {
    const preflight = buildMediaUploadPreflight({
      files: {
        thumbnail: large("cover.jpg", 100 * 1024 * 1024),
        trailer: large("trailer.mp4", LARGE_MEDIA_WARNING_BYTES),
        pitchVideo: large("pitch.mp4", 30 * 1024 * 1024),
      },
    });

    expect(preflight.files.map(({ type }) => type)).toEqual(["trailer", "pitchVideo"]);
    expect(preflight.totalBytes).toBe(55 * 1024 * 1024);
    expect(preflight.signature).toContain("trailer:trailer.mp4");
  });

  it("ignores small files and media outside a requested retry", () => {
    expect(buildMediaUploadPreflight({
      files: { trailer: large("short.mp4", LARGE_MEDIA_WARNING_BYTES - 1) },
    })).toBeNull();

    expect(buildMediaUploadPreflight({
      files: {
        trailer: large("trailer.mp4", LARGE_MEDIA_WARNING_BYTES),
        pitchVideo: large("pitch.mp4", LARGE_MEDIA_WARNING_BYTES),
      },
      requestedTypes: ["pitchVideo"],
    }).files.map(({ type }) => type)).toEqual(["pitchVideo"]);
  });

  it("changes the acknowledgement signature when a large file is replaced", () => {
    const first = buildMediaUploadPreflight({
      files: { trailer: large("first.mp4", LARGE_MEDIA_WARNING_BYTES) },
    });
    const replacement = buildMediaUploadPreflight({
      files: { trailer: large("replacement.mp4", LARGE_MEDIA_WARNING_BYTES) },
    });

    expect(replacement.signature).not.toBe(first.signature);
    expect(mediaRecoveryTypes({ failedTypes: ["trailer"], cancelledTypes: ["trailer", "pitchVideo"] }))
      .toEqual(["trailer", "pitchVideo"]);
  });
});

describe("media progress state helpers", () => {
  it("merges partial status updates without losing the last measured percent", () => {
    let state = { trailer: { percent: 87, status: "uploading" } };
    mergeMediaProgress((updater) => { state = updater(state); }, "trailer", { status: "failed" });
    expect(state.trailer).toEqual({ percent: 87, status: "failed" });
  });

  it("clears stale progress when a file is replaced or removed", () => {
    expect(withoutMediaProgress({
      thumbnail: { percent: 100, status: "done" },
      trailer: { percent: 87, status: "failed" },
    }, "trailer")).toEqual({ thumbnail: { percent: 100, status: "done" } });
  });

  it("clears a stale resumed marker when an aborted session starts fresh", () => {
    let state = { trailer: { percent: 60, status: "cancelled", resumed: true } };
    mergeMediaProgress((updater) => { state = updater(state); }, "trailer", {
      percent: 0,
      status: "uploading",
    });
    expect(state.trailer).toEqual({ percent: 0, status: "uploading" });
  });
});
