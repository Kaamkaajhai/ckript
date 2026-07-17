// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScriptDetailCinematic from "./ScriptDetailCinematic";

vi.mock("../../components/SocialShareButton", () => ({
  default: ({ buttonLabel, className }) => <button type="button" className={className}>{buttonLabel}</button>,
}));
vi.mock("../../components/ProducerRatingCard", () => ({ default: () => <div>Producer evidence</div> }));
vi.mock("../../components/ScreenplayPdfViewer", () => ({ default: () => <div>PDF screenplay</div> }));
vi.mock("../../components/ScreenplayReadOnly", () => ({ default: () => <div>Screenplay preview</div> }));
vi.mock("../../components/MeetingModal", () => ({ default: ({ isOpen }) => isOpen ? <div>Meeting scheduler</div> : null }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const stages = [
  ["story", "Story & identity"],
  ["read", "Read the script"],
  ["evidence", "Evaluation evidence"],
  ["discovery", "Discovery & promotion"],
  ["deal", "Deal desk"],
].map(([id, title], index) => ({ id, title, number: index + 1, ready: index < 3, tone: index === 3 ? "current" : "ready" }));

const createVm = (overrides = {}) => ({
  script: {
    _id: "script-1",
    sid: "CK-1042",
    title: "The Last Monsoon",
    logline: "A climate scientist returns home before the final rains.",
    synopsis: "A grounded family drama with a speculative edge.",
    status: "published",
    format: "feature",
    pageCount: 112,
    views: 1284,
    price: 15000,
    createdAt: "2026-01-12T00:00:00.000Z",
    creator: { _id: "writer-1", name: "Maya Rao", writerProfile: { company: "Blue Hour Films", bio: "Writer and director." } },
    classification: { primaryGenre: "Drama", tones: ["Intimate"], themes: ["Home"] },
    filmDetails: { filmLanguage: "Hindi", wantToDirect: true },
    roles: [{ _id: "role-1", characterName: "Asha", type: "Lead", ageRange: { min: 30, max: 38 }, gender: "Woman", description: "A precise scientist confronting a divided family." }],
    rightsLicensing: { rightsType: "full_rights_sale" },
    scriptScore: { overall: 82, plot: 84, characters: 80, dialogue: 78, marketability: 76 },
    producerRating: { average: 4.4 },
    rating: 4.1,
  },
  capabilities: { owner: true, buyer: false, canEdit: true, canBookmark: false, canPurchase: false, fullScript: true },
  journey: { readiness: 60, hasPreviewSource: true, hasTrailer: false, stages },
  recommended: { id: "trailer", label: "Add a trailer" },
  dark: false,
  notice: null,
  resolvedHeroImage: "",
  showCoverPlaceholder: true,
  canPlayTrailer: false,
  pendingRequestBadgeCount: 0,
  scriptShare: {},
  showDeleteModal: false,
  showMeetingModal: false,
  trailerDurationChoice: "30",
  trailerQualityChoice: "480",
  trailerFormatChoice: "landscape",
  trailerCurrencyChoice: "inr",
  selectedTrailerPrefix: "₹",
  selectedTrailerAmount: 999,
  trailerLoading: false,
  formatTrailerAmount: (value) => String(value),
  setTrailerDurationChoice: vi.fn(),
  setTrailerQualityChoice: vi.fn(),
  setTrailerFormatChoice: vi.fn(),
  setTrailerCurrencyChoice: vi.fn(),
  handleGenerateTrailer: vi.fn(),
  requestLoading: false,
  handleRequestPurchase: vi.fn(),
  availableWriterLinks: [],
  completionLabel: "Complete",
  completionProgress: "100%",
  completionFuturePlans: "",
  formatDate: () => "12 Jan 2026",
  fmtFormat: () => "Feature film",
  openProfile: vi.fn(),
  openEdit: vi.fn(),
  openPayment: vi.fn(),
  openMeeting: vi.fn(),
  openPricing: vi.fn(),
  recordPreviewOpen: vi.fn(),
  handleToggleBookmark: vi.fn(),
  setCoverError: vi.fn(),
  setNotice: vi.fn(),
  setShowDeleteModal: vi.fn(),
  setShowMeetingModal: vi.fn(),
  handleMeetingScheduled: vi.fn(),
  ...overrides,
});

const renderPage = (vm) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ScriptDetailCinematic vm={vm} />));
  return container;
};

afterEach(() => {
  if (root) act(() => root.unmount());
  document.querySelectorAll(".sd3-overlay").forEach((node) => node.remove());
  container?.remove();
  root = null;
  container = null;
  document.body.style.removeProperty("overflow");
});

describe("ScriptDetailCinematic", () => {
  it("renders the five-stage real project journey and an accessible story drawer", () => {
    const vm = createVm();
    const view = renderPage(vm);

    expect(view.textContent).toContain("The Last Monsoon");
    expect(view.querySelectorAll(".sd3-journey-card")).toHaveLength(5);
    expect(view.textContent).toContain("Edit project");
    const summaryRail = view.querySelector(".sd3-aside");
    expect(summaryRail).not.toBeNull();
    expect(summaryRail.querySelectorAll(".sd3-aside-card")).toHaveLength(4);
    expect(summaryRail.textContent).toContain("Commercial snapshot");
    expect(summaryRail.textContent).toContain("Strongest signals");
    expect(summaryRail.textContent).toContain("Maya Rao");

    const storyButton = [...view.querySelectorAll(".sd3-journey-card button")].find((button) => button.textContent.includes("Open story"));
    act(() => storyButton.click());

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    const drawerBody = dialog.querySelector(".sd3-overlay__body");
    expect(drawerBody).not.toBeNull();
    expect(drawerBody.textContent.trim().length).toBeGreaterThan(0);
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent).toBe("Story and identity");
    expect(dialog.textContent).toContain("Asha");

    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it("routes an approved buyer's recommended action through the existing payment callback", () => {
    const vm = createVm({
      capabilities: { owner: false, buyer: true, canEdit: false, canBookmark: true, canPurchase: false, fullScript: false },
      recommended: { id: "payment", label: "Continue to payment" },
    });
    const view = renderPage(vm);

    const recommendedAction = view.querySelector(".sd3-guide-strip > button");
    act(() => recommendedAction.click());

    expect(vm.openPayment).toHaveBeenCalledTimes(1);
    expect(view.textContent).not.toContain("Edit project");
  });
});
