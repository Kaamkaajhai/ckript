/*
 * TrailerModal — the design's dark trailer overlay.
 *
 * Two behaviours the previous /featured page owned and this keeps:
 *
 *   1. Source fallback. A project can carry an AI-generated trailer, an
 *      uploaded one, or both, and `trailerSource` says which to prefer. If the
 *      preferred file 404s the modal steps to the other before giving up.
 *   2. The narrated demo. When a project has no trailer at all, the page
 *      narrates its own metadata over the speech synthesis API. That is real
 *      shipped behaviour, not a prototype flourish, so it survives the
 *      redesign — restyled onto the design's dark stage instead of the old
 *      navy gradient.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { getContentTypeLabel } from "../featuredBroadsheet";

const resolveTrailerCandidates = (script) => {
  const ai = script?.trailerUrl || "";
  const uploaded = script?.uploadedTrailerUrl || "";
  const ordered = script?.trailerSource === "uploaded" ? [uploaded, ai] : [ai, uploaded];
  return [...new Set(ordered.filter(Boolean))].map((url) => resolveMediaUrl(url)).filter(Boolean);
};

const DEMO_SECONDS = 30;

const NarratedDemo = ({ script }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const stop = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Speech keeps talking after unmount unless it is explicitly cancelled.
  useEffect(() => stop, [stop]);

  const start = () => {
    if (playing) return;
    setPlaying(true);
    setProgress(0);

    const lines = [
      script?.title,
      script?.genre ? `A ${script.genre} story` : null,
      script?.logline || script?.synopsis || script?.description || null,
      script?.pageCount ? `${script.pageCount} pages.` : null,
      "Available now on Ckript.",
    ].filter(Boolean);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(lines.join(". "));
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) => v.lang === "en-US") || voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.onend = stop;
      window.speechSynthesis.speak(utterance);
    }

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 0.1;
      setProgress(Math.min((elapsed / DEMO_SECONDS) * 100, 100));
      if (elapsed >= DEMO_SECONDS) stop();
    }, 100);
  };

  return (
    <div className="fbp-trailer__demo">
      <p className="fbp-trailer__demo-title">{script?.title}</p>
      <p className="fbp-trailer__demo-note">
        No trailer uploaded — a narrated summary is available instead.
      </p>
      {playing ? (
        <>
          <div className="fbp-trailer__wave" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${(i % 6) * 0.08}s` }} />
            ))}
          </div>
          <button type="button" className="fbp-trailer__demo-btn" onClick={stop}>
            Stop
          </button>
          <div className="fbp-trailer__demo-track" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
        </>
      ) : (
        <button type="button" className="fbp-trailer__demo-btn fbp-trailer__demo-btn--play" onClick={start}>
          <span className="fbp-icon" aria-hidden="true">play_arrow</span>
          Play 30s narrated summary
        </button>
      )}
    </div>
  );
};

const TrailerModal = ({ script, onClose, onOpenProject }) => {
  const candidates = resolveTrailerCandidates(script);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const playbackUrl = candidates[Math.min(index, Math.max(candidates.length - 1, 0))] || "";

  /*
   * No effect resets `index`/`failed` when the project changes — the page keys
   * this component on the script id, so a different project mounts a fresh
   * modal with fresh source state.
   */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setFailed(true);
  };

  const subtitle = [script?.genre, script?.contentType ? getContentTypeLabel(script.contentType) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fbp-overlay fbp-overlay--dark"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fbp-trailer" role="dialog" aria-modal="true" aria-label="Trailer preview">
        <div className="fbp-trailer__head">
          <div>
            <div className="fbp-trailer__eyebrow">TRAILER PREVIEW</div>
            <div className="fbp-trailer__title">{script?.title}</div>
          </div>
          <button type="button" className="fbp-trailer__close" onClick={onClose} aria-label="Close trailer">
            <span className="fbp-icon" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="fbp-trailer__stage">
          {playbackUrl && !failed ? (
            <video
              key={playbackUrl}
              src={playbackUrl}
              controls
              controlsList="nodownload"
              autoPlay
              playsInline
              preload="metadata"
              onError={handleError}
              className="fbp-trailer__video"
            />
          ) : (
            <NarratedDemo script={script} />
          )}
        </div>

        <div className="fbp-trailer__foot">
          <div className="fbp-trailer__meta">{subtitle}</div>
          <button type="button" className="fbp-trailer__open" onClick={onOpenProject}>
            Open project
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;
