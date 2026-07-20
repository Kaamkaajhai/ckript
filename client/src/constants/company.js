// Statutory corporate details — the single source of truth.
//
// These strings are legal disclosures (entity name, CIN, registered office) and appear on the
// landing footer plus the policy/terms pages. Keep them here so a correction lands everywhere at
// once rather than drifting between copies.

export const COMPANY = {
  legalName: "CKRIPT PRIVATE LIMITED",
  cin: "U62099DL2026PTC468691",
  registeredOffice:
    "SUIT-D, 400-A, 4th Floor, 12 Ajit Singh House, Yusuf Sarai Commercial Complex, New Delhi - 110016, India",
  // Must be an inbox that is actually monitored — see SUPPORT_EMAIL in server/.env.
  supportEmail: "support@ckript.com",
  description:
    "Ckript is an AI-powered platform for script discovery, trailer generation, and film funding.",
};

export const COPYRIGHT_LINE = `© 2026 ${COMPANY.legalName}. All rights reserved.`;
