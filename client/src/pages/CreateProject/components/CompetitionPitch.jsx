import { useState } from "react";
import { useCreateProject } from "../CreateProjectContext";

/* -- Logline & synopsis, for competition mode ------------------------------
   Both fields already exist on the draft: Step 2 · Details owns the inputs and usePayloads sends
   `logline` / `synopsis` with every autosave. Competition mode hides the whole publish wizard —
   rail, mobile stepper and Next/Back all go — so Step 2 became unreachable and a challenge entry
   had no way to carry a writer-authored pitch at all.

   So this surfaces those same two fields and nothing else from that panel. It is a closed
   disclosure rather than a form on purpose: someone racing a 48-hour clock should open the editor
   and see the page. Both fields stay optional, and they reuse Step 2's own label/input classes so
   this is the same control in a second place, not a look-alike of it. */

const CompetitionPitch = () => {
  const { canEditContent, dark, formData, handleChange } = useCreateProject();
  const [open, setOpen] = useState(false);

  const logline = formData.logline || "";
  const synopsis = formData.synopsis || "";
  const filled = Boolean(logline.trim() || synopsis.trim());

  const border = dark ? "#262626" : "#f0f0f0";
  const muted = dark ? "#8a8a8a" : "#767676";

  return (
    <div style={{ flex: "none", borderBottom: `1px solid ${border}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: "7px", width: "100%",
          padding: "7px 16px", border: "none", background: "transparent",
          color: muted, fontFamily: "inherit", fontSize: "11.5px", cursor: "pointer", textAlign: "left",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "16px", flex: "none" }}>
          {open ? "expand_less" : "expand_more"}
        </span>
        <span style={{ fontWeight: 600, color: dark ? "#d0d0d0" : "#3a352e" }}>Logline &amp; synopsis</span>
        <span style={{ color: "#b3b3b3" }}>{filled ? "· Added" : "· Optional"}</span>
      </button>

      {open ? (
        <div style={{ maxWidth: "852px", padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p className="ckcp-card-p" style={{ margin: 0 }}>
            Your entry is judged on the script. These just travel with it — write them in your own
            words, or leave them empty.
          </p>

          <div>
            <div className="ckcp-label">
              <span>Logline <span className="ckcp-opt">Optional · {logline.length}/500</span></span>
            </div>
            <textarea
              name="logline"
              value={logline}
              onChange={handleChange}
              disabled={!canEditContent}
              rows={2}
              maxLength={500}
              placeholder="A one-sentence summary of your story…"
              className="ckcp-input"
            />
          </div>

          <div>
            <div className="ckcp-label">
              <span>Synopsis <span className="ckcp-opt">Optional · one paragraph</span></span>
            </div>
            {/* No maxLength, matching Step 2 — a writer arriving with an existing draft must not
                have their longer synopsis silently clipped by opening this. */}
            <textarea
              name="synopsis"
              value={synopsis}
              onChange={handleChange}
              disabled={!canEditContent}
              rows={4}
              placeholder="A short paragraph on what happens…"
              className="ckcp-input"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CompetitionPitch;
