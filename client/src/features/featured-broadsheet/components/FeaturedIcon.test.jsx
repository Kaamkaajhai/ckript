// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import FeaturedIcon from "./FeaturedIcon";

const ICON_NAMES = [
  "arrowForward",
  "checkCircle",
  "chevronDown",
  "chevronLeft",
  "chevronRight",
  "close",
  "emptyProjects",
  "error",
  "favorite",
  "filterOff",
  "flag",
  "info",
  "play",
  "promote",
  "search",
  "spotlight",
  "swap",
  "tune",
  "verified",
];

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("FeaturedIcon", () => {
  it("renders every featured-page icon as an inline SVG", async () => {
    await act(async () => {
      root.render(<>{ICON_NAMES.map((name) => <FeaturedIcon key={name} name={name} />)}</>);
    });

    const icons = Array.from(container.querySelectorAll(".fbp-icon"));
    expect(icons).toHaveLength(ICON_NAMES.length);
    expect(icons.every((icon) => icon.tagName.toLowerCase() === "svg")).toBe(true);
    expect(container.textContent).toBe("");
  });

  it("fills the saved-state heart without changing its SVG contract", async () => {
    await act(async () => root.render(<FeaturedIcon name="favorite" fill />));
    expect(container.querySelector("svg").getAttribute("fill")).toBe("currentColor");
  });
});
