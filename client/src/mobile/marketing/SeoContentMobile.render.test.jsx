// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import SeoContentMobile from "./SeoContentMobile";

const openAuthModal = vi.fn();

vi.mock("../../context/AuthModalContext", () => ({
  useAuthModal: () => ({ openAuthModal }),
}));

vi.mock("../analytics/useMobileScrollDepth", () => ({
  useMobileScrollDepth: () => {},
}));

vi.mock("../components/feedback/OfflineBanner", () => ({
  default: () => null,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  openAuthModal.mockReset();
});

async function mount(pathname, user = null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[pathname]}>
        <SeoContentMobile user={user} />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });
  return container;
}

describe("SeoContentMobile", () => {
  it("renders registered content in the public shell with one heading and related navigation", async () => {
    const el = await mount("/features/ai-script-analysis");
    expect(el.querySelector('[data-shell-mode="public"]')).toBeTruthy();
    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.querySelector("h1")?.textContent).toBe("AI script analysis for screenwriters and producers");
    expect(el.querySelector('[aria-label="Related Ckript pages"] a')).toBeTruthy();
    expect(el.querySelector('.ckm-seo-page__trail a[href="/features"]')).toBeTruthy();
    expect(el.textContent).not.toContain("Page not found");
  });

  it("renders the FAQ as disclosure controls without duplicate capability cards", async () => {
    const el = await mount("/faq");
    expect(el.querySelectorAll("details")).toHaveLength(4);
    expect(el.querySelectorAll(".ckm-seo-page__chapters article")).toHaveLength(0);
    expect(el.querySelectorAll("summary")[0]?.textContent).toBe("What is Ckript?");
  });

  it("renders unknown registered slugs as a recoverable not-found page", async () => {
    const el = await mount("/tools/not-registered");
    expect(el.querySelector("h1")?.textContent).toBe("This page is not in the Ckript library");
    expect(el.querySelectorAll('[aria-label="Related Ckript pages"] a')).toHaveLength(4);
  });

  it("opens sign-in with the current canonical return path for signed-out visitors", async () => {
    const el = await mount("/resources/screenplay-guide");
    const signIn = [...el.querySelectorAll("button")].find((button) => button.textContent === "Sign in");
    await act(async () => signIn.click());
    expect(openAuthModal).toHaveBeenCalledWith({ redirect: "/resources/screenplay-guide" });
  });

  it("links an authenticated member back to their canonical workspace", async () => {
    const el = await mount("/genre/thriller", { role: "writer" });
    expect(el.querySelector('a[href="/dashboard"]')).toBeTruthy();
    expect(el.textContent).not.toContain("Sign in");
  });
});
