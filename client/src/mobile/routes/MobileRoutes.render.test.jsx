// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import MobileRoutes from "./MobileRoutes";

vi.mock("../screens/Dashboard", () => ({
  default: ({ preview = false }) => (
    <main data-testid="mobile-dashboard" data-preview={String(preview)}>
      Mobile dashboard
    </main>
  ),
}));

vi.mock("../screens/Holds", () => ({
  default: () => <main data-testid="mobile-holds">Mobile holds</main>,
}));

vi.mock("../screens/discovery/SearchMobile", () => ({
  default: () => <main data-testid="mobile-search">Mobile search</main>,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

async function mount(pathname, props = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[pathname]}>
        <MobileRoutes
          time="10:00"
          initials="CK"
          userName="Ckript"
          onLogout={() => {}}
          user={{ role: "writer" }}
          {...props}
        />
      </MemoryRouter>,
    );
    await Promise.resolve();
  });

  return container;
}

describe("MobileRoutes", () => {
  it("renders the mobile dashboard at its canonical URL", async () => {
    const el = await mount("/dashboard");
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-dashboard"]').dataset.preview).toBe("false");
  });

  it("does not silently turn an unmatched URL into the dashboard", async () => {
    const el = await mount("/messages");
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
  });

  it("renders the same dashboard at /ai-tools, because desktop does", async () => {
    // App.jsx mounts the identical <DashboardRoute /> element at both URLs.
    // The alias must not be a second, differently-built dashboard.
    const el = await mount("/ai-tools");
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeTruthy();
  });

  it("renders the holds screen at /offer-holds — and not the dashboard", async () => {
    const el = await mount("/offer-holds", { user: { role: "producer" } });
    expect(el.querySelector('[data-testid="mobile-holds"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
  });

  it("renders native search at the canonical /search URL", async () => {
    const el = await mount("/search?q=night");
    expect(el.querySelector('[data-testid="mobile-search"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
  });

  it("renders the stable fixture directly when App.jsx owns the preview route", async () => {
    const el = await mount("/__mobile-preview", { preview: true });
    expect(el.querySelector('[data-testid="mobile-dashboard"]').dataset.preview).toBe("true");
  });
});
