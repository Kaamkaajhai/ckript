import { useMemo, useState } from "react";
import { diff_match_patch } from "diff-match-patch";
import api from "../../services/api";

const dmp = new diff_match_patch();

export default function DiffViewer({
  scriptId,
  revision,
  originalContent = "",
  currentContent = "",
  onReviewed,
  onClose,
  fullscreen = false,
  readOnly = false,
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const proposedContent = String(revision?.content || "");
  const mergedPreview = useMemo(() => {
    const base = String(revision?.baseContent || "");
    const current = String(currentContent || originalContent || "");
    const proposed = proposedContent;

    if (!base) return proposed;

    const patches = dmp.patch_make(base, proposed);
    const [mergedContent] = dmp.patch_apply(patches, current);
    return String(mergedContent || "");
  }, [currentContent, originalContent, proposedContent, revision?.baseContent]);

  const submitReview = async (decision) => {
    if (decision === "rejected" && !note.trim()) return;
    try {
      setSubmitting(true);
      await api.post(`/collab/${scriptId}/revisions/${revision._id}/review`, { decision, note });
      onReviewed?.();
    } catch (error) {
      window.alert(error?.response?.data?.error || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className={`rounded-3xl border border-gray-200 bg-white shadow-sm ${fullscreen ? "h-[min(92vh,980px)] flex flex-col overflow-hidden" : "p-5"}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Revision Diff</h3>
          <p className="text-sm text-gray-500">Section: {revision?.sectionRef}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
          >
            Close
          </button>
        ) : null}
      </div>

      <div className={`${fullscreen ? "flex-1 overflow-y-auto px-5 pb-4" : ""}`}>
        <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Received New Script</p>
          <pre className="whitespace-pre-wrap text-sm text-gray-900">{proposedContent}</pre>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Full Script Comparison</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Old Script</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{originalContent}</pre>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">New Script</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-900">{mergedPreview}</pre>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className={`${fullscreen ? "border-t border-gray-100 p-5" : "mt-4"}`}>
        {!readOnly ? (
          <>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Review note (required for rejection)"
              rows={4}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
            />
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => submitReview("rejected")}
                disabled={submitting || !note.trim()}
                className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              Reject with note
            </button>
            <button
              onClick={() => submitReview("approved")}
              disabled={submitting}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                Approve
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm p-4 sm:p-6">
        <div className="mx-auto h-full max-w-7xl">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
