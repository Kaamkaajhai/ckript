/*
 * TrailerDialog — the trailer, as a full-screen task.
 *
 * A Dialog and not a Sheet, by D15's test: what does the surface REPLACE? A
 * trailer replaces the screen — you watch it, then come back — and a video
 * behind a sheet's scrim strip would be letterboxed into the smaller half of
 * a phone for no gain.
 *
 * Both behaviours the desktop modal owns are kept, and both now come from the
 * shared `featuredTrailer` module rather than a second copy: source fallback
 * when the preferred file 404s, and the narrated summary for a project with no
 * trailer at all.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../buttons/Button";
import Dialog from "../overlays/Dialog";
import {
  NARRATION_SECONDS,
  canNarrate,
  resolveTrailerCandidates,
  speakNarration,
  trailerSubtitle,
} from "../../../features/featured-broadsheet/featuredTrailer";
import "./TrailerDialog.css";

function NarratedSummary({ project }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const cancelRef = useRef(null);

  const stop = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  // Speech keeps talking after unmount unless it is explicitly cancelled.
  useEffect(() => stop, [stop]);

  const start = () => {
    if (playing) return;
    setPlaying(true);
    setProgress(0);
    cancelRef.current = speakNarration(project, { onEnd: stop });

    let elapsed = 0;
    timerRef.current = setInterval(() => {
      elapsed += 0.1;
      setProgress(Math.min((elapsed / NARRATION_SECONDS) * 100, 100));
      if (elapsed >= NARRATION_SECONDS) stop();
    }, 100);
  };

  return (
    <div className="ckm-trailer__summary">
      <p className="ckm-trailer__summary-note">
        {canNarrate()
          ? "No trailer was uploaded for this project. A narrated summary is available instead."
          : "No trailer was uploaded for this project, and this browser cannot read the summary aloud."}
      </p>
      {canNarrate() && (
        <>
          <Button
            variant={playing ? "secondary" : "primary"}
            icon={playing ? "stop" : "play_arrow"}
            onClick={playing ? stop : start}
          >
            {playing ? "Stop" : `Play ${NARRATION_SECONDS}s narrated summary`}
          </Button>
          {playing && (
            <div
              className="ckm-trailer__track"
              role="progressbar"
              aria-label="Narrated summary progress"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TrailerDialog({ open, project, onClose }) {
  const candidates = resolveTrailerCandidates(project);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const playbackUrl = candidates[Math.min(index, Math.max(candidates.length - 1, 0))] || "";

  /*
   * No effect resets `index`/`failed` when the project changes — the screen
   * keys this component on the project id, so a different project mounts a
   * fresh dialog with fresh source state.
   */
  const handleError = () => {
    if (index < candidates.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setFailed(true);
  };

  if (!project) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project.title || "Trailer"}
      description={trailerSubtitle(project) || "Trailer preview"}
      bodyClassName="ckm-trailer__body"
    >
      {playbackUrl && !failed ? (
        <video
          key={playbackUrl}
          src={playbackUrl}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          onError={handleError}
          className="ckm-trailer__video"
          aria-label={`Trailer for ${project.title || "this project"}`}
        />
      ) : (
        <NarratedSummary project={project} />
      )}
    </Dialog>
  );
}
