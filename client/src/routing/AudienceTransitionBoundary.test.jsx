// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AuthContext } from "../context/AuthContext";
import AudienceTransitionBoundary from "./AudienceTransitionBoundary";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let host;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <main>
      <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
      <output data-testid="content">Current workspace</output>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
    </main>
  );
}

function ReaderProbe() {
  const location = useLocation();
  return (
    <main>
      <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
      <output data-testid="reader-content">Reader workspace</output>
    </main>
  );
}

function IndustryProbe() {
  const location = useLocation();
  return (
    <main>
      <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>
      <output data-testid="industry-content">Industry workspace</output>
    </main>
  );
}

function Harness({ initialEntries, initialIndex, initialUser, loading = false }) {
  const value = {
    user: initialUser,
    loading,
    setUser: () => {},
  };
  return (
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <AudienceTransitionBoundary>
          <Routes>
            <Route path="/reader/*" element={<ReaderProbe />} />
            <Route path="/home" element={<IndustryProbe />} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </AudienceTransitionBoundary>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

async function renderHarness(props) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => root.render(<Harness {...props} />));
}

describe("AudienceTransitionBoundary", () => {
  it("does not mount audience content while authentication is restoring", async () => {
    await renderHarness({ initialEntries: ["/reader"], initialUser: { role: "reader" }, loading: true });
    expect(host.textContent).toContain("Restoring your workspace");
    expect(host.textContent).not.toContain("Reader workspace");
  });

  it.each([
    ["writer", "/reader", "/dashboard", "reader-content"],
    ["producer", "/reader", "/home", "reader-content"],
    ["reader", "/home", "/reader", "industry-content"],
  ])("replaces a foreign direct URL for %s", async (role, entry, expected, foreignTestId) => {
    await renderHarness({ initialEntries: [entry], initialUser: { _id: `${role}-1`, role } });
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe(expected);
    expect(host.querySelector(`[data-testid="${foreignTestId}"]`)).toBeNull();
  });

  it("preserves query and hash on an authorized direct URL", async () => {
    await renderHarness({
      initialEntries: ["/reader/search?q=night#results"],
      initialUser: { _id: "reader-1", role: "reader" },
    });
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe("/reader/search?q=night#results");
  });

  it("re-evaluates a denied location reached through browser Back", async () => {
    await renderHarness({
      initialEntries: ["/reader", "/featured"],
      initialIndex: 1,
      initialUser: { _id: "writer-1", role: "writer" },
    });
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe("/featured");
    await act(async () => host.querySelector("button")?.click());
    expect(host.querySelector('[data-testid="location"]')?.textContent).toBe("/dashboard");
  });
});
