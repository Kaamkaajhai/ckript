import { useEffect, useMemo, useRef, useState } from "react";
import useVersionHistory, { lineDiff } from "../../../../components/screenplay/useVersionHistory";
import Button from "../../../components/buttons/Button";
import EmptyState from "../../../components/EmptyState";
import InlineMessage from "../../../components/feedback/InlineMessage";
import TextField from "../../../components/forms/TextField";
import Dialog from "../../../components/overlays/Dialog";
import SkeletonGroup, { SkeletonRows } from "../../../components/feedback/Skeletons";
import {
  buildVersionRows,
  describeDiff,
  describeRestore,
  describeSaveVersion,
} from "../versionsModel";

/*
 * VersionsDialog — the desktop version-history modal, rebuilt (decision D19).
 *
 * A DIALOG, and this one barely needed the D15 test: the desktop surface is
 * already a full-screen modal with a scrim. What it is NOT is accessible —
 * `VersionHistoryModal` is a bare `fixed inset-0` div with no `role="dialog"`,
 * no focus trap, no Escape and no labelled title, the same shape as the
 * title-page modal the third session replaced. `ckm-dialog` supplies all four.
 *
 * TWO THINGS CHANGED SHAPE FOR TOUCH
 * ----------------------------------
 * 1. THE DIFF IS A SECOND VIEW, NOT AN INLINE EXPANDER. Desktop opens the diff
 *    inside the list row, in its own `max-h-64 overflow-auto` box — a scroller,
 *    inside a row, inside the modal's scroller. Three nested scroll surfaces is
 *    the trap §5.5 names, and on a phone the row would be mostly diff. So the
 *    list pushes to a diff view and the dialog's title changes with it.
 *    Because the list no longer shows diffs, each row carries a one-line
 *    summary instead ("14 lines added since, 3 removed") — otherwise "which of
 *    these six do I want?" could only be answered by opening all six.
 *
 * 2. RESTORE ASKS (D19). It replaces the whole draft from a small button next
 *    to another small button. It IS recoverable — the server snapshots today's
 *    text first — but that is stated in an 11px line at the bottom of the
 *    desktop modal, below the fold. The confirmation moves it to the moment it
 *    matters, and it reads as an explanation rather than a warning, because the
 *    safety net is what makes "yes" an easy, informed answer.
 */
