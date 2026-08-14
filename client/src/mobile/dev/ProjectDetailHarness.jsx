import { useSearchParams } from "react-router-dom";
import ProjectDetailMobile from "../screens/projects/project-detail/ProjectDetailMobile";

/*
 * A deterministic project-detail screen for the five-width sweep.
 *
 * The live route cannot be measured twice and get the same answer, and not because of timing:
 * this payload is PERSONALIZED. Capabilities, the preview window, the purchase request, the
 * contact quota and the recommended action all differ per viewer, and the recommended action —
 * the screen's single primary control — changes its label, its target and its very kind depending
 * on which of those the account happens to have. A fixture is the only way to measure the same
 * control twice.
 *
 * `?state=` selects the viewer standing, because the states are not variations on one screen —
 * they are five different screens sharing a layout, and a sweep that only ever renders the
 * preview-only case has measured one fifth of the surface. That is the "a sweep only measures
 * what it rendered" lesson the ledger records three times, applied before it costs a fourth.
 */
const CREATOR = {
  _id: "writer-1",
  name: "Mira Sen",
  username: "mira",
  role: "writer",
  writerProfile: { username: "mira", links: { portfolio: "https://example.com" } },
};

const BASE = {
  _id: "project-1",
  title: "The Monsoon Archive",
  logline: "An archivist races a flood to preserve a town's last recorded memories.",
  synopsis:
    "Nineteen days before the reservoir is opened, a district archivist discovers that the only "
    + "surviving recordings of her town are the ones she was ordered to destroy. She has until the "
    + "water reaches the second floor to decide which memories the town gets to keep.",
  status: "published",
  format: "feature_film",
  primaryGenre: "Drama",
  classification: { primaryGenre: "Drama", secondaryGenre: "Mystery", tones: ["Elegiac"], themes: ["Memory"] },
  filmDetails: { filmLanguage: "Hindi" },
  budget: "medium",
  pageCount: 112,
  views: 18420,
  reviewCount: 12,
  price: 240000,
  tags: ["monsoon", "archive", "period", "small town"],
  coverImage: "",
  trailerUrl: "https://cdn.example.com/trailer.mp4",
  scriptScore: { overall: 94, feedback: "Distinctive voice; the second act turn lands." },
  platformScore: { overall: 81 },
  producerRating: { average: 4.4, count: 9 },
  scriptCompletion: { status: "complete" },
  rightsLicensing: {
    rightsType: "exclusive_license",
    modificationRights: "buyer_must_consult_writer",
    paymentStructure: "lower_upfront_plus_royalty_percent",
    // The enum the workbench's private label map was missing — DEF-28. The fixture renders it so
    // the sweep would show "Not specified" if the shared vocabulary ever regressed.
    negotiationMode: "ckript_not_involved",
    timeBound: { licenseDurationMonths: 24 },
  },
  legal: { customInvestorTerms: "Credit must read “from the archive of Ramgarh”, in the main titles." },
  creator: CREATOR,
  viewableScript: true,
  scriptPreviewAccess: { mode: "pages", start: 1, end: 8 },
  scriptPreviewPageTexts: ["INT. DISTRICT ARCHIVE - NIGHT\n\nRain against high windows."],
  previewExcerpt: "INT. DISTRICT ARCHIVE - NIGHT\n\nRain against high windows. MEENA, 40s, works by torchlight.",
  hasUploadedScriptFile: false,
  canPurchase: true,
  isCreator: false,
  canViewFullScript: false,
};

const STATES = {
  // An industry viewer who can read the writer's sample and nothing more. The default, because it
  // is the state most viewers of this screen are in.
  preview: BASE,

  // The buyer: full source, no purchase controls, the reader opens the whole screenplay.
  buyer: {
    ...BASE,
    isUnlocked: true,
    canViewFullScript: true,
    canPurchase: false,
    fountainContent: "INT. DISTRICT ARCHIVE - NIGHT\n\nRain against high windows.\n\nMEENA\nNot this one.",
    textContent: "",
  },

  // The writer's own project, mid-listing: this is the state whose recommended action is an EDIT
  // link rather than a reader, and the only one where the section order is read by its author.
  owner: {
    ...BASE,
    isCreator: true,
    canPurchase: false,
    canViewFullScript: true,
    canEditScript: true,
    projectSource: "editor",
    trailerUrl: "",
    uploadedTrailerUrl: "",
    pendingRequestsCount: 2,
    fountainContent: "INT. DISTRICT ARCHIVE - NIGHT\n\nRain against high windows.",
  },

  // Approved but unpaid: the state the D28 boundary is measured on. There is no native Pay button
  // in this slice, so the screen must still SAY that payment is what happens next.
  approved: {
    ...BASE,
    myPendingRequest: { _id: "req-1", investor: "viewer-1", status: "approved", amount: 240000 },
    writerContactRevealStatus: { canReveal: true, alreadyRevealed: false, remainingContacts: 11, contactsLimit: 15, contactsUsed: 4 },
  },

  // Sold, with the contact already revealed: the two states that most change what the page MEANS
  // while changing almost nothing about how it looks.
  sold: {
    ...BASE,
    isSold: true,
    holdStatus: "sold",
    canPurchase: false,
    writerContactRevealStatus: { canReveal: true, alreadyRevealed: true, remainingContacts: 10, contactsLimit: 15, contactsUsed: 5 },
    writerContact: { email: "mira@example.com", phone: "+91 90000 00000" },
  },

  // Nothing readable, nothing evaluated, no terms set: the empty-ish project, which is where a
  // layout built only against the rich fixture falls apart.
  bare: {
    _id: "project-2",
    title: "Untitled draft",
    status: "draft",
    creator: CREATOR,
    isCreator: true,
    canViewFullScript: true,
    viewableScript: false,
    price: 0,
  },
};

const VIEWER = { _id: "viewer-1", name: "Ravi Menon", role: "producer", email: "ravi@studio.com" };

export default function ProjectDetailHarness({ user }) {
  const [params] = useSearchParams();
  const requested = String(params.get("state") || "preview");
  const previewData = STATES[requested] || STATES.preview;

  return <ProjectDetailMobile user={user || VIEWER} previewData={previewData} />;
}
