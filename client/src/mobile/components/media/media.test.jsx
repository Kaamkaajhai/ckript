// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoverCropDialog from "./CoverCropDialog";
import MediaSlot, { MediaProgress } from "./MediaSlot";
import PreviewDialog from "./PreviewDialog";

/*
 * The media family, promoted out of `screens/create/` on 2026-08-09 (decision
 * D12) so `/create-project` and `/upload` render the same three surfaces rather
 * than two copies that can drift.
 *
 * These are the tests that belong to the components rather than to either
 * screen: the file input's reachability, the progress bar's honesty, and the
 * cropper's prop contract — the last of which is the whole reason for the
 * promotion, because it used to read `CreateProjectContext` directly and could
 * therefore not be mounted on a route that has no such context.
 */

vi.mock("react-easy-crop", () => ({
  default: (props) => <div data-testid="cropper" data-aspect={props.aspect} />,
}));
vi.mock("../../../components/ScreenplayReadOnly", () => ({
  default: ({ text }) => <div data-testid="screenplay-readonly">{text}</div>,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

const render = (node) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<MemoryRouter><div className="ckm">{node}</div></MemoryRouter>);
  });
};

const accessibleName = (el) => {
  const label = el.getAttribute("aria-label");
  if (label) return label.trim();
  const clone = el.cloneNode(true);
  for (const hidden of clone.querySelectorAll("[aria-hidden='true']")) hidden.remove();
  return clone.textContent.trim();
};

const control = (name) => Array.from(document.querySelectorAll("button, a")).find(
  (el) => accessibleName(el) === name,
);

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

