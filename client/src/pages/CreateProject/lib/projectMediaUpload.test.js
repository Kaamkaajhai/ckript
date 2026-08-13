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

describe("uploadProjectMedia", () => {
  it("reports real byte progress and completion for each selected file", async () => {
    const updates = [];
    const apiClient = {
      post: vi.fn((url, body, config) => {
        expect(body).toBeInstanceOf(FormData);
        config.onUploadProgress({ loaded: url.includes("trailer") ? 25 : 3, total: url.includes("trailer") ? 100 : 4 });
        return Promise.resolve({ data: { ok: true } });
      }),
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

    expect(result).toEqual({ failedTypes: [], cancelledTypes: [] });
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(updates).toContainEqual(["thumbnail", { percent: 75, status: "uploading" }]);
    expect(updates).toContainEqual(["trailer", { percent: 25, status: "uploading" }]);
    expect(updates).toContainEqual(["thumbnail", { percent: 100, status: "done" }]);
    expect(updates).toContainEqual(["trailer", { percent: 100, status: "done" }]);
  });

  it("marks failures per file while allowing the other uploads to finish", async () => {
    const updates = [];
    const apiClient = {
      post: vi.fn((url) => url.includes("trailer")
        ? Promise.reject(new Error("connection lost"))
        : Promise.resolve({ data: { ok: true } })),
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
    expect(updates).toContainEqual(["trailer", { status: "failed" }]);
  });

  it("retries only requested files and resets their progress to zero first", async () => {
    const updates = [];
    const apiClient = { post: vi.fn(() => Promise.resolve({ data: { ok: true } })) };

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

    expect(apiClient.post).toHaveBeenCalledOnce();
    expect(apiClient.post.mock.calls[0][0]).toContain("upload-trailer");
    expect(updates[0]).toEqual(["trailer", { percent: 0, status: "uploading" }]);
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
      post: vi.fn((_url, _body, config) => new Promise((_resolve, reject) => {
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
  });

  it("keeps a genuine rejection in failedTypes when a supplied signal is still live", async () => {
    const controller = new AbortController();
    const apiClient = { post: vi.fn(() => Promise.reject(new Error("connection lost"))) };

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
});
