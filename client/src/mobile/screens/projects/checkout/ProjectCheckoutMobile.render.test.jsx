// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import { CurrencyContext } from "../../../../context/CurrencyContext";
import { forgetPendingCharge, rememberPendingCharge } from "../../../../pages/script-detail/checkout";
import api from "../../../../services/api";
import { ToastContext } from "../../../components/feedback/toastContext";
import ProjectCheckoutMobile from "./ProjectCheckoutMobile";

vi.mock("../../../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const producer = { _id: "viewer-1", name: "Ravi", role: "producer", email: "ravi@studio.com", favoriteScripts: [] };
const reader = { _id: "viewer-3", name: "Asha", role: "reader", favoriteScripts: [] };

const toast = {
  show: vi.fn(), dismiss: vi.fn(), dismissAll: vi.fn(),
  info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(),
};

const approved = (extra = {}) => ({
  _id: "req-1",
  investor: "viewer-1",
  status: "approved",
  amount: 240000,
  paymentDueAt: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
  ...extra,
});

const project = (extra = {}) => ({
  _id: "p1",
  title: "The Monsoon Archive",
  status: "published",
  price: 240000,
  creator: { _id: "writer-1", name: "Mira Sen", username: "mira" },
  canPurchase: true,
  rightsLicensing: { rightsType: "exclusive_license", negotiationMode: "ckript_not_involved", timeBound: { licenseDurationMonths: 24 } },
  myPendingRequest: approved(),
  ...extra,
});

let container;
let root;
let opened;
let seenPath = null;

/* Records the path the router settled on, so the "this URL is not canonicalized" assertion reads
   the real location rather than trusting that no navigate() was called. */
function PathProbe() {
  const { pathname } = useLocation();
  useEffect(() => { seenPath = pathname; }, [pathname]);
  return null;
}

function installGateway() {
  opened = [];
  window.Razorpay = function Razorpay(options) {
    return { open: () => opened.push(options) };
  };
}

async function mount({ user = producer, currency = "INR", ...props } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/script/p1/pay"]}>
        <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
          <CurrencyContext.Provider value={{ currency, setCurrency: vi.fn(), format: (v) => String(v), formatSubunits: (v) => String(v) }}>
            <ToastContext.Provider value={toast}>
              <div className="ckm">
                <PathProbe />
                <Routes>
                  <Route path="/script/:id/pay" element={<ProjectCheckoutMobile user={user} {...props} />} />
                </Routes>
              </div>
            </ToastContext.Provider>
          </CurrencyContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

const buttonWith = (el, label) => Array.from(el.querySelectorAll("button"))
  .find((button) => button.textContent.includes(label));
const linkWith = (el, label) => Array.from(el.querySelectorAll("a"))
  .find((anchor) => anchor.textContent.includes(label));
const tickAll = async (el) => {
  const boxes = Array.from(el.querySelectorAll('input[type="checkbox"]'));
  for (const box of boxes) {
    await act(async () => { box.click(); });
  }
  return boxes;
};

beforeEach(() => {
  vi.clearAllMocks();
  forgetPendingCharge();
  installGateway();
  seenPath = null;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  forgetPendingCharge();
  delete window.Razorpay;
});

describe("ProjectCheckoutMobile", () => {
  it("shows the amount, the rights and the deadline before the buyer can pay anything", async () => {
    const el = await mount({ previewData: project() });

    expect(el.textContent).toContain("2,52,000");       // the total, including the 5%
    expect(el.textContent).toContain("2,40,000");       // the writer's fee
    expect(el.textContent).toContain("Ckript not involved");
    expect(el.textContent).toContain("Pay by");
    expect(el.textContent).toContain("Mira Sen");
    expect(buttonWith(el, "Pay ")).toBeTruthy();
  });

  it("keeps the pay control live with an unticked box, and states the reason above it", async () => {
    const el = await mount({ previewData: project() });
    const pay = buttonWith(el, "Pay ");

    expect(pay.disabled).toBe(false);
    expect(el.textContent).toContain("Accept the Platform and Writer Terms");
  });

  it("has no disabled control on the screen in any standing", async () => {
    const states = [
      project(),
      project({ isUnlocked: true, canPurchase: false }),
      project({ isSold: true }),
      project({ myPendingRequest: { status: "pending" } }),
      project({ myPendingRequest: approved({ paymentDueAt: new Date(Date.now() - 3600000).toISOString() }) }),
      project({ myPendingRequest: null }),
    ];

    for (const previewData of states) {
      const el = await mount({ previewData });
      const disabled = Array.from(el.querySelectorAll("button, a, input")).filter((node) => node.disabled);
      expect(disabled).toEqual([]);
      await act(async () => root.unmount());
      container.remove();
      root = null;
    }
  });

  it("replaces the form with words and a way forward where payment is impossible", async () => {
    const expired = await mount({
      previewData: project({ myPendingRequest: approved({ paymentDueAt: new Date(Date.now() - 3600000).toISOString() }) }),
    });
    expect(expired.textContent).toContain("payment window has closed");
    expect(expired.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(buttonWith(expired, "Pay ")).toBeFalsy();
    expect(linkWith(expired, "request access")).toBeTruthy();
  });

  it("tells a reader why this account cannot buy, rather than showing an inert form", async () => {
    const el = await mount({ user: reader, previewData: project({ canPurchase: false }) });
    expect(el.textContent).toContain("cannot buy screenplays");
    expect(linkWith(el, "Browse other projects")).toBeTruthy();
  });

  it("labels a free unlock as a confirmation and not as a payment", async () => {
    const el = await mount({
      previewData: project({ price: 0, myPendingRequest: approved({ amount: 0 }) }),
    });
    expect(buttonWith(el, "Confirm and unlock")).toBeTruthy();
    expect(el.textContent).toContain("free to unlock");
  });

  it("asks for the writer's own conditions only when there are any, and shows them in full", async () => {
    const plain = await mount({ previewData: project() });
    expect(plain.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
    await act(async () => root.unmount());
    container.remove();

    const custom = await mount({
      previewData: project({ legal: { customInvestorTerms: "Credit must read “from the archive of Ramgarh”." } }),
    });
    expect(custom.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
    expect(custom.textContent).toContain("Ramgarh");
  });

  it("carries the ticked boxes and the buyer's currency into the order (DEF-31)", async () => {
    api.get.mockResolvedValue({ data: project() });
    api.post.mockResolvedValue({ data: { orderId: "order_1", amount: 302400, currency: "USD", keyId: "key" } });

    const el = await mount({ currency: "USD" });
    await tickAll(el);
    await act(async () => { buttonWith(el, "Pay ").click(); await Promise.resolve(); });

    expect(api.post).toHaveBeenCalledWith("/scripts/purchase/create-order", expect.objectContaining({ currency: "USD" }));
    expect(opened).toHaveLength(1);
  });

  it("offers to finish a charge this device took but never had confirmed (DEF-32)", async () => {
    rememberPendingCharge({
      scriptId: "p1",
      userId: "viewer-1",
      payment: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" },
    });
    api.get.mockResolvedValue({ data: project() });
    api.post.mockRejectedValue({ response: { status: 503, data: { message: "Try again shortly." } } });

    const el = await mount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(el.textContent).toContain("never confirmed");
    expect(buttonWith(el, "Confirm it now")).toBeTruthy();
  });

  it("does not blank the screen when the project cannot be loaded", async () => {
    api.get.mockRejectedValue({ response: { status: 500, data: { message: "Server error." } } });

    const el = await mount();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(el.textContent).toContain("could not be loaded");
    expect(buttonWith(el, "Try again")).toBeTruthy();
  });

  it("does not rewrite the payment URL into the project's canonical path", async () => {
    api.get.mockResolvedValue({ data: project() });
    const el = await mount();
    await act(async () => { await Promise.resolve(); });

    /*
     * `useProjectDetail` rewrites an alias URL to the project's canonical path. This route must
     * NOT take part in that: `/script/p1/pay` has no heading/username form, and a rewrite here
     * would navigate the buyer off their own checkout — so the screen passes no `onCanonicalPath`.
     */
    expect(el.textContent).toContain("2,52,000");
    expect(seenPath).toBe("/script/p1/pay");
    expect(buttonWith(el, "Back to the project")).toBeTruthy();
  });
});
