// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import TagSelect from "./TagSelect";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const render = (props) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<TagSelect {...props} />));
  return container;
};

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const tags = () => [...container.querySelectorAll('button[aria-pressed]')];
const byLabel = (label) => tags().find((b) => b.textContent.replace(/×/g, "").trim() === label);
const click = (el) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

describe("TagSelect", () => {
  const GENRES = ["Drama", "Comedy", "Thriller"];

  it("renders every option as a tag, so the whole vocabulary is visible", () => {
    render({ options: GENRES, value: "", onChange: () => {} });
    expect(tags()).toHaveLength(3);
    expect(container.querySelectorAll("select")).toHaveLength(0);
  });

  it("marks the selected tag via aria-pressed (keyboard/screen-reader legible)", () => {
    render({ options: GENRES, value: "Comedy", onChange: () => {} });
    expect(byLabel("Comedy").getAttribute("aria-pressed")).toBe("true");
    expect(byLabel("Drama").getAttribute("aria-pressed")).toBe("false");
  });

  it("single-select reports the tapped value", () => {
    let got;
    render({ options: GENRES, value: "", onChange: (v) => { got = v; } });
    click(byLabel("Thriller"));
    expect(got).toBe("Thriller");
  });

  it("single-select does NOT clear on re-tap by default (required fields stay filled)", () => {
    let got = "untouched";
    render({ options: GENRES, value: "Drama", onChange: (v) => { got = v; } });
    click(byLabel("Drama"));
    expect(got).toBe("Drama");
  });

  it("clears on re-tap only when allowClear is set", () => {
    let got = "untouched";
    render({ options: GENRES, value: "Drama", onChange: (v) => { got = v; }, allowClear: true });
    click(byLabel("Drama"));
    expect(got).toBe("");
  });

  it("multi-select adds and removes", () => {
    let got;
    render({ options: GENRES, value: ["Drama"], onChange: (v) => { got = v; }, multiple: true });
    click(byLabel("Comedy"));
    expect(got).toEqual(["Drama", "Comedy"]);

    render({ options: GENRES, value: ["Drama", "Comedy"], onChange: (v) => { got = v; }, multiple: true });
    click(byLabel("Drama"));
    expect(got).toEqual(["Comedy"]);
  });

  it("disables unpicked tags at the cap, but keeps picked ones removable", () => {
    let got = "untouched";
    render({ options: ["a", "b", "c", "d"], value: ["a", "b", "c"], onChange: (v) => { got = v; }, multiple: true, max: 3 });

    const blocked = byLabel("d");
    expect(blocked.disabled).toBe(true);
    click(blocked);
    expect(got).toBe("untouched");

    // Already-selected tags must stay interactive or the user could never get back under the cap.
    expect(byLabel("a").disabled).toBe(false);
    click(byLabel("a"));
    expect(got).toEqual(["b", "c"]);
  });

  it("accepts {value,label} options and reports the value, not the label", () => {
    let got;
    render({
      options: [{ value: "feature_film", label: "Feature Film" }, { value: "short", label: "Short" }],
      value: "",
      onChange: (v) => { got = v; },
    });
    expect(byLabel("Feature Film")).toBeTruthy();
    click(byLabel("Feature Film"));
    expect(got).toBe("feature_film");
  });

  it("ignores every tap when disabled", () => {
    let got = "untouched";
    render({ options: GENRES, value: "", onChange: (v) => { got = v; }, disabled: true });
    click(byLabel("Drama"));
    expect(got).toBe("untouched");
  });
});
