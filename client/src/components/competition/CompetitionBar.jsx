import { useState } from "react";
import { useCreateProject } from "../../pages/CreateProject/CreateProjectContext";
import CountdownTimer from "./CountdownTimer";
import SubmitEntryModal from "./SubmitEntryModal";
import { isCompetitionEntrySubmitted } from "./competitionSubmission";

/**
 * The competition mode header strip: which challenge, how long is left, autosave state, live counts,
 * and the Submit button.
 *
 * The countdown expiring here only disables the local UI. The server decides whether a submission is
 * in time (endsAt + a 60s grace), so a writer whose clock is slightly off is never wrongly refused
 * by their own browser — nor wrongly let through.
 */
export default function CompetitionBar() {
  const {
    competition, competitionEntry, competitionServerNow, refreshCompetition,
    dark, saving, saved, lastSaved, wordCount, charCount, screenplayOutline, setCanEditContent,
    handleSave,
  } = useCreateProject();

  const [showSubmit, setShowSubmit] = useState(false);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!competition) return null;

  const sceneCount = (screenplayOutline || []).filter((item) => item.type === "scene").length;
  const alreadySubmitted = submitted || isCompetitionEntrySubmitted(competitionEntry);
  const hasContent = charCount > 0 || wordCount > 0;
  const canSubmit = !alreadySubmitted && hasContent;

  const border = dark ? "#262626" : "#f0f0f0";
  const muted = dark ? "#8a8a8a" : "#767676";
  const strong = dark ? "#f2f2f2" : "#111111";

  const handleSubmitted = () => {
    setSubmitted(true);
    // The script is locked server-side now; take the editor read-only so the writer isn't typing
    // into something that can no longer be saved.
    setCanEditContent?.(false);
    refreshCompetition?.();
  };

  return (
    <>
      <div
        style={{
          flex: "none", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap",
          padding: "10px 16px", borderBottom: `1px solid ${border}`,
          background: dark ? "#141414" : "#fafafa",
        }}
      >
        <span
          style={{
            flex: "none", padding: "4px 10px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700,
            background: "rgba(209,77,55,0.12)", color: "#D14D37", whiteSpace: "nowrap",
          }}
        >
          {competition.name}
        </span>

        {!alreadySubmitted && competition.dates?.endsAt ? (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", flex: "none" }}>
            <span style={{ fontSize: "11.5px", color: muted }}>{expired ? "Time's up —" : "Time left"}</span>
            {expired ? (
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#D14D37" }}>submit now</span>
            ) : (
              <CountdownTimer
                target={competition.dates.endsAt}
                serverNow={competitionServerNow}
                size="sm"
                onExpire={() => { setExpired(true); refreshCompetition?.(); }}
              />
            )}
          </span>
        ) : null}

        <span style={{ flex: "1 1 auto", minWidth: "8px" }} />

        <span style={{ display: "flex", alignItems: "center", gap: "10px", flex: "none", fontSize: "11.5px", color: muted, whiteSpace: "nowrap" }}>
          <span><strong style={{ color: strong }}>{wordCount || 0}</strong> words</span>
          <span><strong style={{ color: strong }}>{sceneCount}</strong> scenes</span>
          <span><strong style={{ color: strong }}>{charCount || 0}</strong> chars</span>
        </span>

        <span style={{ flex: "none", fontSize: "11.5px", color: muted, whiteSpace: "nowrap", minWidth: "72px" }}>
          {saving ? "Saving…" : saved ? `Saved${lastSaved ? ` ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}` : ""}
        </span>

        {alreadySubmitted ? (
          <span style={{ flex: "none", padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, background: "rgba(16,185,129,0.12)", color: "#059669" }}>
            Submitted
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            disabled={!canSubmit}
            title={!hasContent ? "Write your script before submitting" : undefined}
            style={{
              flex: "none", height: "34px", padding: "0 18px", border: "none", borderRadius: "9px",
              background: canSubmit ? "#D14D37" : (dark ? "#2a2a2a" : "#e4e4e4"),
              color: canSubmit ? "#fff" : (dark ? "#5c5c5c" : "#a0a0a0"),
              fontFamily: "inherit", fontWeight: 700, fontSize: "12.5px",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            Submit Script
          </button>
        )}
      </div>

      {showSubmit ? (
        <SubmitEntryModal
          competitionId={competition._id}
          competitionName={competition.name}
          competitionSlug={competition.slug}
          serverNow={competitionServerNow}
          // A manual save, awaited, so the snapshot the server freezes includes the writer's very
          // last keystrokes rather than whatever the throttled autosave happened to have sent.
          flushDraft={() => handleSave(false)}
          onClose={() => setShowSubmit(false)}
          onSubmitted={handleSubmitted}
        />
      ) : null}
    </>
  );
}
