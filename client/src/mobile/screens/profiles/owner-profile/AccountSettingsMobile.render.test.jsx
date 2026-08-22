// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import { CurrencyContext } from "../../../../context/CurrencyContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import { ToastContext } from "../../../components/feedback/toastContext";
import AccountSettingsMobile from "./AccountSettingsMobile";

const mocks = vi.hoisted(() => ({
  state: null,
  loadSessions: vi.fn(),
  updateSettings: vi.fn(),
  sendCode: vi.fn(),
  verifyEmail: vi.fn(),
  changeEmail: vi.fn(),
  changePassword: vi.fn(),
  revokeSession: vi.fn(),
  revokeOthers: vi.fn(),
  unblock: vi.fn(),
  deleteAccount: vi.fn(),
  calendarStatus: vi.fn(),
  calendarConnect: vi.fn(),
  calendarDisconnect: vi.fn(),
  logout: vi.fn(),
  setUser: vi.fn(),
  setCurrency: vi.fn(),
  loadPayout: vi.fn(),
  submitPayout: vi.fn(),
  submitProof: vi.fn(),
  loadProofUrl: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../../pages/profile/useAuthenticatedProfile", () => ({ useAuthenticatedProfile: () => mocks.state }));
vi.mock("../../../../pages/profile/accountSecurity", async (importOriginal) => ({
  ...(await importOriginal()),
  loadAccountSessions: mocks.loadSessions,
  updateAccountSettings: mocks.updateSettings,
  sendAccountEmailVerification: mocks.sendCode,
  verifyAccountEmail: mocks.verifyEmail,
  changeAccountEmail: mocks.changeEmail,
  changeAccountPassword: mocks.changePassword,
  revokeAccountSession: mocks.revokeSession,
  revokeOtherAccountSessions: mocks.revokeOthers,
  unblockAccountUser: mocks.unblock,
  deleteOwnAccount: mocks.deleteAccount,
  loadGoogleCalendarStatus: mocks.calendarStatus,
  startGoogleCalendarConnection: mocks.calendarConnect,
  disconnectGoogleCalendar: mocks.calendarDisconnect,
}));
vi.mock("../../../../pages/profile/accountCredentials", async (importOriginal) => ({
  ...(await importOriginal()),
  loadPayoutDetails: mocks.loadPayout,
  submitPayoutDetails: mocks.submitPayout,
  submitMembershipProof: mocks.submitProof,
  loadMembershipProofAccessUrl: mocks.loadProofUrl,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const viewer = { _id: "writer-1", role: "writer", name: "Mira", writerProfile: { username: "mira" } };
const readyState = () => ({
  status: AUTHENTICATED_PROFILE_STATUS.READY,
  profile: {
    ...viewer,
    email: "mira@example.com",
    emailVerified: true,
    isPrivate: false,
    allowIndustryContact: true,
    notificationPrefs: { smartMatchAlerts: true, holdAlerts: false, viewAlerts: true },
    language: "en",
    timezone: "Asia/Kolkata",
    blockedUsers: [{ _id: "writer-2", name: "Asha", role: "writer" }],
  },
  deletedScripts: [{ _id: "script-1", title: "Archive", genre: "Drama", deletedAt: "2026-08-01T00:00:00.000Z" }],
  applyProfileUpdate: vi.fn(),
  reload: vi.fn(),
});

let container;
let root;

beforeEach(() => {
  mocks.state = readyState();
  mocks.loadSessions.mockResolvedValue({ ok: true, data: [
    { sessionId: "current", browser: "Safari", os: "iOS", isCurrent: true, location: "Mumbai", ip: "127.0.0.1" },
    { sessionId: "other", browser: "Chrome", os: "Windows", isCurrent: false, location: "Delhi", ip: "127.0.0.2" },
  ] });
  mocks.updateSettings.mockResolvedValue({ ok: true, data: { user: { isPrivate: true } } });
  mocks.changePassword.mockResolvedValue({ ok: true, data: { message: "changed" } });
  mocks.revokeSession.mockResolvedValue({ ok: true, data: { message: "removed" } });
  mocks.deleteAccount.mockResolvedValue({ ok: true, data: { message: "deleted" } });
  mocks.calendarStatus.mockResolvedValue({ ok: true, data: { connected: false } });
  mocks.loadPayout.mockResolvedValue({ ok: true, data: {
    approved: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "****1234", routingNumber: "HDFC0001234", accountType: "savings", country: "IN", currency: "INR" },
    review: { status: "approved", adminNote: "", requestedDetails: null },
    security: { invalidAttempts: 0, isLocked: false },
    display: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "****1234", routingNumber: "HDFC0001234", accountType: "savings", country: "IN", currency: "INR" },
    draft: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "", routingNumber: "HDFC0001234", accountType: "savings", swiftCode: "", iban: "", country: "IN", currency: "INR" },
  } });
  mocks.submitPayout.mockResolvedValue({ ok: true, message: "Payout queued", data: {
    approved: null,
    review: { status: "pending", requestedDetails: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "****5678", routingNumber: "HDFC0001234", accountType: "savings", country: "IN", currency: "INR" } },
    security: { invalidAttempts: 0, isLocked: false },
    display: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "****5678", routingNumber: "HDFC0001234", accountType: "savings", country: "IN", currency: "INR" },
    draft: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "", routingNumber: "HDFC0001234", accountType: "savings", swiftCode: "", iban: "", country: "IN", currency: "INR" },
  } });
  mocks.submitProof.mockResolvedValue({ ok: true, message: "WGA submitted", data: { membershipVerification: { wga: { requested: true, status: "pending", proofFileName: "card.pdf" } } } });
  mocks.loadProofUrl.mockResolvedValue({ ok: true, data: { url: "https://asset.test/signed-proof" } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
  localStorage.clear();
});

async function render() {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user: viewer, setUser: mocks.setUser, logout: mocks.logout }}>
        <CurrencyContext.Provider value={{ currency: "INR", setCurrency: mocks.setCurrency }}>
          <ToastContext.Provider value={mocks.toast}>
            <MemoryRouter initialEntries={["/profile?tab=settings"]}>
              <div className="ckm"><Routes><Route path="/profile" element={<AccountSettingsMobile user={viewer} />} /><Route path="/login" element={<main>Signed out</main>} /></Routes></div>
            </MemoryRouter>
          </ToastContext.Provider>
        </CurrencyContext.Provider>
      </AuthContext.Provider>,
    );
    await Promise.resolve();
  });
}