beforeEach(() => { document.body.innerHTML = ""; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("MediaSlot — the empty state", () => {
  it("is a real file input behind a real label, never a click-forwarding div", () => {
    /*
     * MDN is explicit: a file input hidden with `display:none` or
     * `visibility:hidden` is out of reach of assistive technology, while a
     * clipped one stays operable — and the visible target should be its
     * `<label>`. That is what makes the whole card tappable with no JS at all.
     */
    render(<MediaSlot label="Cover image" accept="image/jpeg" hint="Up to 5 MB" />);

    const input = document.querySelector("input[type='file']");
    expect(input.getAttribute("accept")).toBe("image/jpeg");
    expect(document.querySelector(`label[for='${input.id}']`)).toBeTruthy();
    expect(input.className).toBe("ckm-media__input");
  });

  it("offers a second way in without stealing the first", () => {
    const onSelect = vi.fn();
    render(
      <MediaSlot
        label="Cover image"
        secondary={{ label: "Generate a cover", hint: "Reads your script", onSelect }}
      />
    );

    // The picker is still a label; the generator is a button beside it.
    expect(document.querySelector("label.ckm-media__drop")).toBeTruthy();
    const generate = document.querySelector("button.ckm-media__drop--alt");
    expect(generate.textContent).toMatch(/Generate a cover/);
    click(generate);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("MediaSlot — the attached state", () => {
  const file = { name: "cover.jpg", size: 2_411_233 };

  it("shows the asset, not a filename row, because that is the question being answered", () => {
    render(<MediaSlot label="Cover image" file={file} previewUrl="blob:x" previewKind="image" />);

    const image = document.querySelector("img.ckm-media__image");
    expect(image.getAttribute("src")).toBe("blob:x");
    // Decorative: the filename is announced in the row below, and "does this
    // look right" has no text alternative.
    expect(image.getAttribute("alt")).toBe("");
    expect(document.querySelector(".ckm-media__name").textContent).toBe("cover.jpg");
  });

  it("does not fetch a 250 MB trailer just to draw a poster frame", () => {
    render(<MediaSlot label="Trailer" file={file} previewUrl="blob:v" previewKind="video" />);
    const video = document.querySelector("video");

    expect(video.getAttribute("preload")).toBe("metadata");
    expect(video.hasAttribute("autoplay")).toBe(false);
  });

  it("clears the input on change so re-picking the SAME file still fires", () => {
    // The retry case: an upload fails, and the file someone re-picks is the one
    // they just picked.
    const onSelect = vi.fn();
    render(<MediaSlot label="Cover image" onSelect={onSelect} />);
    const input = document.querySelector("input[type='file']");

    act(() => {
      Object.defineProperty(input, "files", { value: [{ name: "a.jpg" }], configurable: true });
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith({ name: "a.jpg" });
    expect(input.value).toBe("");
  });

  it("carries caller actions alongside Replace and Remove", () => {
    const onSelect = vi.fn();
    const onRemove = vi.fn();
    render(
      <MediaSlot
        label="Cover image"
        file={file}
        previewUrl="blob:x"
        actions={[{ id: "adjust", label: "Adjust", onSelect }]}
        onRemove={onRemove}
      />
    );

    click(control("Adjust"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    click(control("Remove"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("MediaProgress", () => {
  it("uses a real <progress>, so the value is announced without an aria of ours", () => {
    render(<MediaProgress label="Trailer video" percent={62} status="uploading" />);
    const bar = document.querySelector("progress");

    expect(bar.value).toBe(62);
    expect(bar.max).toBe(100);
    expect(bar.getAttribute("aria-label")).toBe("Trailer video upload progress");
  });

  it("puts the live region on the TEXT, never on the bar", () => {
    // Announcing every one of a hundred increments is noise; the text changes
    // only on the states that matter.
    render(<MediaProgress label="Trailer" percent={41} status="uploading" />);

    expect(document.querySelector("progress").hasAttribute("aria-live")).toBe(false);
    const value = document.querySelector(".ckm-media__progress-value");
    expect(value.getAttribute("aria-live")).toBe("polite");
    expect(value.textContent).toBe("Uploading 41%");
  });

  it("says failure in words, so colour is never the only channel", () => {
    render(<MediaProgress label="Trailer" percent={41} status="failed" />);
    expect(document.querySelector(".ckm-media__progress-value").textContent).toBe("Upload failed");
    expect(document.querySelector(".ckm-media__progress--failed")).toBeTruthy();
  });

  it("clamps a value the caller got wrong rather than drawing past the end", () => {
    render(<MediaProgress label="Trailer" percent={140} status="uploading" />);
    expect(document.querySelector("progress").value).toBe(100);
  });
});

describe("CoverCropDialog", () => {
  const props = {
    open: true,
    imageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    aspect: 3 / 4,
    crop: { x: 0, y: 0 },
    zoom: 1.42,
    rotation: 12,
  };

  it("is prop-driven, which is the whole point of the promotion (D12)", () => {
    // It used to read CreateProjectContext directly and could therefore not be
    // mounted on a route that has no such context.
    render(<CoverCropDialog {...props} />);
    expect(document.querySelector("[data-testid='cropper']").getAttribute("data-aspect")).toBe("0.75");
  });

  it("stays closed without an image, so the cropper never measures a hidden box", () => {
    // A container that measures zero is how a cropper opens showing a
    // one-pixel image.
    render(<CoverCropDialog {...props} imageUrl="" />);
    expect(document.querySelector("[data-testid='cropper']")).toBeNull();
  });

  it("reads the two slider values aloud, because framing has no other feedback", () => {
    render(<CoverCropDialog {...props} />);
    const values = Array.from(document.querySelectorAll(".ckm-media__crop-value"))
      .map((el) => el.textContent);

    expect(values).toEqual(["1.42×", "12°"]);
  });

  it("uses native range inputs — draggable, arrow-key operable and announced", () => {
    render(<CoverCropDialog {...props} />);
    const ranges = document.querySelectorAll("input[type='range']");

    expect(ranges).toHaveLength(2);
    for (const range of ranges) {
      expect(range.closest("label")).toBeTruthy();
    }
  });

  it("always offers Cancel, which keeps the original file", () => {
    const onCancel = vi.fn();
    render(<CoverCropDialog {...props} applying onCancel={onCancel} />);

    // Cancel is present even mid-apply; it is the escape from a visual task a
    // non-sighted user cannot complete.
    expect(control("Cancel")).toBeTruthy();
  });
});

describe("PreviewDialog", () => {
  it("numbers the pages honestly when the window does not start at page 1", () => {
    render(<PreviewDialog open pages={["ONE", "TWO"]} firstPageNumber={4} />);
    const list = document.querySelector("ol.ckm-media__pages");

    expect(list.getAttribute("start")).toBe("4");
    expect(Array.from(list.querySelectorAll(".ckm-media__page-number")).map((el) => el.textContent))
      .toEqual(["Page 4", "Page 5"]);
  });

  it("renders the SAME read-only view every other surface uses", () => {
    // What the writer checks here is byte-for-byte what a buyer is shown.
    render(<PreviewDialog open pages={["PAGE ONE"]} firstPageNumber={1} />);
    expect(document.querySelector("[data-testid='screenplay-readonly']").textContent).toBe("PAGE ONE");
  });

  it("describes the range in the dialog's own description, singular and plural", () => {
    render(<PreviewDialog open pages={["ONE"]} firstPageNumber={3} />);
    expect(document.body.textContent).toMatch(/Page 3, exactly as a buyer sees it/);

    act(() => root.unmount());
    document.body.innerHTML = "";

    render(<PreviewDialog open pages={["ONE", "TWO", "THREE"]} firstPageNumber={3} />);
    expect(document.body.textContent).toMatch(/Pages 3–5, exactly as a buyer sees them/);
  });

  it("mounts nothing at all while closed", () => {
    // Summoned, not embedded: each page is a real CodeMirror instance.
    render(<PreviewDialog open={false} pages={["ONE"]} firstPageNumber={1} />);
    expect(document.querySelector("[data-testid='screenplay-readonly']")).toBeNull();
  });
});
