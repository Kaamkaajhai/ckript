import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";

/*
 * The checkout's chrome decisions, in the file that is allowed to hold them.
 *
 * `flow` is the shell mode whose intent names payment explicitly (§8.1), and the docked action bar
 * is a DECLARED slot override for the same reason the upload flow's is: the shell's slots are
 * `flex: none` siblings of the one scroll surface, so the bar displaces the last row of the page
 * instead of covering it. A `position: fixed` bar of our own would sit on top of the final
 * acceptance checkbox — the row a buyer is reaching for when they reach the bottom of this screen.
 *
 * `assertShellSlotOverride` requires the override to be a named exported constant rather than an
 * object literal in JSX, so the exception is greppable.
 */
export const CHECKOUT_SHELL_MODE = MOBILE_SHELL_MODE.FLOW;

export const CHECKOUT_SHELL_SLOTS = Object.freeze({ bottomNav: true });

/**
 * Hand a PDF to the viewer.
 *
 * An anchor with `download`, not `window.open`: an in-app browser — the one a buyer arrives in
 * when they follow the approval notification from a mail client — frequently refuses a popup, and
 * always refuses one opened later than the gesture that asked for it. The object URL is revoked on
 * a later tick, after the click has been dispatched and before the blob can be leaked.
 */
export const saveBlob = (blob, filename) => {
  if (!blob || typeof document === "undefined") return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};
