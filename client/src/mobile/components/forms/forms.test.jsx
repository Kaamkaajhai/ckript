// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import TextField from "./TextField";
import TextArea from "./TextArea";
import SelectField from "./SelectField";
import Checkbox from "./Checkbox";
import RadioGroup from "./RadioGroup";
import Switch from "./Switch";
import FilePicker from "./FilePicker";
import { formatFileSize } from "./formatFileSize";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.restoreAllMocks();
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
  return container;
}

/** The label must point at the control, or tapping it does nothing. */
function labelTarget(el) {
  const label = el.querySelector("label");
  return el.querySelector(`#${CSS.escape(label.getAttribute("for"))}`);
}

/** What a screen reader would read as the control's description. */
function describedText(el, control) {
  const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  return ids.map((id) => el.querySelector(`#${CSS.escape(id)}`)?.textContent.trim()).join(" | ");
}

describe("TextField", () => {
  it("binds its label to the control", () => {
    const el = render(<TextField label="Screenplay title" />);
    expect(labelTarget(el)).toBe(el.querySelector("input"));
  });

  it("asks for the right keyboard, validation and autofill together", () => {
    const el = render(<TextField label="Email" purpose="email" />);
    const input = el.querySelector("input");

    expect(input.type).toBe("email");
    expect(input.getAttribute("inputmode")).toBe("email");
    expect(input.getAttribute("autocomplete")).toBe("email");
  });

  it("uses a numeric keyboard without type=number for plain numbers", () => {
    const el = render(<TextField label="Pages" purpose="number" />);
    const input = el.querySelector("input");

    expect(input.getAttribute("inputmode")).toBe("numeric");
    // type=number drops leading zeros and gives a phone a spinner nobody wants.
    expect(input.type).toBe("text");
  });

  it("announces the error and marks the control invalid", () => {
    const el = render(<TextField label="Email" purpose="email" error="Enter a valid email address." />);
    const input = el.querySelector("input");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(describedText(el, input)).toContain("Enter a valid email address.");
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("replaces the hint with the error rather than stacking both", () => {
    const el = render(<TextField label="Email" hint="We never share this." error="Required." />);

    expect(el.textContent).toContain("Required.");
    expect(el.textContent).not.toContain("We never share this.");
  });

  it("describes the control with its hint when valid", () => {
    const el = render(<TextField label="Email" hint="We never share this." />);
    expect(describedText(el, el.querySelector("input"))).toBe("We never share this.");
  });

  it("marks a required field in words, not only a symbol", () => {
    const el = render(<TextField label="Title" required />);

    expect(el.querySelector("input").required).toBe(true);
    expect(el.textContent).toContain("Required");
  });
});

describe("TextArea", () => {
  it("binds its label and counts against the limit", () => {
    const el = render(<TextArea label="Logline" maxLength={120} value="A writer meets a producer." readOnly />);

    expect(labelTarget(el)).toBe(el.querySelector("textarea"));
    expect(el.textContent).toContain("26 / 120");
  });

  it("announces the count politely so it does not interrupt typing", () => {
    const el = render(<TextArea label="Logline" maxLength={120} value="abc" readOnly />);
    expect(el.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("keeps the count beside the hint rather than above it", () => {
    const el = render(<TextArea label="Logline" hint="One sentence." maxLength={120} value="abc" readOnly />);
    const foot = el.querySelector(".ckm-field__foot");

    expect(foot.querySelector(".ckm-field__hint").textContent).toBe("One sentence.");
    expect(foot.querySelector(".ckm-field__meta").textContent).toBe("3 / 120");
  });

  it("keeps the count visible while an error is showing", () => {
    const el = render(<TextArea label="Logline" error="Too short." maxLength={120} value="abc" readOnly />);

    expect(el.querySelector(".ckm-field__error")).toBeTruthy();
    expect(el.querySelector(".ckm-field__meta").textContent).toBe("3 / 120");
  });
});

describe("SelectField", () => {
  it("renders options and binds its label", () => {
    const el = render(<SelectField label="Genre" options={["Drama", "Thriller"]} placeholder="Choose a genre" />);

    expect(labelTarget(el)).toBe(el.querySelector("select"));
    expect([...el.querySelectorAll("option")].map((o) => o.textContent))
      .toEqual(["Choose a genre", "Drama", "Thriller"]);
    // The placeholder must not be selectable as a real answer.
    expect(el.querySelector("option").disabled).toBe(true);
  });

  it("starts on the placeholder so an untouched select is not a real answer", () => {
    const el = render(<SelectField label="Genre" options={["Drama", "Thriller"]} placeholder="Choose a genre" />);
    // Without an explicit default the browser picks the first enabled option,
    // and the form silently submits "Drama" for a question nobody answered.
    expect(el.querySelector("select").value).toBe("");
  });

  it("never overrides a value the caller is driving", () => {
    const el = render(
      <SelectField
        label="Genre"
        options={["Drama", "Thriller"]}
        placeholder="Choose a genre"
        value="Thriller"
        onChange={() => {}}
      />,
    );
    expect(el.querySelector("select").value).toBe("Thriller");
  });

  it("accepts value/label pairs", () => {
    const el = render(<SelectField label="Genre" options={[{ value: "dr", label: "Drama" }]} />);
    const option = el.querySelector("option");

    expect(option.value).toBe("dr");
    expect(option.textContent).toBe("Drama");
  });
});

describe("Checkbox", () => {
  it("keeps a real checkbox that the label toggles", () => {
    const el = render(<Checkbox label="I accept the upload terms" />);
    const input = el.querySelector("input");

    expect(input.type).toBe("checkbox");
    expect(labelTarget(el)).toBe(input);
  });

  it("describes itself with its supporting text and its error", () => {
    const el = render(
      <Checkbox label="I accept" description="Read the terms first." error="You must accept to continue." />,
    );
    const input = el.querySelector("input");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = describedText(el, input);
    expect(described).toContain("You must accept to continue.");
    expect(described).toContain("Read the terms first.");
  });

  it("toggles through the label", () => {
    const onChange = vi.fn();
    const el = render(<Checkbox label="Notify me" onChange={onChange} />);

    act(() => { el.querySelector("input").click(); });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("RadioGroup", () => {
  const OPTIONS = [
    { value: "film", label: "Feature film" },
    { value: "series", label: "Series" },
  ];

  it("groups its options under one question", () => {
    const el = render(<RadioGroup label="Format" options={OPTIONS} />);

    expect(el.querySelector("fieldset")).toBeTruthy();
    expect(el.querySelector("legend").textContent).toContain("Format");
    expect(el.querySelectorAll('input[type="radio"]').length).toBe(2);
  });

  it("puts every option in the same radio group", () => {
    const el = render(<RadioGroup label="Format" name="format" options={OPTIONS} />);
    const names = [...el.querySelectorAll("input")].map((i) => i.name);

    expect(new Set(names).size).toBe(1);
    expect(names[0]).toBe("format");
  });

  it("attaches the error to the group, not to one option", () => {
    const el = render(<RadioGroup label="Format" options={OPTIONS} error="Choose a format." />);
    const fieldset = el.querySelector("fieldset");

    expect(fieldset.getAttribute("aria-invalid")).toBe("true");
    expect(describedText(el, fieldset)).toContain("Choose a format.");
    expect(el.querySelector('input[aria-invalid]')).toBeNull();
  });

  it("reflects the selected value", () => {
    const el = render(<RadioGroup label="Format" options={OPTIONS} value="series" onChange={() => {}} />);
    const [film, series] = el.querySelectorAll("input");

    expect(film.checked).toBe(false);
    expect(series.checked).toBe(true);
  });
});

describe("Switch", () => {
  it("announces as a switch rather than a checkbox", () => {
    const el = render(<Switch label="Email notifications" checked />);
    const control = el.querySelector('[role="switch"]');

    expect(control.getAttribute("aria-checked")).toBe("true");
    expect(control.tagName).toBe("BUTTON");
    expect(control.type).toBe("button");
  });

  it("takes its name from the visible label", () => {
    const el = render(<Switch label="Email notifications" description="Weekly digest" />);
    const control = el.querySelector('[role="switch"]');
    const labelledBy = control.getAttribute("aria-labelledby");

    expect(el.querySelector(`#${CSS.escape(labelledBy)}`).textContent).toBe("Email notifications");
    expect(describedText(el, control)).toBe("Weekly digest");
  });

  it("reports the value it is moving to", () => {
    const onChange = vi.fn();
    const el = render(<Switch label="Email notifications" checked={false} onChange={onChange} />);

    act(() => { el.querySelector('[role="switch"]').click(); });

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("FilePicker", () => {
  const file = { name: "final-draft.pdf", size: 2_411_724 };

  it("opens the native picker through its own label", () => {
    const el = render(<FilePicker label="Screenplay" buttonLabel="Choose a PDF" />);
    const input = el.querySelector('input[type="file"]');

    expect(labelTarget(el)).toBe(input);
    expect(el.textContent).toContain("Choose a PDF");
  });

  it("passes accept and capture through, since they decide what the phone offers", () => {
    const el = render(<FilePicker label="Poster" accept="image/*" capture="environment" multiple />);
    const input = el.querySelector('input[type="file"]');

    expect(input.getAttribute("accept")).toBe("image/*");
    expect(input.getAttribute("capture")).toBe("environment");
    expect(input.multiple).toBe(true);
  });

  it("lists a chosen file with a removal control named after it", () => {
    const el = render(<FilePicker label="Screenplay" files={[file]} onRemove={() => {}} />);

    expect(el.textContent).toContain("final-draft.pdf");
    expect(el.textContent).toContain("2.3 MB");
    expect(el.querySelector('[aria-label="Remove final-draft.pdf"]')).toBeTruthy();
  });

  it("clears the input when a file is removed so the same file can be picked again", () => {
    const onRemove = vi.fn();
    const el = render(<FilePicker label="Screenplay" files={[file]} onRemove={onRemove} />);

    act(() => { el.querySelector('[aria-label="Remove final-draft.pdf"]').click(); });

    expect(onRemove).toHaveBeenCalledWith(file, 0);
    expect(el.querySelector('input[type="file"]').value).toBe("");
  });

  it("stops requiring a file once one is chosen", () => {
    const empty = render(<FilePicker label="Screenplay" required />);
    expect(empty.querySelector('input[type="file"]').required).toBe(true);

    act(() => root.unmount());
    container.remove();
    root = null;
    container = null;

    const filled = render(<FilePicker label="Screenplay" required files={[file]} />);
    expect(filled.querySelector('input[type="file"]').required).toBe(false);
  });

  it("formats sizes at a glance", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5_242_880)).toBe("5.0 MB");
  });
});
