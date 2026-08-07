// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import List from "./List";
import ListRow from "./ListRow";
import LoadMore from "./LoadMore";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

function render(ui) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return container;
}

function update(ui) {
  act(() => root.render(<MemoryRouter>{ui}</MemoryRouter>));
  return container;
}

describe("List", () => {
  it("is a real list, so its length is announced", () => {
    const el = render(
      <List label="Scripts">
        <ListRow title="One" />
        <ListRow title="Two" />
      </List>,
    );

    expect(el.querySelector("ul")).toBeTruthy();
    expect(el.querySelectorAll("ul > li").length).toBe(2);
  });

  it("names itself from a visible heading rather than duplicating the text", () => {
    const el = render(<List heading="Recent activity"><ListRow title="One" /></List>);
    const list = el.querySelector("ul");

    expect(el.querySelector("h2").textContent).toBe("Recent activity");
    expect(list.getAttribute("aria-labelledby")).toBe(el.querySelector("h2").id);
    expect(list.getAttribute("aria-label")).toBeNull();
  });

  it("keeps a standalone row out of an orphan <li>", () => {
    const el = render(<ListRow title="One" />);
    expect(el.querySelector("li")).toBeNull();
  });
});

describe("ListRow", () => {
  it("renders a navigating row as a link, not a button with a handler", () => {
    const el = render(<List><ListRow title="Payouts" to="/payouts" /></List>);
    const main = el.querySelector(".ckm-row__main");

    expect(main.tagName).toBe("A");
    expect(main.getAttribute("href")).toBe("/payouts");
  });

  it("keeps the row's own control outside the row's link", () => {
    const el = render(
      <List>
        <ListRow title="Email notifications" to="/settings" action={<button type="button">Toggle</button>} />
      </List>,
    );

    const link = el.querySelector("a.ckm-row__main");
    // Nesting a control inside a link is invalid and would swallow its name.
    expect(link.querySelector("button")).toBeNull();
    expect(el.querySelector(".ckm-row__action button")).toBeTruthy();
  });

  it("names the link from the row text alone", () => {
    const el = render(
      <List>
        <ListRow leading="description" title="The Last Scene" subtitle="Draft · 118 pages" to="/p/1" />
      </List>,
    );

    const link = el.querySelector("a.ckm-row__main");
    expect(link.textContent).toContain("The Last Scene");
    expect(link.textContent).toContain("Draft");
    // The leading glyph is decoration and must not join the name.
    expect(link.querySelector(".ckm-row__leading").getAttribute("aria-hidden")).toBe("true");
  });

  it("marks a current navigation row as the current page", () => {
    const el = render(<List><ListRow title="Payouts" to="/payouts" current /></List>);
    expect(el.querySelector(".ckm-row__main").getAttribute("aria-current")).toBe("page");
  });

  it("disables a row properly instead of only fading it", () => {
    const onClick = vi.fn();
    const el = render(<List><ListRow title="Archived" onClick={onClick} disabled /></List>);
    const main = el.querySelector(".ckm-row__main");

    expect(main.tagName).toBe("BUTTON");
    expect(main.disabled).toBe(true);
    act(() => { main.click(); });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays a plain element when it does nothing", () => {
    const el = render(<List><ListRow title="App version" trailing="2.14.0" /></List>);
    const main = el.querySelector(".ckm-row__main");

    expect(main.tagName).toBe("SPAN");
    expect(el.querySelector(".ckm-row").classList.contains("is-interactive")).toBe(false);
  });
});

describe("LoadMore", () => {
  it("states the count as a status message, not an alert", () => {
    const el = render(<LoadMore loaded={20} total={64} noun="scripts" onLoadMore={() => {}} />);
    const status = el.querySelector('[role="status"]');

    expect(status.textContent).toBe("Showing 20 of 64 scripts");
    // An alert would interrupt; SC 4.1.3 wants this announced politely.
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it("says what the next tap costs", () => {
    const el = render(<LoadMore loaded={20} total={64} pageSize={20} noun="scripts" onLoadMore={() => {}} />);
    expect(el.querySelector("button").textContent).toContain("Load 20 more scripts");
  });

  it("never offers more than remain", () => {
    const el = render(<LoadMore loaded={60} total={64} pageSize={20} noun="scripts" onLoadMore={() => {}} />);
    expect(el.querySelector("button").textContent).toContain("Load 4 more scripts");
  });

  it("drops the button and closes the list once everything is loaded", () => {
    const el = render(
      <LoadMore loaded={64} total={64} noun="scripts" endMessage="That is every script." onLoadMore={() => {}} />,
    );

    expect(el.querySelector("button")).toBeNull();
    expect(el.querySelector('[role="status"]').textContent)
      .toBe("Showing 64 of 64 scripts. That is every script.");
  });

  it("rescues focus when the button it was on disappears", () => {
    const props = { total: 64, pageSize: 20, noun: "scripts", onLoadMore: () => {} };
    const el = render(<LoadMore loaded={44} {...props} />);

    act(() => el.querySelector("button").focus());
    expect(document.activeElement.tagName).toBe("BUTTON");

    update(<LoadMore loaded={64} {...props} />);

    // Without this the focus falls to <body> and a screen-reader user is
    // dropped back at the top of the screen.
    expect(document.activeElement).toBe(el.querySelector(".ckm-load-more"));
  });

  it("offers a retry instead of a load when the page failed", () => {
    const onRetry = vi.fn();
    const el = render(
      <LoadMore loaded={20} total={64} noun="scripts" error="We could not load the next page." onRetry={onRetry} onLoadMore={() => {}} />,
    );

    expect(el.querySelector('[role="alert"]').textContent).toContain("We could not load the next page.");
    expect(el.querySelector("button").textContent).toContain("Try again");
    act(() => { el.querySelector("button").click(); });
    expect(onRetry).toHaveBeenCalled();
  });
});
