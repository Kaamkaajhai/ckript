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

vi.mock("../screens/discovery/TopScriptsMobile", () => ({
  default: () => <main data-testid="mobile-top-scripts">Mobile top scripts</main>,
}));

vi.mock("../screens/discovery/FeaturedProjectsMobile", () => ({
  default: () => <main data-testid="mobile-featured">Mobile featured</main>,
}));

vi.mock("../screens/profiles/owner-profile/ProfileOwnerMobile", () => ({
  default: () => <main data-testid="mobile-owner-profile">Owner profile</main>,
}));

vi.mock("../screens/profiles/owner-profile/AccountSettingsMobile", () => ({
  default: () => <main data-testid="mobile-account-settings">Account settings</main>,
}));

vi.mock("../screens/profiles/follow-requests/FollowRequestsMobile", () => ({
  default: () => <main data-testid="mobile-follow-requests">Follow requests</main>,
}));

vi.mock("../screens/messages/MessagesMobile", () => ({
  default: () => <main data-testid="mobile-messages">Messages</main>,
}));

vi.mock("../screens/challenges/ChallengeHubMobile", () => ({
  default: () => <main data-testid="mobile-challenge-hub">Challenges</main>,
}));

vi.mock("../dev/ChallengeHubHarness", () => ({
  default: () => <main data-testid="mobile-challenge-harness">Challenge harness</main>,
}));

vi.mock("../screens/profiles/visitor-profile/ProfileVisitorMobile", () => ({
  default: () => <main data-testid="mobile-visitor-profile">Visitor profile</main>,
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

  it("renders the native messages screen instead of silently falling back to the dashboard", async () => {
    const el = await mount("/messages");
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
    expect(el.querySelector('[data-testid="mobile-messages"]')).toBeTruthy();
  });

  it("renders the native challenge hub at the canonical public route", async () => {
    const el = await mount("/challenge?tab=hall-of-fame");
    expect(el.querySelector('[data-testid="mobile-challenge-hub"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
  });

  it("renders the deterministic challenge fixture when App.jsx owns its dev route", async () => {
    const el = await mount("/__mobile-challenges?tab=mine", { devScreen: "challenges" });
    expect(el.querySelector('[data-testid="mobile-challenge-harness"]')).toBeTruthy();
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

  it("renders native rankings at the canonical /top-script URL", async () => {
    const el = await mount("/top-script?sort=trending");
    expect(el.querySelector('[data-testid="mobile-top-scripts"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
  });

  it("renders native featured at the canonical /featured URL", async () => {
    const el = await mount("/featured?sort=views&budget=medium");
    expect(el.querySelector('[data-testid="mobile-featured"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-dashboard"]')).toBeNull();
  });

  it("selects the owner and visitor profile presentations from the same route family", async () => {
    let el = await mount("/profile", { user: { _id: "writer-1", role: "writer" } });
    expect(el.querySelector('[data-testid="mobile-owner-profile"]')).toBeTruthy();

    act(() => root.unmount());
    container.remove();
    root = null;
    container = null;

    el = await mount("/profile/writer-2", { user: { _id: "writer-1", role: "writer" } });
    expect(el.querySelector('[data-testid="mobile-visitor-profile"]')).toBeTruthy();
  });

  it("selects native account settings only for the owner settings query", async () => {
    const el = await mount("/profile?tab=settings", { user: { _id: "writer-1", role: "writer" } });
    expect(el.querySelector('[data-testid="mobile-account-settings"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-owner-profile"]')).toBeNull();
  });

  it("renders incoming follow requests at their canonical route", async () => {
    const el = await mount("/follow-requests", { user: { _id: "writer-1", role: "writer" } });
    expect(el.querySelector('[data-testid="mobile-follow-requests"]')).toBeTruthy();
  });

  it("renders the stable fixture directly when App.jsx owns the preview route", async () => {
    const el = await mount("/__mobile-preview", { preview: true });
    expect(el.querySelector('[data-testid="mobile-dashboard"]').dataset.preview).toBe("true");
  });
});
