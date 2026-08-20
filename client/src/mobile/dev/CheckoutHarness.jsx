import { useSearchParams } from "react-router-dom";
import ProjectCheckoutMobile from "../screens/projects/checkout/ProjectCheckoutMobile";

/*
 * A deterministic checkout for the five-width sweep (D30).
 *
 * The live route cannot be measured twice and get the same answer, and for three reasons rather
 * than the usual one:
 *
 *   • the standing depends on an approved purchase request whose 72-hour window is running against
 *     the wall clock, so the same URL is `payable` in the morning and `expired` in the evening;
 *   • the amount depends on what that request was approved for, which differs per buyer;
 *   • the one primary control opens a third-party overlay in an iframe, which a sweep can neither
 *     open nor measure — so everything that has to be verified must be verifiable BEFORE the press.
 *
 * `?state=` selects the standing, because these are not variations on one screen: `payable` shows
 * an amount, a rights summary, four checkboxes and a docked pay control, while `expired` shows a
 * sentence and a way back, and a layout measured only against the first has measured a fifth of
 * the surface.
 *
 * `paymentDueAt` is written as an offset from the load, not as a fixed date, because a fixture
 * whose deadline is hard-coded starts rendering "the payment window closed" the day after it is
 * written — which is exactly the failure the deadline line exists to prevent.
 */
const CREATOR = { _id: "writer-1", name: "Mira Sen", username: "mira", role: "writer" };

const hoursFromNow = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

const BASE = {
  _id: "project-1",
  title: "The Monsoon Archive",
  logline: "An archivist races a flood to preserve a town's last recorded memories.",
  status: "published",
  format: "feature_film",
  price: 240000,
  creator: CREATOR,
  canPurchase: true,
  isCreator: false,
  rightsLicensing: {
    rightsType: "exclusive_license",
    modificationRights: "writer_retains_creative_approval_rights",
    paymentStructure: "lower_upfront_plus_royalty_percent",
    // DEF-28's missing enum, rendered so a regression to "Not specified" would be visible.
    negotiationMode: "ckript_not_involved",
    timeBound: { licenseDurationMonths: 24 },
    royaltySettings: { percentage: 5 },
  },
  legal: {
    customInvestorTerms:
      "Credit must read “from the archive of Ramgarh” in the main titles.\n"
      + "Any adaptation for television requires a separate conversation with the writer.",
  },
};

const APPROVED = (extra = {}) => ({
  _id: "req-1",
  investor: "viewer-1",
  status: "approved",
  amount: 240000,
  paymentDueAt: hoursFromNow(41),
  ...extra,
});

const STATES = {
  // The screen this route exists for: approved, unpaid, inside the window.
  payable: { ...BASE, myPendingRequest: APPROVED() },

  // The same screen with hours rather than days left — the deadline line's other wording, and the
  // one that has to stay legible at 320px next to a six-figure total.
  "payable-soon": { ...BASE, myPendingRequest: APPROVED({ paymentDueAt: hoursFromNow(3) }) },

  // No price. There is no gateway, no commission line worth reading and a different control label,
  // and it is the only payable state a sweep can press all the way through.
  free: { ...BASE, price: 0, myPendingRequest: APPROVED({ amount: 0 }) },

  // The four standings reached by a link that was correct when it was sent.
  expired: { ...BASE, myPendingRequest: APPROVED({ paymentDueAt: hoursFromNow(-2) }) },
  pending: { ...BASE, myPendingRequest: { _id: "req-2", investor: "viewer-1", status: "pending", amount: 240000 } },
  "no-request": BASE,
  sold: { ...BASE, isSold: true, transactionStatus: "sold_licensed" },

  // Already bought: the state where every number on the page is history.
  owned: { ...BASE, isUnlocked: true, canPurchase: false },

  // The writer opening their own payment link.
  "own-project": { ...BASE, isCreator: true, canPurchase: false },

  // A project with no rights terms and no writer conditions: three of the panels collapse to
  // "Not specified" and one checkbox disappears, which is where a layout built only against the
  // rich fixture comes apart.
  bare: {
    ...BASE,
    rightsLicensing: {},
    legal: {},
    myPendingRequest: APPROVED(),
  },
};

const VIEWERS = {
  producer: { _id: "viewer-1", name: "Ravi Menon", role: "producer", email: "ravi@studio.com" },
  // A reader cannot buy at all: the standing that replaces the whole form with two sentences.
  reader: { _id: "viewer-3", name: "Asha Rao", role: "reader", email: "asha@example.com" },
};

export default function CheckoutHarness({ user }) {
  const [params] = useSearchParams();
  const requested = String(params.get("state") || "payable");
  const previewData = STATES[requested] || STATES.payable;
  const viewer = VIEWERS[String(params.get("viewer") || "")] || user || VIEWERS.producer;

  return <ProjectCheckoutMobile user={viewer} previewData={previewData} />;
}
