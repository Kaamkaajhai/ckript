// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectsSection from "./ProjectsSection";

/*
 * ProjectsSection is tested directly rather than through Dashboard because it
 * currently has no tab: `SectionTabs` was reduced to Overview + Challenge in
 * ada2b85 (2026-08-03). The section is fully built and fully wired; only the
 * way in is missing, and that is a product question in the plan's §19. Testing
 * it here means the behaviour is verified whatever that answer turns out to be.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

const project = (over = {}) => ({
  id: "s1",
  href: "/the-last-scene/arshad",
  title: "The Last Scene",
  author: "Arshad R.",
  date: "Feb 12, 2026",
  logline: "A grieving editor splices one last reel.",
  status: { label: "Published", dot: "var(--ckm-live)" },
  score: 74,
  tags: [{ label: "Drama", tone: "neutral" }],
  views: "4,100",
  coverImage: null,
  publicNote: "4,100 views",
  price: 1499,
  shareText: "",
  ...over,
});

const data = (over = {}) => ({
  total: 2,
  pendingApproval: 0,
  rejectedCount: 0,
  featured: [project()],
  collaborations: [],
  ...over,
});

async function mount(props = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <ProjectsSection
          data={data()}
          createHref="/create-project"
          uploadHref="/upload"
          onViewAll={() => {}}
          onShare={() => {}}
          {...props}
        />
      </MemoryRouter>,
    );
  });
}

describe("ProjectsSection", () => {
  it("makes the project title a link to the script, not a button", async () => {
    await mount();
    const title = container.querySelector(".ckm-pc__link");
    expect(title.tagName).toBe("A");
    expect(title.getAttribute("href")).toBe("/the-last-scene/arshad");
  });

  it("keeps Share out of the link, so tapping it cannot navigate", async () => {
    await mount();
    const share = container.querySelector(".ckm-pc__share");
    expect(share.getAttribute("aria-label")).toBe("Share The Last Scene");
    // The share control must not be a descendant of the card's link.
    expect(share.closest("a")).toBeNull();
  });

  it("calls onShare with the project rather than a desktop-only hint", async () => {
    const onShare = vi.fn();
    await mount({ onShare });
    await act(async () => { container.querySelector(".ckm-pc__share").click(); });
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare.mock.calls[0][0].title).toBe("The Last Scene");
  });

  it("filters the list in place instead of opening a hint", async () => {
    await mount({
      data: data({
        total: 2,
        featured: [project(), project({
          id: "s2", title: "Ember", status: { label: "In Review", dot: "x" }, score: null,
        })],
      }),
    });
    expect(container.textContent).toContain("Ember");

    const live = [...container.querySelectorAll('input[type="radio"]')]
      .find((r) => r.value === "published");
    await act(async () => { live.click(); });

    expect(container.textContent).toContain("The Last Scene");
    expect(container.textContent).not.toContain("Ember");
  });

  it("offers a way back when a filter empties the list", async () => {
    await mount();
    const drafts = [...container.querySelectorAll('input[type="radio"]')]
      .find((r) => r.value === "draft");
    await act(async () => { drafts.click(); });

    expect(container.textContent).toContain("Nothing in this status");
    const reset = [...container.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Show all projects"));
    await act(async () => { reset.click(); });
    expect(container.textContent).toContain("The Last Scene");
  });

  it("renders the rejected notice desktop can never reach", async () => {
    await mount({ data: data({ rejectedCount: 2 }) });
    const notice = container.querySelector(".ckm-proj__notice--error");
    expect(notice).toBeTruthy();
    expect(notice.textContent).toContain("2 projects were");
  });

  it("pluralises the pending notice for a single project", async () => {
    await mount({ data: data({ pendingApproval: 1 }) });
    const notice = container.querySelector(".ckm-proj__notice");
    expect(notice.textContent).toContain("1 project");
    expect(notice.textContent).toContain("it is");
  });

  it("points the first-run empty state at Create and Upload", async () => {
    await mount({ data: data({ total: 0, featured: [] }) });
    expect(container.querySelector('a[href="/create-project"]')).toBeTruthy();
    expect(container.querySelector('a[href="/upload"]')).toBeTruthy();
  });

  it("links each collaboration to its script and names the role", async () => {
    await mount({
      data: data({
        collaborations: [{
          id: "c1", href: "/halcyon/meera", title: "Halcyon",
          by: "Shared by Meera K.", status: "Published", role: "Co-writer",
        }],
      }),
    });
    const row = container.querySelector(".ckm-proj__collab");
    expect(row.tagName).toBe("A");
    expect(row.getAttribute("href")).toBe("/halcyon/meera");
    expect(row.textContent).toContain("Co-writer");
  });
});