export default function VersionsDialog({
  open = false,
  onClose = null,
  scriptId = null,
  currentText = "",
  onRestored = null,
  returnFocusTo = null,
}) {
  const [label, setLabel] = useState("");
  const [diffId, setDiffId] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);

  /*
   * Leaving the diff view — by the Back button or by Escape, which the Dialog
   * routes here rather than closing outright — must put focus back on the row
   * control that opened it. Without this a keyboard user is returned to the
   * list with focus on the dialog container and no idea which of six versions
   * they were just looking at. The row is re-rendered by then, so the anchor is
   * a data attribute rather than a ref, the same way the corkboard restores
   * focus after a reorder.
   */
  const returnToRowRef = useRef(null);
  const listRef = useRef(null);
  useEffect(() => {
    if (diffId || !returnToRowRef.current) return;
    const id = returnToRowRef.current;
    returnToRowRef.current = null;
    listRef.current?.querySelector(`[data-version-diff="${id}"]`)?.focus();
  }, [diffId]);

  const history = useVersionHistory({ scriptId, open, currentText, onRestored });
  const rows = buildVersionRows(history.versions, { restoringId: history.restoringId });
  const saveState = describeSaveVersion({ scriptId, saving: history.saving });

  /* Every row's summary needs a diff, so they are computed together and only
     when the list changes — not per row on every keystroke behind the dialog. */
  const summaries = useMemo(() => {
    const map = new Map();
    for (const row of rows) map.set(row.id, describeDiff(lineDiff(row.snapshot, currentText)));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.versions, currentText]);

  const diffRow = rows.find((row) => row.id === diffId) || null;
  const diffRows = useMemo(
    () => (diffRow ? lineDiff(diffRow.snapshot, currentText) : null),
    [diffRow, currentText],
  );

  const leaveDiff = (id) => { returnToRowRef.current = id; setDiffId(null); };

  const restore = async (row) => {
    const state = describeRestore({ row, confirming: confirmRestore === row.id });
    if (!state.confirming) { setConfirmRestore(row.id); return; }
    setConfirmRestore(null);
    const ok = await history.restore(row.id);
    if (ok) { returnToRowRef.current = null; setDiffId(null); onClose?.(); }
  };

  return (
    <Dialog
      open={open}
      onClose={diffRow ? () => leaveDiff(diffRow.id) : onClose}
      title={diffRow ? diffRow.title : "Version history"}
      description={diffRow
        ? "Lines this version would add or remove, compared with your current draft."
        : "Snapshots of this script. Restoring one keeps your current draft too."}
      closeLabel={diffRow ? "Back to the version list" : "Close version history"}
      returnFocusTo={returnFocusTo}
      className="ckm-editor__versions"
    >
      {history.error && (
        <InlineMessage tone="error" variant="panel">{history.error}</InlineMessage>
      )}

      {diffRow ? (
        <div className="ckm-editor__versions-diff">
          {diffRows && diffRows.length ? (
            <ol className="ckm-editor__diff">
              {diffRows.map((line, index) => (
                <li
                  key={`${index}-${line.op}`}
                  className={`ckm-editor__diff-line ckm-editor__diff-line--${line.op === 1 ? "add" : line.op === -1 ? "remove" : "same"}`}
                >
                  {/* The sign is announced, not left to colour alone (§14). */}
                  <span className="ckm-sr-only">
                    {line.op === 1 ? "Added: " : line.op === -1 ? "Removed: " : ""}
                  </span>
                  <span className="ckm-editor__diff-mark" aria-hidden="true">
                    {line.op === 1 ? "+" : line.op === -1 ? "−" : " "}
                  </span>
                  <span className="ckm-editor__diff-text">{line.line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon="difference" title="No differences" body="This version matches your current draft exactly." />
          )}

          <div className="ckm-editor__versions-diff-actions">
            <Button size="sm" variant="secondary" onClick={() => leaveDiff(diffRow.id)}>Back to versions</Button>
            <Button size="sm" onClick={() => restore(diffRow)}>
              {describeRestore({ row: diffRow, confirming: confirmRestore === diffRow.id }).label}
            </Button>
          </div>
          {confirmRestore === diffRow.id && (
            <p className="ckm-editor__versions-explain" role="status">
              {describeRestore({ row: diffRow, confirming: true }).explanation}
            </p>
          )}
        </div>
      ) : (
        <>
          <section className="ckm-editor__versions-save">
            <TextField
              label="Label this version"
              maxLength={80}
              value={label}
              hint="Optional — something you will recognise later, like “First draft”."
              onChange={(event) => setLabel(event.target.value)}
              disabled={!saveState.enabled && !history.saving}
            />
            <div className="ckm-editor__versions-save-actions">
              <Button
                size="sm"
                onClick={async () => { const ok = await history.save(label); if (ok) setLabel(""); }}
                disabled={!saveState.enabled}
              >
                {history.saving ? "Saving…" : "Save this version"}
              </Button>
            </div>
            {saveState.reason && (
              <InlineMessage tone="info" variant="panel">{saveState.reason}</InlineMessage>
            )}
          </section>

          {history.loading ? (
            <SkeletonGroup label="Loading versions"><SkeletonRows rows={3} media={false} /></SkeletonGroup>
          ) : rows.length === 0 ? (
            <EmptyState
              icon="history"
              title="No versions yet"
              body="Save one above and it becomes a point you can always come back to."
            />
          ) : (
            <ul className="ckm-editor__versions-list" ref={listRef}>
              {rows.map((row) => (
                <li key={row.id} className="ckm-editor__version">
                  <p className="ckm-editor__version-title">{row.title}</p>
                  <p className="ckm-editor__version-meta">
                    {[row.when, row.author].filter(Boolean).join(" · ")}
                  </p>
                  <p className="ckm-editor__version-summary">{summaries.get(row.id)}</p>
                  <div className="ckm-editor__version-actions">
                    <Button
                      size="sm"
                      variant="tertiary"
                      data-version-diff={row.id}
                      onClick={() => { setDiffId(row.id); setConfirmRestore(null); }}
                    >
                      See what changed
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => restore(row)} disabled={row.restoring}>
                      {row.restoring ? "Restoring…" : describeRestore({ row, confirming: confirmRestore === row.id }).label}
                    </Button>
                  </div>
                  {confirmRestore === row.id && (
                    <p className="ckm-editor__versions-explain" role="status">
                      {describeRestore({ row, confirming: true }).explanation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Dialog>
  );
}
