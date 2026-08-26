import { describe, expect, it } from "vitest";
import {
  accountStepNumber,
  AUTH_ROLES,
  clampStep,
  findRole,
  isRetryable,
  isValidEmail,
  isValidHttpUrl,
  isValidPassword,
  isValidPhone,
  isValidUsername,
  passwordChecklist,
  normalizeReferral,
  readRefusal,
  refusalField,
  REFUSAL,
  resolveRole,
  stepCount,
  stepsForRole,
} from "./authModel";

/*
 * The rules in authModel are mirrors of rules in
 * server/controllers/authController.js. These tests pin the mirror to the
 * original — a drift here is a phone that refuses something the server accepts
 * (or worse, accepts something the server refuses and finds out a round trip
 * later), so the cases below are taken from the server's own branches.
 */

describe("role catalogue", () => {
  it("maps the product's name for a role to the server's enum value", () => {
    // The two differ for two of three, which is the reason this table exists.
    expect(findRole("writer").role).toBe("creator");
    expect(findRole("producer").role).toBe("investor");
    expect(findRole("industry").role).toBe("professional");
  });

  it("resolves a role from either name, and from the aliases in old links", () => {
    expect(findRole("creator").key).toBe("writer");
    expect(findRole("investor").key).toBe("producer");
    expect(findRole("director").key).toBe("producer");
    expect(findRole("professional").key).toBe("industry");
    expect(findRole("PRODUCER-DIRECTOR").key).toBe("producer");
  });

  it("falls back to the writer flow rather than erroring on an unknown ?as=", () => {
    // A stale link is far likelier than an attack, and a dead end helps nobody.
    expect(resolveRole("astronaut").key).toBe("writer");
    expect(resolveRole("").key).toBe("writer");
    expect(resolveRole(undefined).key).toBe("writer");
  });

  it("does not offer reader or actor — scoped out of D59 deliberately", () => {
    const keys = AUTH_ROLES.map((role) => role.key);
    expect(keys).toEqual(["writer", "producer", "industry"]);
  });
});

describe("steps", () => {
  it("gives every role the same first three steps", () => {
    const shared = ["name", "contact", "password"];
    for (const role of AUTH_ROLES) {
      expect(stepsForRole(role.key).slice(0, 3).map((step) => step.id)).toEqual(shared);
    }
  });

  it("creates the account at step 3 for every role", () => {
    for (const role of AUTH_ROLES) {
      expect(accountStepNumber(role.key)).toBe(3);
      expect(stepsForRole(role.key)[2].createsAccount).toBe(true);
    }
  });

  it("marks exactly one step as the one that creates the account", () => {
    for (const role of AUTH_ROLES) {
      const creating = stepsForRole(role.key).filter((step) => step.createsAccount);
      expect(creating).toHaveLength(1);
    }
  });

  it("ends every role on the terms step", () => {
    for (const role of AUTH_ROLES) {
      const steps = stepsForRole(role.key);
      expect(steps[steps.length - 1].id).toBe("terms");
    }
  });

  it("gives each role its own length", () => {
    expect(stepCount("writer")).toBe(9);
    expect(stepCount("producer")).toBe(8);
    expect(stepCount("industry")).toBe(7);
  });
});

describe("clampStep", () => {
  /* `?step=` is user-editable and arrives from history and deep links, so this
     is the only place that should decide what a nonsense value means. */
  it("holds a step inside the role's range", () => {
    expect(clampStep("0", "writer")).toBe(1);
    expect(clampStep("-4", "writer")).toBe(1);
    expect(clampStep("99", "writer")).toBe(9);
    expect(clampStep("99", "industry")).toBe(7);
  });

  it("treats an unparseable step as the first one", () => {
    expect(clampStep("banana", "writer")).toBe(1);
    expect(clampStep(null, "writer")).toBe(1);
    expect(clampStep(undefined, "writer")).toBe(1);
  });

  it("keeps a valid step", () => {
    expect(clampStep("5", "writer")).toBe(5);
  });
});

describe("password rules mirror the server", () => {
  it("requires all five of the server's conditions", () => {
    // Each of these breaks exactly one rule in `isValidPassword`.
    expect(isValidPassword("Aa1!aaaa")).toBe(true);
    expect(isValidPassword("Aa1!aa")).toBe(false);       // too short
    expect(isValidPassword("aa1!aaaa")).toBe(false);     // no uppercase
    expect(isValidPassword("AA1!AAAA")).toBe(false);     // no lowercase
    expect(isValidPassword("Aaa!aaaa")).toBe(false);     // no number
    expect(isValidPassword("Aa1aaaaa")).toBe(false);     // no symbol
  });

  it("reports every outstanding rule at once, not one at a time", () => {
    // The server names one rule per refusal; showing all five is the whole
    // reason the checklist exists.
    const checklist = passwordChecklist("aa");
    expect(checklist).toHaveLength(5);
    expect(checklist.filter((rule) => rule.met).map((rule) => rule.id)).toEqual(["lowercase"]);
  });
});

