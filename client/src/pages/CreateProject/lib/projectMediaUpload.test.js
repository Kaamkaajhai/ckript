import { describe, expect, it, vi } from "vitest";
import {
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

    const failed = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {
        thumbnail: file("cover.jpg", "image/jpeg"),
        trailer: file("trailer.mp4", "video/mp4"),
      },
      onProgress: (type, next) => updates.push([type, next]),
    });

    expect(failed).toEqual([]);
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

    const failed = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {
        thumbnail: file("cover.jpg", "image/jpeg"),
        trailer: file("trailer.mp4", "video/mp4"),
      },
      onProgress: (type, next) => updates.push([type, next]),
    });

    expect(failed).toEqual(["trailer"]);
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
    const failed = await uploadProjectMedia({
      apiClient,
      targetScriptId: "script-7",
      files: {},
      requestedTypes: ["trailer"],
    });

    expect(failed).toEqual([]);
    expect(apiClient.post).not.toHaveBeenCalled();
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
