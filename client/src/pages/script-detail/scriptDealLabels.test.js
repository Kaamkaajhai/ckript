import { describe, expect, it } from "vitest";
import {
  DEAL_ENUMS,
  MODIFICATION_LABELS,
  NEGOTIATION_LABELS,
  PAYMENT_LABELS,
  RIGHTS_TYPE_LABELS,
  RIGHTS_TYPE_SHORT_LABELS,
  UNSPECIFIED_DEAL_TERM,
  negotiationLabel,
  rightsTypeLabel,
} from "./scriptDealLabels";

const MAPS = {
  rightsType: [RIGHTS_TYPE_LABELS, RIGHTS_TYPE_SHORT_LABELS],
  modificationRights: [MODIFICATION_LABELS],
  paymentStructure: [PAYMENT_LABELS],
  negotiationMode: [NEGOTIATION_LABELS],
};

describe("the shared deal vocabulary (DEF-28)", () => {
  /*
   * This is the test the four private copies did not have.
   *
   * The defect was never a typo — it was that a closed schema enum had four copies, one of which
   * had lost `ckript_not_involved`, so a writer who chose it had their rights term shown to buyers
   * as "Not specified" on the live project page. Comparing every map against the enum list is what
   * turns the next added value into a failing test instead of a silent gap.
   */
  it.each(Object.keys(MAPS))("labels every %s value the schema accepts", (field) => {
    for (const [map] of MAPS[field].map((entry) => [entry])) {
      for (const value of DEAL_ENUMS[field]) {
        expect(map[value], `${field}: ${value}`).toBeTruthy();
        expect(map[value]).not.toBe(UNSPECIFIED_DEAL_TERM);
      }
    }
  });

  it("carries the exact value the workbench's private copy was missing", () => {
    expect(negotiationLabel("ckript_not_involved")).toBe("Ckript not involved");
  });

  it("says 'Not specified' for an unset or unknown term rather than leaking the key", () => {
    for (const value of ["", null, undefined, "something_new"]) {
      expect(negotiationLabel(value)).toBe(UNSPECIFIED_DEAL_TERM);
      expect(rightsTypeLabel(value)).toBe(UNSPECIFIED_DEAL_TERM);
    }
  });

  it("offers a short form for the surfaces that have a column, not a sentence", () => {
    expect(rightsTypeLabel("full_rights_sale")).toContain("ownership transfer");
    expect(rightsTypeLabel("full_rights_sale", { short: true })).toBe("Full rights sale");
  });

  it("has no map key that is not in the schema enum", () => {
    // Drift runs both ways: a label for a value the server will never send is dead code that
    // reads like coverage.
    for (const field of Object.keys(MAPS)) {
      for (const [map] of MAPS[field].map((entry) => [entry])) {
        expect(Object.keys(map).sort()).toEqual([...DEAL_ENUMS[field]].sort());
      }
    }
  });
});