describe("field validators", () => {
  it("accepts and rejects emails on the server's bounds", () => {
    expect(isValidEmail("writer@ckript.com")).toBe(true);
    expect(isValidEmail("  Writer@Ckript.com ")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);          // no TLD
    expect(isValidEmail(`${"a".repeat(250)}@b.com`)).toBe(false); // over 254
  });

  it("matches the username pattern both controllers enforce", () => {
    expect(isValidUsername("mira_98")).toBe(true);
    expect(isValidUsername("ab")).toBe(false);         // under 3
    expect(isValidUsername("mira-98")).toBe(false);    // hyphen
    expect(isValidUsername("mira 98")).toBe(false);    // space
    expect(isValidUsername("a".repeat(31))).toBe(false);
  });

  it("accepts a typed capital, because the server lowercases before matching", () => {
    // `join` runs normalizeInputValue(username).toLowerCase() and THEN tests
    // USERNAME_PATTERN, so "Mira" is a valid input that is stored as "mira".
    // Refusing it here would be stricter than the server for no reason — the
    // username field lowercases as the person types, so they never see the
    // difference either way.
    expect(isValidUsername("Mira")).toBe(true);
    expect(isValidUsername("  MIRA_98  ")).toBe(true);
  });

  it("accepts the phone shapes the onboarding modals accept", () => {
    expect(isValidPhone("+91 98765 43210")).toBe(true);
    expect(isValidPhone("(020) 7946-0958")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("treats an empty optional link as valid and a broken one as not", () => {
    expect(isValidHttpUrl("")).toBe(true);
    expect(isValidHttpUrl("ckript.com")).toBe(true);    // scheme is inferred
    expect(isValidHttpUrl("https://ckript.com/x")).toBe(true);
    expect(isValidHttpUrl("not a url")).toBe(false);
    expect(isValidHttpUrl("http://localhost")).toBe(false); // no dot in host
  });

  it("normalises a referral the way the server and AuthContext do", () => {
    expect(normalizeReferral("  ABC123 ")).toBe("ABC123");
    // These arrive when a missing value was stringified into a URL.
    expect(normalizeReferral("null")).toBe("");
    expect(normalizeReferral("undefined")).toBe("");
    expect(normalizeReferral("x".repeat(60))).toHaveLength(40);
  });
});

describe("readRefusal", () => {
  it("reads a flag before a message, because a flag survives a copy-edit", () => {
    const refusal = readRefusal({
      response: { status: 403, data: { accountFrozen: true, message: "Locked", frozenReason: "Chargeback" } },
    });
    expect(refusal.code).toBe(REFUSAL.ACCOUNT_FROZEN);
    expect(refusal.frozenReason).toBe("Chargeback");
  });

  it("recognises a verification requirement from BOTH shapes it arrives in", () => {
    // /auth/login sends it as a 403 error; /auth/join sends it on a 200 body.
    const fromError = readRefusal({
      response: { status: 403, data: { requiresVerification: true, email: "a@b.com", otpExpirySeconds: 300 } },
    });
    const fromBody = readRefusal({ requiresVerification: true, email: "a@b.com", resendCooldownSeconds: 30 });

    expect(fromError.code).toBe(REFUSAL.NEEDS_VERIFICATION);
    expect(fromError.otpExpirySeconds).toBe(300);
    expect(fromBody.code).toBe(REFUSAL.NEEDS_VERIFICATION);
    expect(fromBody.resendCooldownSeconds).toBe(30);
  });

  it("classifies a network failure rather than calling it a server error", () => {
    const refusal = readRefusal({ code: "ERR_NETWORK" });
    expect(refusal.code).toBe(REFUSAL.OFFLINE);
    expect(refusal.message).toMatch(/connection/i);
  });

  it("falls back to the server's own wording for a refusal it cannot classify", () => {
    const refusal = readRefusal({ response: { status: 400, data: { message: "Something specific" } } });
    expect(refusal.code).toBe(REFUSAL.UNKNOWN);
    expect(refusal.message).toBe("Something specific");
  });

  it("reads the message-only refusals the server sends with no flag", () => {
    const cases = [
      ["Referral already used for this email.", REFUSAL.REFERRAL_USED],
      ["Invalid referral code or username", REFUSAL.REFERRAL_INVALID],
      ["Invalid admin access code", REFUSAL.ADMIN_CODE],
      ["Invalid email or password", REFUSAL.INVALID_CREDENTIALS],
      ["Password must contain at least one number", REFUSAL.WEAK_PASSWORD],
    ];
    for (const [message, code] of cases) {
      expect(readRefusal({ response: { status: 400, data: { message } } }).code).toBe(code);
    }
  });

  it("reports nothing to refuse for a clean success", () => {
    expect(readRefusal(null).code).toBe(REFUSAL.NONE);
    expect(readRefusal({ status: 200, data: { token: "t" } }).code).toBe(REFUSAL.NONE);
  });

  it("treats a 5xx as the server's fault and offers a retry", () => {
    const refusal = readRefusal({ response: { status: 502, data: {} } });
    expect(refusal.code).toBe(REFUSAL.SERVER);
    expect(isRetryable(refusal.code)).toBe(true);
  });

  it("does not offer a retry for a refusal that will not change", () => {
    // Retrying a frozen or deleted account wastes the person's time.
    expect(isRetryable(REFUSAL.ACCOUNT_FROZEN)).toBe(false);
    expect(isRetryable(REFUSAL.ACCOUNT_DELETED)).toBe(false);
    expect(isRetryable(REFUSAL.INVALID_CREDENTIALS)).toBe(false);
  });
});

describe("refusalField", () => {
  it("binds a refusal to the control that caused it", () => {
    expect(refusalField(REFUSAL.INVALID_CREDENTIALS)).toBe("password");
    expect(refusalField(REFUSAL.EMAIL_IN_USE)).toBe("email");
    expect(refusalField(REFUSAL.USERNAME_TAKEN)).toBe("username");
    expect(refusalField(REFUSAL.REFERRAL_USED)).toBe("referralCode");
  });

  it("leaves a whole-form refusal unbound", () => {
    // A frozen account has no control to sit beside.
    expect(refusalField(REFUSAL.ACCOUNT_FROZEN)).toBe("");
    expect(refusalField(REFUSAL.OFFLINE)).toBe("");
  });
});
