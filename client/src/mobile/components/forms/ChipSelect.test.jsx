// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChipSelect from "./ChipSelect";

/*
 * ChipSelect is the mobile counterpart of `components/TagSelect`, and it is the
 * control four create-project steps lean on for genre, tone, theme, setting,
 * format, rights and payment terms. What is worth pinning is the behaviour a
 * hand-rolled pill row gets wrong: the selection has to be in the accessibility
 * tree, the cap has to refuse *and say so*, and a required field must not lose
 * its value to a stray second tap.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

const render = (props) => {
  const container = document.createElement("div");
  container.className = "ckm";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ChipSelect label="Tones" {...props} />));
};

const chips = () => Array.from(document.querySelectorAll(".ckm-chip__main"));
const chip = (text) => chips().find((el) => el.textContent.trim().endsWith(text));
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

beforeEach(() => { document.body.innerHTML = ""; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

describe("ChipSelect — semantics", () => {
  it("names the group by its label rather than leaving loose buttons", () => {
    render({ options: ["Dark", "Quirky"], value: "" });
    const group = document.querySelector(".ckm-chip-row");

    const labelId = group.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId).textContent).toContain("Tones");
  });

  it("carries selection as aria-pressed, not as a class", () => {
    // A pill that only *looks* selected leaves a screen-reader user with no way
    // to know what is chosen.
    render({ options: ["Dark", "Quirky"], value: "Dark" });

    expect(chip("Dark").getAttribute("aria-pressed")).toBe("true");
    expect(chip("Quirky").getAttribute("aria-pressed")).toBe("false");
  });

  it("uses a span for the group label, because `for` may only point at a control", () => {
    render({ options: ["Dark"], value: "" });
    expect(document.querySelector(".ckm-field__label").tagName).toBe("SPAN");
  });

  it("wires hint and error into the group's description", () => {
    render({ options: ["Dark"], value: "", error: "Pick at least one." });
    const group = document.querySelector(".ckm-chip-row");
    const described = document.getElementById(group.getAttribute("aria-describedby"));

    expect(described.textContent).toContain("Pick at least one.");
    expect(described.getAttribute("role")).toBe("alert");
  });

  it("replaces the hint with the error rather than stacking both", () => {
    render({ options: ["Dark"], value: "", hint: "Up to three.", error: "Pick at least one." });

    expect(document.body.textContent).toContain("Pick at least one.");
    expect(document.body.textContent).not.toContain("Up to three.");
  });
});

describe("ChipSelect — single select", () => {
  it("reports the tapped value", () => {
    const onChange = vi.fn();
    render({ options: ["Dark", "Quirky"], value: "Dark", onChange });

    click(chip("Quirky"));

    expect(onChange).toHaveBeenCalledWith("Quirky");
  });

  it("ignores a second tap on the chosen chip when clearing is not a real answer", () => {
    // Genre is required. A chip that silently deselects is how a writer loses a
    // value they believe they set — and then meets a refusal with no clue why.
    const onChange = vi.fn();
    render({ options: ["Dark", "Quirky"], value: "Dark", onChange });

    click(chip("Dark"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears on a second tap where the field says clearing is allowed", () => {
    const onChange = vi.fn();
    render({ options: ["Dark"], value: "Dark", allowClear: true, onChange });

    click(chip("Dark"));

    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("ChipSelect — multi select and the cap", () => {
  it("adds and removes without the caller reimplementing either", () => {
    const onChange = vi.fn();
    render({ options: ["Dark", "Quirky", "Gritty"], value: ["Dark"], multiple: true, onChange });

    click(chip("Quirky"));
    expect(onChange).toHaveBeenLastCalledWith(["Dark", "Quirky"]);

    click(chip("Dark"));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("shows how much of the cap is used, and announces the change politely", () => {
    render({ options: ["A", "B", "C", "D"], value: ["A", "B"], multiple: true, max: 3 });
    const counter = Array.from(document.querySelectorAll(".ckm-field__flag"))
      .find((el) => el.textContent.includes("/"));

    expect(counter.textContent).toBe("2/3");
    expect(counter.getAttribute("aria-live")).toBe("polite");
  });

  it("disables the unchosen chips at the cap instead of leaving them unresponsive", () => {
    // A chip that looks tappable and does nothing reads as a broken app, and
    // `disabled` is what tells a screen reader the same thing the greying does.
    const onChange = vi.fn();
    render({ options: ["A", "B", "C", "D"], value: ["A", "B", "C"], multiple: true, max: 3, onChange });

    expect(chip("D").disabled).toBe(true);
    click(chip("D"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still lets a chosen chip be removed at the cap, or the cap becomes a trap", () => {
    const onChange = vi.fn();
    render({ options: ["A", "B", "C"], value: ["A", "B", "C"], multiple: true, max: 3, onChange });

    expect(chip("A").disabled).toBe(false);
    click(chip("A"));
    expect(onChange).toHaveBeenLastCalledWith(["B", "C"]);
  });

  it("treats a missing multi value as empty rather than throwing", () => {
    const onChange = vi.fn();
    render({ options: ["A"], multiple: true, onChange });

    click(chip("A"));
    expect(onChange).toHaveBeenCalledWith(["A"]);
  });

  it("accepts {value,label} options and reports the value, not the label", () => {
    const onChange = vi.fn();
    render({ options: [{ value: "one_time_upfront_payment", label: "One-time upfront" }], value: "", onChange });

    click(chip("One-time upfront"));

    expect(onChange).toHaveBeenCalledWith("one_time_upfront_payment");
  });
});
