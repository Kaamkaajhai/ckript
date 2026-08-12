import { describe, expect, it } from "vitest";
import {
  UPLOAD_SOURCE_LOAD_STATUS,
  classifyUploadSourceLoadError,
  getUploadSource,
  initialUploadSourceLoad,
  uploadSourceCopy,
  uploadSourceNeedsGate,
} from "./uploadSourceLoad";

describe("upload source load model (DEF-8)", () => {
  it("gives edit precedence when both legacy query forms are present", () => {
    expect(getUploadSource({ draftId: "draft-1", editId: "edit-1" }))
      .toEqual({ kind: "edit", id: "edit-1" });
    expect(initialUploadSourceLoad({ draftId: "draft-1" }).status).toBe("loading");
    expect(initialUploadSourceLoad({}).status).toBe("ready");
  });

  it("separates not-found and forbidden responses from retryable failures", () => {
    expect(classifyUploadSourceLoadError({ response: { status: 404 } }).status)
      .toBe(UPLOAD_SOURCE_LOAD_STATUS.NOT_FOUND);
    expect(classifyUploadSourceLoadError({ response: { status: 403 } }).status)
      .toBe(UPLOAD_SOURCE_LOAD_STATUS.FORBIDDEN);
    expect(classifyUploadSourceLoadError({ response: { status: 503 } }).status)
      .toBe(UPLOAD_SOURCE_LOAD_STATUS.FAILED);
  });

  it("calls a response-less failure offline only when the browser says so", () => {
    expect(classifyUploadSourceLoadError(new Error("network"), { online: false }).offline).toBe(true);
    expect(classifyUploadSourceLoadError(new Error("network"), { online: true }).offline).toBe(false);
    expect(classifyUploadSourceLoadError({ response: { status: 503 } }, { online: false }).offline).toBe(false);
  });

  it("never offers local recovery for a hard access or existence failure", () => {
    for (const status of [403, 404]) {
      const state = classifyUploadSourceLoadError(
        { response: { status } },
        { hasLocalRecovery: true },
      );
      expect(state.hasLocalRecovery).toBe(false);
      expect(uploadSourceCopy(state).retryable).toBe(false);
    }
  });

  it("keeps every source state except a confirmed server copy behind the write gate", () => {
    for (const status of ["loading", "failed", "not-found", "forbidden", "local-only"]) {
      expect(uploadSourceNeedsGate({ kind: "edit", status })).toBe(true);
    }
    expect(uploadSourceNeedsGate({ kind: "edit", status: "ready" })).toBe(false);
    expect(uploadSourceNeedsGate({ kind: null, status: "ready" })).toBe(false);
  });
});
