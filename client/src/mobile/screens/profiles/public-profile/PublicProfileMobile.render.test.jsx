// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import PublicProfileMobile from "./PublicProfileMobile";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const fixture = {
  user: {
    _id: "writer-1",
    name: "Mira Sen",
    role: "writer",
    bio: "Writes stories about memory and place.",
    email: "must-not-render@example.com",
    phone: "+91 00000 00000",
    followerCount: 12,
    followingCount: 4,
    skills: ["Screenwriting", "Research"],
    writerProfile: {
      representationStatus: "manager_and_agent",
      genres: ["Drama"],
      links: { portfolio: "https://example.com/work", unsafe: "javascript:alert(1)" },
    },
  },
  scripts: [{ _id: "project-1", title: "The Monsoon Archive", primaryGenre: "Drama", logline: "An archivist races a flood." }],
};

let root;
let container;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("PublicProfileMobile", () => {
  it("renders the sanitized public identity and public project path", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<MemoryRouter initialEntries={["/share/profile/mira"]}><div className="ckm"><Routes><Route path="/share/profile/:id" element={<PublicProfileMobile previewData={fixture} />} /></Routes></div></MemoryRouter>);
    });

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Mira Sen");
    expect(container.textContent).toContain("The Monsoon Archive");
    expect(container.querySelector('a[href="/share/project/project-1"]')).toBeTruthy();
    expect(container.querySelector('a[href="https://example.com/work"]')).toBeTruthy();
    expect(container.textContent).not.toContain("must-not-render@example.com");
    expect(container.textContent).not.toContain("+91 00000 00000");
    expect(container.querySelector('a[href^="javascript:"]')).toBeFalsy();
  });
});
