import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MEMBERSHIP_PROOF_DELIVERY_TYPE,
  describeMembershipProofAsset,
  hasMembershipProofAsset,
} from "./membershipProofAsset.js";

describe("membership proof asset access", () => {
  test("describes authenticated image proofs for signed delivery", () => {
    assert.deepEqual(describeMembershipProofAsset({
      proofUrl: "https://res.cloudinary.com/demo/image/authenticated/v1/membership/card.png",
      proofPublicId: "membership/card",
      proofMimeType: "image/png",
    }), {
      publicId: "membership/card",
      fallbackUrl: "https://res.cloudinary.com/demo/image/authenticated/v1/membership/card.png",
      format: "png",
      resourceType: "image",
      deliveryType: MEMBERSHIP_PROOF_DELIVERY_TYPE,
    });
  });

  test("keeps legacy upload metadata explicit without inventing an asset", () => {
    assert.deepEqual(describeMembershipProofAsset({
      proofUrl: "https://res.cloudinary.com/demo/raw/upload/v1/membership/card.pdf",
      proofMimeType: "application/pdf",
    }), {
      publicId: "",
      fallbackUrl: "https://res.cloudinary.com/demo/raw/upload/v1/membership/card.pdf",
      format: "pdf",
      resourceType: "raw",
      deliveryType: "upload",
    });
    assert.equal(hasMembershipProofAsset({ proofFileName: "metadata-only.pdf" }), false);
  });
});