const input = async (element, value) => act(async () => {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
});

describe("AccountSettingsMobile", () => {
  it("renders the complete writer settings workspace and loaded sessions", async () => {
    await render();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    for (const label of ["Account", "Payout account", "Guild membership", "Email", "Password", "Notifications", "Devices & sessions", "Localization", "Blocked users", "Deleted projects (1)", "Danger zone"]) {
      expect(container.textContent).toContain(label);
    }
    expect(container.textContent).toContain("****1234");
    expect(container.textContent).toContain("Writers Guild of America");
    expect(container.textContent).toContain("Safari on iOS");
    expect(container.textContent).toContain("Chrome on Windows");
    expect(container.textContent).not.toContain("Google Calendar");
  });

  it("loads the calendar integration for an industry account", async () => {
    mocks.state = { ...readyState(), profile: { ...readyState().profile, role: "producer" } };
    mocks.calendarStatus.mockResolvedValueOnce({ ok: true, data: { connected: true, calendarEmail: "producer@studio.test" } });
    await render();
    expect(mocks.calendarStatus).toHaveBeenCalled();
    expect(container.textContent).toContain("Google Calendar");
    expect(container.textContent).toContain("producer@studio.test");
  });

  it("updates an immediate privacy switch through the shared contract", async () => {
    await render();
    const privacy = [...container.querySelectorAll('[role="switch"]')].find((button) => button.getAttribute("aria-labelledby")?.includes(container.querySelector(".ckm-switch__label")?.id));
    await act(async () => privacy.click());
    expect(mocks.updateSettings).toHaveBeenCalledWith({ isPrivate: true });
    expect(mocks.state.applyProfileUpdate).toHaveBeenCalledWith({ isPrivate: true });
  });

  it("validates and changes the password through the shared contract", async () => {
    await render();
    const section = [...container.querySelectorAll("section")].find((node) => node.querySelector("h2")?.textContent === "Password");
    const fields = section.querySelectorAll('input[type="password"]');
    await input(fields[0], "oldpass");
    await input(fields[1], "newpass");
    await input(fields[2], "newpass");
    await act(async () => section.querySelector('button[type="submit"]').click());
    expect(mocks.changePassword).toHaveBeenCalledWith({ currentPassword: "oldpass", newPassword: "newpass", confirmPassword: "newpass" });
    expect(mocks.toast.success).toHaveBeenCalledWith("Password changed");
  });

  it("requires the full account number and submits payout changes through the shared contract", async () => {
    await render();
    const section = [...container.querySelectorAll("section")].find((node) => node.querySelector("h2")?.textContent === "Payout account");
    await act(async () => [...section.querySelectorAll("button")].find((button) => button.textContent === "Change payout account").click());
    const accountLabel = [...section.querySelectorAll("label")].find((label) => label.textContent.includes("Full account number"));
    await input(document.getElementById(accountLabel.htmlFor), "12345678");
    await act(async () => [...section.querySelectorAll("button")].find((button) => button.textContent === "Submit for review").click());
    expect(mocks.submitPayout).toHaveBeenCalledWith(expect.objectContaining({ accountNumber: "12345678", currency: "INR" }));
    expect(container.textContent).toContain("Under review");
  });

  it("separates the active payout account from a replacement under review", async () => {
    mocks.loadPayout.mockResolvedValueOnce({ ok: true, data: {
      approved: { accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "****1111", routingNumber: "HDFC0001111", accountType: "savings", country: "IN", currency: "INR" },
      review: { status: "pending", adminNote: "", requestedDetails: { accountHolderName: "Mira Rao", bankName: "ICICI", accountNumber: "****2222", routingNumber: "ICIC0002222", accountType: "checking", country: "IN", currency: "INR" } },
      security: { invalidAttempts: 0, isLocked: false },
      display: { accountHolderName: "Mira Rao", bankName: "ICICI", accountNumber: "****2222", routingNumber: "ICIC0002222", accountType: "checking", country: "IN", currency: "INR" },
      draft: { accountHolderName: "Mira Rao", bankName: "ICICI", accountNumber: "", routingNumber: "ICIC0002222", accountType: "checking", swiftCode: "", iban: "", country: "IN", currency: "INR" },
    } });
    await render();
    const section = [...container.querySelectorAll("section")].find((node) => node.querySelector("h2")?.textContent === "Payout account");
    expect(section.textContent).toContain("Active payout account");
    expect(section.textContent).toContain("****1111");
    expect(section.textContent).toContain("Replacement under review");
    expect(section.textContent).toContain("****2222");
    expect(section.textContent).toContain("active account remains unchanged");
  });

  it("uploads a selected guild proof and syncs the sanitized writer profile", async () => {
    mocks.state = { ...readyState(), profile: { ...readyState().profile, writerProfile: { username: "mira", membershipVerification: { wga: { requested: true, status: "rejected", proofFileName: "old.pdf", adminNote: "Use a current card" } } } } };
    await render();
    const guild = [...container.querySelectorAll("article")].find((node) => node.textContent.includes("Writers Guild of America"));
    const picker = guild.querySelector('input[type="file"]');
    const file = new File(["proof"], "card.pdf", { type: "application/pdf" });
    Object.defineProperty(picker, "files", { configurable: true, value: [file] });
    await act(async () => picker.dispatchEvent(new Event("change", { bubbles: true })));
    await act(async () => [...guild.querySelectorAll("button")].find((button) => button.textContent === "Resubmit proof").click());
    expect(mocks.submitProof).toHaveBeenCalledWith(expect.objectContaining({ membershipType: "wga", file }));
    expect(mocks.state.applyProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({ writerProfile: expect.any(Object) }));
  });

  it("reveals an approved proof only after loading an authorized access URL", async () => {
    mocks.state = { ...readyState(), profile: { ...readyState().profile, writerProfile: { username: "mira", membershipVerification: { wga: { requested: true, status: "approved", proofFileName: "card.pdf" } } } } };
    await render();
    const guild = [...container.querySelectorAll("article")].find((node) => node.textContent.includes("Writers Guild of America"));
    expect(guild.querySelector('a[href="https://asset.test/signed-proof"]')).toBeNull();
    await act(async () => [...guild.querySelectorAll("button")].find((button) => button.textContent === "Get secure link").click());
    expect(mocks.loadProofUrl).toHaveBeenCalledWith("wga");
    expect(guild.querySelector('a[href="https://asset.test/signed-proof"]')).toBeTruthy();
  });

  it("confirms remote-session removal before revoking it", async () => {
    await render();
    const remove = [...container.querySelectorAll("button")].find((button) => button.textContent === "Remove");
    await act(async () => remove.click());
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    const confirm = [...container.querySelectorAll("button")].find((button) => button.textContent === "Remove session");
    await act(async () => confirm.click());
    expect(mocks.revokeSession).toHaveBeenCalledWith("other");
    expect(mocks.loadSessions).toHaveBeenCalledTimes(2);
  });

  it("requires a destructive confirmation before account deletion", async () => {
    await render();
    const danger = [...container.querySelectorAll("section")].find((node) => node.querySelector("h2")?.textContent === "Danger zone");
    await act(async () => danger.querySelector("button").click());
    expect(container.querySelector('[role="alertdialog"]')).toBeTruthy();
    const reason = container.querySelector("textarea");
    await input(reason, "Taking a break");
    const confirm = [...container.querySelectorAll("button")].find((button) => button.textContent === "Delete account");
    await act(async () => confirm.click());
    expect(mocks.deleteAccount).toHaveBeenCalledWith("Taking a break");
    expect(mocks.logout).toHaveBeenCalled();
  });
});
