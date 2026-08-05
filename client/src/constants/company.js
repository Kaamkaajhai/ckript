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
  // Three addresses, split by ROLE — mirrors server/utils/companyContacts.js, which stamps the same
  // set into every outgoing email. Pick by what the reader is writing ABOUT, not by which key is
  // nearest: a stuck user wants `supportEmail`, a partnership wants `contactEmail`, and anything
  // speaking for the company itself (footer, legal pages, invoices) uses `email`.
  // Each must be an inbox that is actually monitored — see the matching keys in server/.env.
  email: "info@ckript.com",
  supportEmail: "support@ckript.com",
  contactEmail: "contact@ckript.com",
  website: "https://ckript.com",
  description:
    "Ckript is an AI-powered platform for script discovery, trailer generation, and film funding.",
};

export const COPYRIGHT_LINE = `© 2026 ${COMPANY.legalName}. All rights reserved.`;
