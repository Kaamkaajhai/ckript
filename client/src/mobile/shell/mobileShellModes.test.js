import { describe, expect, it, vi } from "vitest";
import {
  assertShellSlotOverride,
  changedShellSlots,
  getShellModeConfig,
  MOBILE_SHELL_MODE,
  MOBILE_SHELL_SLOTS,
  resolveShellSlots,
} from "./mobileShellModes";

/*
 * The per-slot override is the shell contract's one documented exception
 * (§8.1), and an exception nobody can see is just a bug with a comment. These
 * tests pin the three properties that make it safe to have at all:
 *
 *   1. it can only change slots, never the mode's meaning;
 *   2. an override that changes nothing reports nothing, so `data-shell-slots`
 *      never claims an exception that is not one;
 *   3. a typo is loud. Silently ignoring `appbar` (lower-case b) would leave a
 *      screen with chrome it thinks it disabled.
 */

describe("resolveShellSlots", () => {
  it("returns the mode's own config when nothing is overridden", () => {
    expect(resolveShellSlots(MOBILE_SHELL_MODE.FLOW)).toBe(getShellModeConfig(MOBILE_SHELL_MODE.FLOW));
    expect(resolveShellSlots(MOBILE_SHELL_MODE.FLOW, null)).toBe(getShellModeConfig(MOBILE_SHELL_MODE.FLOW));
  });

  it("applies boolean overrides on known slots", () => {
    const resolved = resolveShellSlots(MOBILE_SHELL_MODE.IMMERSIVE, { appBar: true, bottomNav: true });
    expect(resolved.appBar).toBe(true);
    expect(resolved.bottomNav).toBe(true);
  });

  it("keeps every slot the override does not name", () => {
    const base = getShellModeConfig(MOBILE_SHELL_MODE.IMMERSIVE);
    const resolved = resolveShellSlots(MOBILE_SHELL_MODE.IMMERSIVE, { appBar: true });
    expect(resolved.bottomNav).toBe(base.bottomNav);
    expect(resolved.safeAreaTop).toBe(base.safeAreaTop);
    expect(resolved.safeAreaBottom).toBe(base.safeAreaBottom);
  });

  it("ignores non-boolean values and unknown keys", () => {
    const base = getShellModeConfig(MOBILE_SHELL_MODE.IMMERSIVE);
    const resolved = resolveShellSlots(MOBILE_SHELL_MODE.IMMERSIVE, {
      appBar: "yes",
      appbar: true,
      intent: "something else",
    });
    expect(resolved.appBar).toBe(base.appBar);
    expect(resolved.intent).toBe(base.intent);
  });

  it("never lets an override rewrite the mode's intent", () => {
    for (const mode of Object.values(MOBILE_SHELL_MODE)) {
      const resolved = resolveShellSlots(mode, { intent: "hijacked" });
      expect(resolved.intent).toBe(getShellModeConfig(mode).intent);
    }
  });
});

describe("changedShellSlots", () => {
  it("reports nothing without an override", () => {
    expect(changedShellSlots(MOBILE_SHELL_MODE.FLOW)).toEqual([]);
  });

  it("reports only the slots that actually differ from the mode", () => {
    // flow already allows an app bar, so re-asserting it is not an exception.
    expect(changedShellSlots(MOBILE_SHELL_MODE.FLOW, { appBar: true, bottomNav: true }))
      .toEqual(["bottomNav"]);
  });

  it("names both slots the editor turns back on over immersive", () => {
    expect(changedShellSlots(MOBILE_SHELL_MODE.IMMERSIVE, { appBar: true, bottomNav: true }))
      .toEqual(["appBar", "bottomNav"]);
  });
});

describe("assertShellSlotOverride", () => {
  it("says nothing about a valid override", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    assertShellSlotOverride({ appBar: true }, "create-project-editor");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("complains loudly about a slot that does not exist", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    assertShellSlotOverride({ appbar: true }, "create-project-editor");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("appbar");
    spy.mockRestore();
  });
});

describe("MOBILE_SHELL_SLOTS", () => {
  it("covers every boolean key a mode config declares", () => {
    const booleanKeys = Object.keys(getShellModeConfig(MOBILE_SHELL_MODE.STANDARD))
      .filter((key) => typeof getShellModeConfig(MOBILE_SHELL_MODE.STANDARD)[key] === "boolean");
    expect([...MOBILE_SHELL_SLOTS].sort()).toEqual(booleanKeys.sort());
  });
});
