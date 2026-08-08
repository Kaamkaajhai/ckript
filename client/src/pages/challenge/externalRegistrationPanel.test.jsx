// @vitest-environment happy-dom
//
// The panel carries its own <form>, and HTML forbids nesting one form inside another. It was first
// shipped INSIDE CompetitionRegister's form, and the result was not a warning — it was a dead
// feature: the browser closes the outer form at the inner tag, so the submit event never reached
// React, neither handler ran, the browser performed a native GET, and the page reloaded with every
// field blank and the ?c=<slug> parameter gone. The claim was never sent, and nothing on screen said
// so.
//
// That is invisible in review and invisible in a unit test of the panel alone, because the panel is
// perfectly correct in isolation — the defect lives in where it is MOUNTED. So this file asserts the
// mounting, and asserts the property (no nested forms) against a real DOM.
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRoot } from "react-dom/client";
import { act } from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// fileURLToPath, not url.pathname: this repository lives under "study material", and the raw
// pathname keeps the space percent-encoded, which fs cannot open.
const here = path.dirname(fileURLToPath(import.meta.url));
const registerSource = fs.readFileSync(path.join(here, "CompetitionRegister.jsx"), "utf8");
const panelSource = fs.readFileSync(path.join(here, "ExternalRegistrationPanel.jsx"), "utf8");

describe("the panel is mounted outside the registration form", () => {
  it("renders after the form closes, not inside it", () => {
    const formClose = registerSource.indexOf("</form>");
    const panelMount = registerSource.indexOf("<ExternalRegistrationPanel");
    expect(formClose, "CompetitionRegister has no </form>").toBeGreaterThan(-1);
    expect(panelMount, "the panel is not mounted at all").toBeGreaterThan(-1);
    expect(
      panelMount,
      "the panel is inside the registration form — its submit will never reach React, the browser "
      + "will do a native GET, and the claim will silently never be sent",
    ).toBeGreaterThan(formClose);
  });

  it("still owns a form of its own, so Enter submits and the button has a type", () => {
    // The alternative fix — turning the panel's form into a div — would have cost implicit
    // submission. Mounting it as a sibling keeps both.
    expect(panelSource).toMatch(/<form onSubmit=\{submit\}/);
  });
});

describe("nested forms break submission in this DOM", () => {
  // Pinning the browser behaviour the fix depends on, so the assertion above is not folklore.
  let host;
  let root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("an inner form's submit also runs the outer form's handler", () => {
    // Measured, not assumed. React builds the tree with createElement rather than the HTML parser, so
    // the illegal nesting really exists at runtime and the submit event bubbles: both handlers fire,
    // inner first. On the page that meant "Send for verification" also ran handleSubmit and opened
    // the "Pay in INR (₹98)" dialog — a checkout handed to the one person who just told us they had
    // already paid.
    //
    // The exact damage varies by engine (a parser-built tree can instead swallow the event entirely
    // and navigate), but every version of it is broken and every version has the same fix: do not
    // nest the forms.
    const seen = [];
    act(() => root.render(
      <form onSubmit={(e) => { e.preventDefault(); seen.push("outer"); }}>
        <form onSubmit={(e) => { e.preventDefault(); seen.push("inner"); }}>
          <button type="submit">go</button>
        </form>
      </form>,
    ));

    act(() => { host.querySelector("button").click(); });
    expect(seen, "nested forms no longer leak the submit — re-check the mounting rule above")
      .toEqual(["inner", "outer"]);
  });

  it("the shipped structure produces exactly one form per region", () => {
    // Siblings, as the page now renders them: both handlers work, neither swallows the other.
    const seen = [];
    act(() => root.render(
      <div>
        <form onSubmit={(e) => { e.preventDefault(); seen.push("register"); }}>
          <button type="submit">pay</button>
        </form>
        <form onSubmit={(e) => { e.preventDefault(); seen.push("claim"); }}>
          <button type="submit">send</button>
        </form>
      </div>,
    ));

    expect(host.querySelectorAll("form").length).toBe(2);
    const [pay, send] = host.querySelectorAll("button");
    act(() => { send.click(); });
    expect(seen).toEqual(["claim"]);
    act(() => { pay.click(); });
    expect(seen).toEqual(["claim", "register"]);
  });
});
