import { useEffect, useRef } from "react";
import { useToast } from "../../components/feedback/toastContext";

/*
 * useUploadToasts — re-raises the upload orchestrator's transient messages
 * through the mobile toast layer.
 *
 * `pages/ScriptUpload.jsx` raises messages by setting `toastMessage`, and
 * `ScriptUploadWorkspace` draws them as a `position: fixed` card in the top
 * right. On a phone that lands on the app bar's overflow control — and the
 * message most often raised is a validation refusal, which arrives at exactly
 * the moment a writer is reaching for the footer. So `nativeChrome` suppresses
 * the desktop card and this forwards the message instead.
 *
 * Suppressing without forwarding would silently swallow every plan-limit
 * refusal, every AI-quota warning, every extraction failure and every media
 * error. One surface, app-wide, is what §13 requires — never two competing
 * transient surfaces — and the toast layer sits above the router, so a message
 * raised here survives the navigation that a successful submit performs.
 *
 * TONE MAPPING. The orchestrator's vocabulary is `error | warning | success`,
 * which the toast layer carries directly; anything else falls to `info` rather
 * than being guessed at.
 *
 * ACTIONS SURVIVE. `showToast` can attach one (`{ label, onClick }`) — "Review
 * field" on a validation refusal, "Pricing Plan" on the AI-cover gate — and
 * dropping it would leave a message that names a fix with no way to take it.
 */

const TONE = Object.freeze({ error: "error", warning: "warning", success: "success", info: "info" });

export default function useUploadToasts(vm) {
  const toastMessage = vm?.state?.toastMessage || null;
  const dismiss = vm?.actions?.dismissToast;
  const toast = useToast();
  const seenRef = useRef(null);

  useEffect(() => {
    if (!toastMessage) {
      seenRef.current = null;
      return;
    }
    // The orchestrator replaces the object wholesale on every raise, so identity
    // is a truthful "is this a new message?" test — and a repeat of the same
    // text (a second failed save, say) arrives as a new object and is raised
    // again, which is correct: it happened twice.
    if (seenRef.current === toastMessage) return;
    seenRef.current = toastMessage;

    toast.show({
      tone: TONE[toastMessage.type] || TONE.info,
      title: toastMessage.title || toastMessage.text,
      description: toastMessage.title ? toastMessage.text : "",
      action: toastMessage.action?.label
        ? { label: toastMessage.action.label, onAction: toastMessage.action.onClick }
        : null,
    });

    // Handed over. Clearing immediately means the orchestrator's own 5–8s timer
    // has nothing left to clear, and a later message is unambiguously new.
    dismiss?.();
  }, [toastMessage, dismiss, toast]);
}
