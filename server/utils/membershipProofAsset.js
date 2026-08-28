export const MEMBERSHIP_PROOF_DELIVERY_TYPE = "authenticated";

const FORMAT_BY_MIME_TYPE = Object.freeze({
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

const ASSET_URL_PATTERN = /\/(image|video|raw)\/(upload|private|authenticated)\//i;

const formatFromUrl = (value = "") => {
  try {
    const pathname = new URL(String(value)).pathname;
    return pathname.match(/\.([a-z0-9]{2,8})$/i)?.[1]?.toLowerCase() || "";
  } catch {
    return "";
  }
};

export function describeMembershipProofAsset(entry = {}) {
  const proofUrl = String(entry?.proofUrl || "").trim();
  const [, resourceType = "", deliveryType = ""] = proofUrl.match(ASSET_URL_PATTERN) || [];
  const mimeType = String(entry?.proofMimeType || "").trim().toLowerCase();

  return {
    publicId: String(entry?.proofPublicId || "").trim(),
    fallbackUrl: proofUrl,
    format: FORMAT_BY_MIME_TYPE[mimeType] || formatFromUrl(proofUrl) || "pdf",
    resourceType: resourceType.toLowerCase() || (mimeType === "application/pdf" ? "raw" : "image"),
    deliveryType: deliveryType.toLowerCase() || "upload",
  };
}

export const hasMembershipProofAsset = (entry = {}) => {
  const asset = describeMembershipProofAsset(entry);
  return Boolean(asset.publicId || asset.fallbackUrl);
};
