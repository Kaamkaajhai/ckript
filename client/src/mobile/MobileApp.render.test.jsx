// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import MobileApp from "./MobileApp";

vi.mock("./hooks/useClock", () => ({
  default: () => "10:00",
}));

vi.mock("./components/Skeleton", () => ({
  default: () => <div data-testid="mobile-boot">Restoring app</div>,
}));

vi.mock("./routes/MobileRoutes", () => ({
  default: ({ user }) => <main data-testid="mobile-routes">{user?.role || "public"}</main>,
}));

vi.mock("../components/CookieConsentBanner", () => ({
  default: ({ mobile }) => <aside data-testid="cookie-consent" data-mobile={String(mobile)} />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

async function mount(props = {}, user = null) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, logout: vi.fn() }}>
        <MobileApp {...props} />
      </AuthContext.Provider>,
    );
    await Promise.resolve();
  });

  return container;
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  document.documentElement.classList.remove("ckm-html-lock");
  root = null;
  container = null;
});

describe("MobileApp", () => {
  it("keeps the deliberate boot surface for authenticated app routes", async () => {
    const el = await mount({}, { role: "writer" });
    expect(el.querySelector('[data-testid="mobile-boot"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="mobile-routes"]')).toBeNull();
  });

  it("renders a shared public route immediately when skipBoot is set", async () => {
    const el = await mount({ skipBoot: true });
    expect(el.querySelector('[data-testid="mobile-boot"]')).toBeNull();
    expect(el.querySelector('[data-testid="mobile-routes"]')?.textContent).toBe("public");
    expect(el.querySelector('[data-testid="cookie-consent"]')?.dataset.mobile).toBe("true");
  });
});
