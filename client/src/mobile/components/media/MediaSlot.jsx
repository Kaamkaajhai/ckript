import { useRef } from "react";
import Button from "../buttons/Button";
import Card, { CardBody } from "../cards/Card";
import formatFileSize from "../forms/formatFileSize";
import Icon from "../Icon";
import "./Media.css";

/*
 * MediaSlot — one attachable asset: cover, trailer or pitch video
 * (prefix: ckm-media).
 *
 * Shared by `/create-project` and `/upload`. It was written for the wizard on
 * 2026-08-09 and promoted out of `screens/create/panels/` the same day (decision
 * D12) when the upload flow needed the identical three slots: the two routes ask
 * a writer for the same three files against the same three ceilings, and two
 * copies of that control is how one of them ends up with a different size limit
 * in its hint than the other enforces.
 *
 * The transformation §4.3 asked for, in one component. Desktop draws each of
 * these as a dashed drag-and-drop zone; a touch screen has nothing to drag a
 * file *from*, so the zone is a tap target that opens the platform picker —
 * which on a phone is also the camera roll and the camera itself. MDN is
 * explicit that this is what `accept="image/*"` buys you.
 *
 * Not `FilePicker` from the form family, and the reason is worth stating rather
 * than looking like an oversight: FilePicker lists chosen files as filename +
 * size rows. That is right for a script attachment and wrong for a cover, where
 * the whole question the writer is answering is "does this image look good?" —
 * so this slot shows the image, or a playable video, at the size it can.
 *
 * The <input> is visually hidden but never `display: none` and never removed: it
 * is the thing that is focused and labelled. What is drawn is a <label> for it,
 * which is why the whole card is a tap target without any JS click forwarding.
 */
export default function MediaSlot({
  label,
  icon = "image",
  hint = "",
  accept = undefined,
  file = null,
  previewUrl = "",
  previewKind = "image",
  meta = "",
  optional = true,
  onSelect = null,
  onRemove = null,
  actions = [],
  secondary = null,
  disabled = false,
  /*
   * A real upload figure, or null. `{ percent, status, resumed? }` where status is
   * "uploading" | "done" | "failed" | "cancelled" — the shape `uploadMediaForScript` reports
   * through axios's `onUploadProgress` (D14). Null means nothing is in flight,
   * which is every moment before Submit.
   */
  progress = null,
  children = null,
}) {
  const inputRef = useRef(null);
  const inputId = `ckm-media-${String(label).replace(/\s+/g, "-").toLowerCase()}`;

  const handleChange = (event) => {
    const chosen = event.target.files?.[0];
    // Cleared unconditionally so re-picking the *same* file always fires change.
    // MDN now documents `change` as firing on a re-pick, but this also clears a
    // stale FileList after a failed upload — which is exactly when someone
    // re-picks the file they just chose.
    event.target.value = "";
    if (chosen) onSelect?.(chosen);
  };

  return (
    <Card className="ckm-media">
      <CardBody className="ckm-media__body">
        <div className="ckm-media__head">
          <p className="ckm-media__eyebrow">{label}</p>
          {optional && <span className="ckm-media__flag">Optional</span>}
        </div>

        {/*
          * The `aria-label` is not belt-and-braces, and the five-width sweep of
          * 2026-08-09 is what proved it: in the EMPTY state this input is named
          * by the `<label for>` beside it, but once a file is attached that
          * label is gone — the card shows the asset and a Replace button that
          * clicks the input from JS — so the input became a silent focus stop.
          * No earlier sweep caught it because no earlier fixture rendered a slot
          * with a file in it.
          */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="ckm-media__input"
          accept={accept}
          disabled={disabled}
          aria-label={file ? `Replace ${String(label).toLowerCase()}` : `Choose ${String(label).toLowerCase()}`}
          onChange={handleChange}
        />

        {!file ? (
          <div className="ckm-media__choices">
            <label className="ckm-media__drop" htmlFor={inputId}>
              <Icon name={icon} size={26} className="ckm-media__drop-icon" />
              <span className="ckm-media__drop-title">Choose {String(label).toLowerCase()}</span>
              {hint && <span className="ckm-media__drop-hint">{hint}</span>}
            </label>

            {secondary && (
              <button
                type="button"
                className="ckm-media__drop ckm-media__drop--alt"
                disabled={disabled || secondary.disabled}
                onClick={secondary.onSelect}
              >
                <Icon name={secondary.icon || "auto_awesome"} size={26} className="ckm-media__drop-icon" />
                <span className="ckm-media__drop-title">{secondary.label}</span>
                {secondary.hint && <span className="ckm-media__drop-hint">{secondary.hint}</span>}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="ckm-media__preview">
              {previewKind === "video" ? (
                /* `preload="metadata"` and no autoplay: this is a phone, and
                   fetching a 250 MB trailer to draw a poster frame is somebody's
                   data allowance. */
                /* Named, because `controls` makes it a real focus stop and a
                   <video> has no text of its own — found by the real-key walk
                   of 2026-08-09, in the attached state. */
                <video
                  src={previewUrl}
                  controls
                  preload="metadata"
                  aria-label={`${label} preview`}
                  className="ckm-media__video"
                />
              ) : (
                <img
                  src={previewUrl}
                  /* The filename is already announced in the row below, and the
                     cover's *content* is the thing the sighted writer is judging
                     — there is no text alternative for "does this look right".
                     Decorative, therefore, rather than a repeated filename. */
                  alt=""
                  className="ckm-media__image"
                />
              )}
            </div>

            <p className="ckm-media__meta">
              <Icon name="check_circle" size={16} className="ckm-media__tick" />
              <span className="ckm-media__name">{file.name}</span>
              <span className="ckm-media__size">
                {formatFileSize(file.size)}{meta ? ` · ${meta}` : ""}
              </span>
            </p>

            {progress && <MediaProgress label={label} {...progress} />}

            <div className="ckm-media__actions">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant="tertiary"
                  disabled={disabled || action.disabled}
                  onClick={action.onSelect}
                >
                  {action.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="tertiary"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              {onRemove && (
                <Button size="sm" variant="tertiary" icon="close" disabled={disabled} onClick={onRemove}>
                  Remove
                </Button>
              )}
            </div>

            {children}
          </>
        )}
      </CardBody>
    </Card>
  );
}

/*
 * The determinate bar (D14). Desktop's only upload progress was the *simulated*
 * one on step 1 — a setInterval adding 10% every 200ms and stopping at 90%
 * (DEF-9). This one reports bytes actually sent, which is what makes it honest
 * enough to be a WCAG 4.1.3 status message rather than an animation.
 *
 * `<progress>` rather than a div pair: it carries its own value semantics, so a
 * screen reader announces "62 percent" without an `aria-valuenow` of ours that
 * could drift from the width. `aria-live="polite"` sits on the *text*, not the
 * bar — announcing every one of a hundred increments is noise, and the text only
 * changes on the states that matter.
 */
export function MediaProgress({ label = "File", percent = 0, status = "uploading", resumed = false }) {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const text = status === "failed"
    ? "Upload failed"
    : status === "cancelled"
      ? "Upload cancelled"
    : status === "done"
      ? "Uploaded"
      : `${resumed ? "Resuming" : "Uploading"} ${clamped}%`;

  return (
    <div className={`ckm-media__progress ckm-media__progress--${status}`}>
      <progress
        className="ckm-media__progress-bar"
        max={100}
        value={clamped}
        aria-label={`${label} upload progress`}
      />
      <span className="ckm-media__progress-value" role="status" aria-live="polite">{text}</span>
    </div>
  );
}
