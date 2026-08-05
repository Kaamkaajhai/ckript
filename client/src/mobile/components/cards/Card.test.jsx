// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Card, { CardActions, CardBody, CardFooter, CardMedia, CardTitle } from "./Card";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return container;
}

describe("Card", () => {
  it("gives the whole card one link, named by the title alone", () => {
    const el = render(
      <Card>
        <CardMedia />
        <CardBody>
          <CardTitle to="/project/1">The Last Scene</CardTitle>
        </CardBody>
        <CardFooter>
          <span>₹2,400 · 18 reads</span>
        </CardFooter>
      </Card>,
    );

    const links = el.querySelectorAll("a");
    expect(links.length).toBe(1);
    // A block link would read as "The Last Scene ₹2,400 18 reads, link".
    expect(links[0].textContent).toBe("The Last Scene");
    expect(links[0].closest("h3")).toBeTruthy();
  });

  it("keeps a second action out of the card link", () => {
    const el = render(
      <Card>
        <CardBody>
          <CardTitle to="/project/1">The Last Scene</CardTitle>
        </CardBody>
        <CardFooter>
          <CardActions>
            <button type="button">Save</button>
          </CardActions>
        </CardFooter>
      </Card>,
    );

    expect(el.querySelector("a").querySelector("button")).toBeNull();
    expect(el.querySelector(".ckm-card__actions button")).toBeTruthy();
  });

  it("titles a card with a heading so it can be navigated to", () => {
    const el = render(<Card><CardBody><CardTitle>Untitled draft</CardTitle></CardBody></Card>);

    expect(el.querySelector("h3").textContent).toBe("Untitled draft");
    expect(el.querySelector("a")).toBeNull();
  });

  it("promotes the heading level when the card is the section", () => {
    const el = render(<Card><CardBody><CardTitle as="h2">Challenge</CardTitle></CardBody></Card>);
    expect(el.querySelector("h2")).toBeTruthy();
  });

  it("treats a cover image as decoration and reserves its box before it loads", () => {
    const el = render(<Card><CardMedia src="/cover.jpg" ratio="4 / 3" /></Card>);
    const img = el.querySelector("img");

    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(el.querySelector(".ckm-card__media").style.aspectRatio).toBe("4 / 3");
  });

  it("falls back to a placeholder rather than a broken image", () => {
    const el = render(<Card><CardMedia /></Card>);

    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector(".ckm-card__placeholder")).toBeTruthy();
  });
});
