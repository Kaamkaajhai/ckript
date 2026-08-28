import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";

export const CHALLENGE_REGISTRATION_SHELL_MODE = MOBILE_SHELL_MODE.FLOW;
export const CHALLENGE_REGISTRATION_SHELL_SLOTS = Object.freeze({ bottomNav: true });

export const saveRegistrationInvoice = (blob, invoiceNumber = "invoice") => {
  if (!blob || typeof document === "undefined") return false;
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNumber || "invoice"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};
