import { describe, expect, it } from "vitest";
import { resolveProjectReaderSource } from "./projectReaderSource";

describe("resolveProjectReaderSource", () => {
  const uploaded = {
    _id: "p1",
    hasUploadedScriptFile: true,
    scriptPreviewAccess: { start: 2, end: 3 },
    scriptPreviewPageTexts: ["PRIVATE ONE", "PUBLIC TWO", "PUBLIC THREE", "PRIVATE FOUR"],
  };

  it("never hands a preview-only viewer the full PDF URL", () => {
    expect(resolveProjectReaderSource({ script: uploaded, mode: "preview" })).toEqual({
      kind: "preview-pages",
      pages: [
        { pageNumber: 2, text: "PUBLIC TWO" },
        { pageNumber: 3, text: "PUBLIC THREE" },
      ],
      text: "PUBLIC TWO\n\nPUBLIC THREE",
      start: 2,
      end: 3,
    });
  });

  it("uses the authenticated full-PDF proxy only for full access", () => {
    expect(resolveProjectReaderSource({ script: uploaded, mode: "full" })).toMatchObject({
      kind: "pdf",
      pdfUrl: "/api/scripts/p1/pdf",
    });
  });

  it("falls back to the projected excerpt without reaching private body fields", () => {
    const source = resolveProjectReaderSource({
      script: { ...uploaded, scriptPreviewPageTexts: [], previewExcerpt: "PUBLIC EXCERPT", fountainContent: "PRIVATE BODY" },
      mode: "preview",
    });
    expect(source).toMatchObject({ kind: "screenplay", text: "PUBLIC EXCERPT" });
  });
});
