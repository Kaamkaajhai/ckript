// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import api from "../../../../services/api";
import { ToastContext } from "../../../components/feedback/toastContext";
import ProjectDetailMobile from "./ProjectDetailMobile";

vi.mock("../../../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

// The reader mounts CodeMirror and pdf.js, neither of which belongs in a unit run — what this
// suite asserts about the reader is WHICH source it was asked for and with what window, which is
// exactly what these stubs record.
vi.mock("../../../../components/ScreenplayReadOnly", () => ({
  default: ({ text }) => <div data-testid="screenplay">{String(text).slice(0, 80)}</div>,
}));
vi.mock("../../../../components/ScreenplayPdfViewer", () => ({
  default: ({ pdfUrl, startPage, endPage, showAllPages }) => (
    <div data-testid="pdf" data-url={pdfUrl} data-start={startPage} data-end={endPage} data-all={String(Boolean(showAllPages))} />
  ),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const producer = { _id: "viewer-1", name: "Ravi", role: "producer", email: "ravi@studio.com", favoriteScripts: [] };
const writerAccount = { _id: "writer-1", name: "Mira", role: "writer", favoriteScripts: [] };

const toast = {
  show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(),
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(),
};

const creator = { _id: "writer-1", name: "Mira Sen", username: "mira" };

const project = (extra = {}) => ({
  _id: "p1",
  title: "The Monsoon Archive",
  logline: "An archivist races a flood.",
  synopsis: "A district archivist has until the water rises to choose what her town remembers.",
  status: "published",
  format: "feature_film",
  classification: { primaryGenre: "Drama" },
  price: 240000,
  pageCount: 112,
  creator,
  viewableScript: true,
  scriptPreviewAccess: { mode: "pages", start: 1, end: 8 },
  scriptPreviewPageTexts: ["INT. ARCHIVE - NIGHT"],
  previewExcerpt: "INT. ARCHIVE - NIGHT\n\nRain against high windows.",
  rightsLicensing: { rightsType: "exclusive_license", negotiationMode: "ckript_not_involved" },
  canPurchase: true,
  ...extra,
});

let container;
let root;
let seenPath = null;

// Records the path the router settled on, so the canonicalization assertions read the REAL
// location rather than trusting a navigate() spy. Written in an effect, not during render: the
// canonical rewrite happens in a `replace` navigation and the effect is what runs after it.
function PathProbe() {
  const { pathname } = useLocation();
  useEffect(() => { seenPath = pathname; }, [pathname]);
  return null;
}

async function mount(entry, { user = producer, ...props } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
          <ToastContext.Provider value={toast}>
            <div className="ckm">
              <PathProbe />
              <Routes>
                <Route path="/script/:id" element={<ProjectDetailMobile user={user} {...props} />} />
                <Route path="/:projectHeading/:writerUsername" element={<ProjectDetailMobile user={user} {...props} />} />
              </Routes>
            </div>
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

const buttonWith = (el, label) => Array.from(el.querySelectorAll("button"))
  .find((button) => button.textContent.includes(label));
const sectionText = (el, id) => el.querySelector(`[data-section="${id}"]`)?.textContent || "";

beforeEach(() => {
  vi.clearAllMocks();
  seenPath = null;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe("ProjectDetailMobile — the page", () => {
  it("renders one h1 and all five sections", async () => {
    const el = await mount("/script/p1", { previewData: project() });

    expect(el.querySelectorAll("h1")).toHaveLength(1);
    expect(el.querySelector("h1").textContent).toContain("The Monsoon Archive");
    for (const id of ["story", "read", "evidence", "deal", "contact"]) {
      expect(el.querySelector(`[data-section="${id}"]`), `section ${id}`).toBeTruthy();
    }
    // Each section is a labelled landmark, which is what replaces the desktop tab rail.
    el.querySelectorAll("[data-section]").forEach((section) => {
      const labelledBy = section.getAttribute("aria-labelledby");
      expect(el.querySelector(`#${labelledBy}`)).toBeTruthy();
    });
  });

  it("shows the deal term the desktop workbench rendered as 'Not specified' (DEF-28)", async () => {
    const el = await mount("/script/p1", { previewData: project() });
    expect(sectionText(el, "deal")).toContain("Ckript not involved");
    expect(sectionText(el, "deal")).not.toContain("ckript_not_involved");
  });

  it("states a sold project as sold, over its published status", async () => {
    const el = await mount("/script/p1", { previewData: project({ isSold: true }) });
    expect(el.textContent).toContain("Sold");
    expect(el.textContent).toContain("no longer available");
  });
});

describe("ProjectDetailMobile — the viewer's standing is text, not a missing button", () => {
  it("tells an approved buyer that payment is next, even though this slice has no Pay control", async () => {
    const el = await mount("/script/p1", {
      previewData: project({ myPendingRequest: { investor: "viewer-1", status: "approved" } }),
    });
    expect(el.textContent).toContain("Your purchase request was approved");
    expect(el.textContent).toContain("Continue to payment");
  });

  it("tells an owner how many requests are waiting", async () => {
    const el = await mount("/script/p1", {
      user: writerAccount,
      previewData: project({ isCreator: true, canPurchase: false, pendingRequestsCount: 2 }),
    });
    expect(el.textContent).toContain("2 purchase requests waiting");
  });

  it("states the contact quota without ever printing a contact it was not given", async () => {
    const el = await mount("/script/p1", {
      previewData: project({
        creator: { ...creator, email: "leak@example.com", phone: "+91 00000 00000" },
        writerContactRevealStatus: { canReveal: true, alreadyRevealed: false, remainingContacts: 11, contactsLimit: 15 },
      }),
    });
    expect(sectionText(el, "contact")).toContain("11 of 15");
    // DEF-26: the payload should not carry these at all any more, and the screen must not print
    // them even if an older server still does.
    expect(el.textContent).not.toContain("leak@example.com");
    expect(el.textContent).not.toContain("+91 00000 00000");
  });

  it("prints the contact once it has genuinely been revealed", async () => {
    const el = await mount("/script/p1", {
      previewData: project({
        writerContactRevealStatus: { alreadyRevealed: true },
        writerContact: { email: "mira@example.com", phone: "+91 90000 00000" },
      }),
    });
    expect(el.querySelector('a[href="mailto:mira@example.com"]')).toBeTruthy();
    expect(el.querySelector('a[href="tel:+91 90000 00000"]')).toBeTruthy();
  });
});

describe("ProjectDetailMobile — the reader", () => {
  it("opens the preview window rather than the whole document for a non-buyer", async () => {
    const el = await mount("/script/p1", { previewData: project({ hasUploadedScriptFile: true }) });

    expect(sectionText(el, "read")).toContain("pages 1–8");
    await act(async () => { buttonWith(el, "Read the preview").click(); });

    const pdf = el.querySelector('[data-testid="pdf"]');
    expect(pdf).toBeTruthy();
    expect(pdf.getAttribute("data-start")).toBe("1");
    expect(pdf.getAttribute("data-end")).toBe("8");
    expect(pdf.getAttribute("data-all")).toBe("false");
    // Always the authenticated proxy, never the private storage URL.
    expect(pdf.getAttribute("data-url")).toContain("/api/scripts/p1/pdf");
  });

  it("opens the whole screenplay for a buyer, from the canonical Fountain source", async () => {
    const el = await mount("/script/p1", {
      previewData: project({
        isUnlocked: true,
        canViewFullScript: true,
        fountainContent: "INT. DISTRICT ARCHIVE - NIGHT\n\nMEENA\nNot this one.",
      }),
    });

    expect(sectionText(el, "read")).toContain("full access");
    await act(async () => { buttonWith(el, "Read the full screenplay").click(); });
    expect(el.querySelector('[data-testid="screenplay"]').textContent).toContain("DISTRICT ARCHIVE");
  });

  it("offers no reader at all, and says why, when nothing is readable", async () => {
    const el = await mount("/script/p1", {
      previewData: project({ viewableScript: false, scriptPreviewPageTexts: [], previewExcerpt: "" }),
    });
    expect(sectionText(el, "read")).toContain("has not opened any part");
    expect(buttonWith(el, "Read the preview")).toBeUndefined();
  });
});

describe("ProjectDetailMobile — loading, failure and access", () => {
  it("offers a retry on a failed load and does not offer one on a blocked one", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500, data: { message: "Server said no." } } });
    const failed = await mount("/script/p1");
    expect(failed.textContent).toContain("Server said no.");
    expect(buttonWith(failed, "Try again") || buttonWith(failed, "Retry")).toBeTruthy();

    await act(async () => root.unmount());
    container.remove();

    api.get.mockRejectedValueOnce({
      response: { status: 403, data: { message: "Sign up with a business email.", requiresBusinessEmail: true } },
    });
    const blocked = await mount("/script/p1");
    expect(blocked.textContent).toContain("business email");
    // Retrying a decision the server will keep making is the trap this state avoids.
    expect(buttonWith(blocked, "Try again")).toBeUndefined();
    expect(buttonWith(blocked, "Retry")).toBeUndefined();
    expect(blocked.textContent).toContain("See industry plans");
  });

  it("says a missing project is missing rather than reporting a failure", async () => {
    api.get.mockRejectedValueOnce({ response: { status: 404, data: { message: "Script not found" } } });
    const el = await mount("/script/p1");
    expect(el.textContent).toContain("This project is not here");
  });
});

describe("ProjectDetailMobile — the three route forms", () => {
  it("loads by id and rewrites the URL to the server's canonical path", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/similar")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: project({ canonicalPath: "/the-monsoon-archive/mira" }) });
    });

    await mount("/script/p1");
    expect(api.get.mock.calls[0][0]).toBe("/scripts/p1");
    expect(seenPath).toBe("/the-monsoon-archive/mira");
  });

  it("loads the two-segment form by path, and does not re-navigate when already canonical", async () => {
    api.get.mockImplementation((url) => {
      if (url.includes("/similar")) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: project({ canonicalPath: "/the-monsoon-archive/mira" }) });
    });

    await mount("/the-monsoon-archive/mira");
    expect(api.get.mock.calls[0][0]).toBe("/scripts/path/the-monsoon-archive/mira");
    expect(seenPath).toBe("/the-monsoon-archive/mira");
  });

  it("encodes a writer-authored heading rather than pasting it into the URL", async () => {
    api.get.mockResolvedValue({ data: project() });
    await mount("/a b/mira");
    expect(api.get.mock.calls[0][0]).toBe("/scripts/path/a%20b/mira");
  });
});
