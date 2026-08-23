import api from "../../services/api";

export const ACCOUNT_NOTIFICATION_OPTIONS = Object.freeze([
  { key: "smartMatchAlerts", label: "Smart Match Alerts", description: "When a new script matches your mandates" },
  { key: "holdAlerts", label: "Hold Alerts", description: "Option hold status updates" },
  { key: "viewAlerts", label: "View Alerts", description: "When someone views your profile" },
]);

export const ACCOUNT_LANGUAGE_OPTIONS = Object.freeze([
  { value: "en", label: "English" }, { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" }, { value: "fr", label: "French" },
  { value: "de", label: "German" }, { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" }, { value: "zh", label: "Chinese" },
]);

export const ACCOUNT_TIMEZONE_OPTIONS = Object.freeze([
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
]);

const text = (value) => String(value ?? "").trim();
const failure = (cause, fallback) => ({
  ok: false,
  message: cause?.response?.data?.message || fallback,
  status: Number(cause?.response?.status || 0),
  cause,
});
const request = async (operation, fallback) => {
  try {
    const response = await operation();
    return { ok: true, data: response?.data };
  } catch (cause) {
    return failure(cause, fallback);
  }
};

export function validateEmailChange({ newEmail, password, currentEmail } = {}) {
  const normalizedEmail = text(newEmail).toLowerCase();
  const fieldErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) fieldErrors.newEmail = "Enter a valid email address.";
  if (normalizedEmail && normalizedEmail === text(currentEmail).toLowerCase()) fieldErrors.newEmail = "Choose a different email address.";
  if (!text(password)) fieldErrors.password = "Enter your current password.";
  return Object.keys(fieldErrors).length
    ? { ok: false, message: "Review the highlighted email fields.", fieldErrors }
    : { ok: true, data: { newEmail: normalizedEmail, password: String(password) } };
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword } = {}) {
  const fieldErrors = {};
  if (!String(currentPassword || "")) fieldErrors.currentPassword = "Enter your current password.";
  if (String(newPassword || "").length < 6) fieldErrors.newPassword = "Use at least 6 characters.";
  if (newPassword !== confirmPassword) fieldErrors.confirmPassword = "Passwords do not match.";
  return Object.keys(fieldErrors).length
    ? { ok: false, message: "Review the highlighted password fields.", fieldErrors }
    : { ok: true, data: { currentPassword: String(currentPassword), newPassword: String(newPassword) } };
}

export function validateVerificationCode(otp) {
  const normalized = text(otp);
  return /^\d{6}$/.test(normalized)
    ? { ok: true, data: normalized }
    : { ok: false, message: "Enter the 6-digit verification code.", fieldErrors: { otp: "Enter all 6 digits." } };
}

export const loadAccountSessions = () => request(
  () => api.get("/auth/sessions"),
  "Could not load active sessions.",
).then((result) => result.ok ? { ...result, data: Array.isArray(result.data) ? result.data : [] } : result);

export const updateAccountSettings = (settings) => request(
  () => api.put("/users/settings", settings),
  "Could not update account settings.",
);

export const sendAccountEmailVerification = () => request(
  () => api.post("/users/email-verification/send"),
  "Could not send the verification code.",
);

export async function verifyAccountEmail(otp) {
  const validation = validateVerificationCode(otp);
  if (!validation.ok) return validation;
  return request(
    () => api.post("/users/email-verification/verify", { otp: validation.data }),
    "Could not verify this email.",
  );
}

export async function changeAccountEmail(values, currentEmail) {
  const validation = validateEmailChange({ ...values, currentEmail });
  if (!validation.ok) return validation;
  return request(
    () => api.put("/users/change-email", validation.data),
    "Could not start the email change.",
  );
}

export async function changeAccountPassword(values) {
  const validation = validatePasswordChange(values);
  if (!validation.ok) return validation;
  return request(
    () => api.put("/users/change-password", validation.data),
    "Could not change the password.",
  );
}

export const revokeAccountSession = (sessionId) => text(sessionId)
  ? request(() => api.delete(`/auth/sessions/${encodeURIComponent(text(sessionId))}`), "Could not remove this session.")
  : Promise.resolve({ ok: false, message: "This session cannot be removed." });

export const revokeOtherAccountSessions = () => request(
  () => api.delete("/auth/sessions/all-others"),
  "Could not remove the other sessions.",
);

export const unblockAccountUser = (userId) => text(userId)
  ? request(() => api.post("/users/unblock", { userId: text(userId) }), "Could not unblock this member.")
  : Promise.resolve({ ok: false, message: "This member cannot be unblocked." });

export const deleteOwnAccount = (reason = "") => request(
  () => api.delete("/users/account", { data: { reason: text(reason) } }),
  "Could not delete the account.",
);

export const loadGoogleCalendarStatus = () => request(
  () => api.get("/google-calendar/status"),
  "Could not check Google Calendar.",
);

export const startGoogleCalendarConnection = (returnTo) => request(
  () => api.post("/google-calendar/auth-url", { returnTo: text(returnTo) }),
  "Could not start the Google Calendar connection.",
);

export const disconnectGoogleCalendar = () => request(
  () => api.delete("/google-calendar"),
  "Could not disconnect Google Calendar.",
);
