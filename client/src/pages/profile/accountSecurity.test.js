import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  changeAccountEmail,
  changeAccountPassword,
  deleteOwnAccount,
  disconnectGoogleCalendar,
  loadAccountSessions,
  loadGoogleCalendarStatus,
  revokeAccountSession,
  revokeOtherAccountSessions,
  sendAccountEmailVerification,
  startGoogleCalendarConnection,
  unblockAccountUser,
  updateAccountSettings,
  validateEmailChange,
  validatePasswordChange,
  validateVerificationCode,
  verifyAccountEmail,
} from "./accountSecurity";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe("account security validation", () => {
  it("validates email changes before sending credentials", () => {
    expect(validateEmailChange({ newEmail: "bad", password: "", currentEmail: "old@example.com" })).toMatchObject({
      ok: false,
      fieldErrors: { newEmail: expect.any(String), password: expect.any(String) },
    });
    expect(validateEmailChange({ newEmail: " OLD@example.com ", password: "secret", currentEmail: "old@example.com" }).ok).toBe(false);
    expect(validateEmailChange({ newEmail: " NEW@example.com ", password: "secret", currentEmail: "old@example.com" })).toMatchObject({
      ok: true,
      data: { newEmail: "new@example.com", password: "secret" },
    });
  });

  it("validates passwords and one-time codes", () => {
    expect(validatePasswordChange({ currentPassword: "", newPassword: "short", confirmPassword: "different" })).toMatchObject({
      ok: false,
      fieldErrors: { currentPassword: expect.any(String), newPassword: expect.any(String), confirmPassword: expect.any(String) },
    });
    expect(validatePasswordChange({ currentPassword: "old", newPassword: "newpass", confirmPassword: "newpass" }).ok).toBe(true);
    expect(validateVerificationCode("12345").ok).toBe(false);
    expect(validateVerificationCode("123456")).toEqual({ ok: true, data: "123456" });
  });
});

describe("account security requests", () => {
  it("normalizes sessions and calls settings/email/password endpoints", async () => {
    api.get.mockResolvedValueOnce({ data: null });
    expect(await loadAccountSessions()).toEqual({ ok: true, data: [] });

    api.put.mockResolvedValueOnce({ data: { user: { isPrivate: true } } });
    await updateAccountSettings({ isPrivate: true });
    expect(api.put).toHaveBeenLastCalledWith("/users/settings", { isPrivate: true });

    api.post.mockResolvedValueOnce({ data: { message: "sent" } });
    await sendAccountEmailVerification();
    expect(api.post).toHaveBeenLastCalledWith("/users/email-verification/send");

    api.post.mockResolvedValueOnce({ data: { emailVerified: true } });
    await verifyAccountEmail("123456");
    expect(api.post).toHaveBeenLastCalledWith("/users/email-verification/verify", { otp: "123456" });

    api.put.mockResolvedValueOnce({ data: { pendingEmail: "new@example.com" } });
    await changeAccountEmail({ newEmail: "new@example.com", password: "oldpass" }, "old@example.com");
    expect(api.put).toHaveBeenLastCalledWith("/users/change-email", { newEmail: "new@example.com", password: "oldpass" });

    api.put.mockResolvedValueOnce({ data: { message: "changed" } });
    await changeAccountPassword({ currentPassword: "oldpass", newPassword: "newpass", confirmPassword: "newpass" });
    expect(api.put).toHaveBeenLastCalledWith("/users/change-password", { currentPassword: "oldpass", newPassword: "newpass" });
  });

  it("calls session, unblock, delete, and calendar endpoints", async () => {
    api.delete.mockResolvedValue({ data: { message: "ok" } });
    api.post.mockResolvedValue({ data: { url: "https://accounts.google.test" } });
    api.get.mockResolvedValue({ data: { connected: false } });

    await revokeAccountSession("session / 2");
    expect(api.delete).toHaveBeenCalledWith("/auth/sessions/session%20%2F%202");
    await revokeOtherAccountSessions();
    expect(api.delete).toHaveBeenCalledWith("/auth/sessions/all-others");
    await unblockAccountUser("user-2");
    expect(api.post).toHaveBeenCalledWith("/users/unblock", { userId: "user-2" });
    await deleteOwnAccount("Leaving");
    expect(api.delete).toHaveBeenCalledWith("/users/account", { data: { reason: "Leaving" } });
    await loadGoogleCalendarStatus();
    expect(api.get).toHaveBeenCalledWith("/google-calendar/status");
    await startGoogleCalendarConnection("/profile?tab=settings");
    expect(api.post).toHaveBeenCalledWith("/google-calendar/auth-url", { returnTo: "/profile?tab=settings" });
    await disconnectGoogleCalendar();
    expect(api.delete).toHaveBeenCalledWith("/google-calendar");
  });

  it("returns server messages through one failure envelope", async () => {
    api.put.mockRejectedValueOnce({ response: { status: 401, data: { message: "Current password is incorrect" } } });
    expect(await changeAccountPassword({ currentPassword: "wrong", newPassword: "newpass", confirmPassword: "newpass" })).toMatchObject({
      ok: false,
      status: 401,
      message: "Current password is incorrect",
    });
  });
});
