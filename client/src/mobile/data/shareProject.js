/*
 * shareProject — the dashboard's Share action, for real.
 *
 * This is what `desktopOnly("Sharing")` becomes. Sharing is the one dashboard
 * action a phone does *better* than a laptop: `navigator.share` opens the OS
 * sheet, with the user's actual messaging apps in it, and Safari/iOS and
 * Chrome/Android have both supported it for years.
 *
 * Three outcomes, and the caller needs to tell them apart:
 *
 *   "shared"     the OS sheet completed. It already showed its own
 *                confirmation, so a toast on top of it is noise.
 *   "dismissed"  the user backed out of the OS sheet. Cancelling is not an
 *                error and must not be reported as one — `navigator.share`
 *                rejects with an AbortError, which is the trap here.
 *   "copied"     no Web Share API, so the link went to the clipboard. The user
 *                saw no system UI, so this one does need a toast.
 *   "failed"     neither worked.
 */

const shareUrlFor = (project) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (!project?.href) return origin;
  return `${origin}${project.href}`;
};

export async function shareProject(project) {
  const url = shareUrlFor(project);
  const payload = {
    title: project?.title ? `${project.title} | Ckript` : "Ckript",
    text: project?.shareText || project?.logline || "",
    url,
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "shared";
    } catch (cause) {
      // The user closing the sheet is the common path, not a failure.
      if (cause?.name === "AbortError") return "dismissed";
      // Anything else falls through to the clipboard rather than dead-ending.
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    /* fall through */
  }

  return "failed";
}

export default shareProject;
