import { useMemo, useState } from "react";
import judgeApi from "../../services/judgeApi";
import ScreenplayReadOnly from "../../components/ScreenplayReadOnly";
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Select, Spinner, Textarea, useToast } from "../admin/ui";
import { useJudgeEntry } from "./useJudgeData";

/**
 * Reading one entry and scoring it.
 *
 * A two-pane workspace rather than a modal, deliberately: a modal cannot be lived in for the forty
 * minutes a feature-length script takes, and the score sheet has to stay visible while the judge
 * scrolls the screenplay.
 *
 * Nothing on this screen identifies the writer, and that is not enforced HERE — it is enforced by
 * the server's projection, which is the only thing that ever built this object. There is no writer
 * field to accidentally render, which is a stronger guarantee than remembering not to render one.
 */

/** Preview only. The server recomputes this from the raw marks and its own weights, and it wins. */
const previewTotal = (criteria, marks, scale) => {
  const scored = criteria.filter((c) => marks[c.key] !== undefined && marks[c.key] !== "");
  if (!scored.length) return null;
  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) > 0 ? Number(c.weight) : 0), 0);
  const weightOf = (c) => (totalWeight > 0 ? (Number(c.weight) || 0) / totalWeight : 1 / criteria.length);
  const presentWeight = scored.reduce((sum, c) => sum + weightOf(c), 0);
  if (presentWeight <= 0) return null;
  const total = scored.reduce((sum, c) => sum + (Number(marks[c.key]) / scale) * (weightOf(c) / presentWeight) * 100, 0);
  return Math.round(total * 10) / 10;
};

export default function JudgeScoreSheet({
  competitionId, entryId, rubric, judgingOpen, judgingClosedReason, dark, onSaved, onBack, position,
}) {
  const { entry, myScore, myNominations, loading, error } = useJudgeEntry(competitionId, entryId);
  const toast = useToast();

  const [marks, setMarks] = useState({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [nominations, setNominations] = useState([]);
  const [nominating, setNominating] = useState({ awardKey: "", reason: "" });

  /*
   * Adopt the server's copy whenever a DIFFERENT entry's data arrives.
   *
   * Adjusting state during render rather than in an effect — the pattern React documents for
   * "derive state from props when they change". An effect would run after this component had
   * already painted once with the previous entry's marks still in the boxes, which on a fast click
   * through the queue is long enough to see, and long enough to type into.
   *
   * Tracked by `loadedFor` rather than by comparing the payload, so re-fetching the SAME entry
   * (after a save) cannot discard edits the judge has made since.
   */
  const [loadedFor, setLoadedFor] = useState(null);
  if (myScore !== undefined && loadedFor !== entryId) {
    setLoadedFor(entryId);
    setMarks(myScore?.marks ? { ...myScore.marks } : {});
    setComment(myScore?.comment || "");
    setNominations(myNominations || []);
    setNominating({ awardKey: "", reason: "" });
  }

  // Memoised because they feed the useMemo below: `rubric?.criteria || []` allocates a new array on
  // every render, which would make the weighted-total recompute every time and defeat the memo.
  const criteria = useMemo(() => rubric?.criteria || [], [rubric]);
  const awards = useMemo(() => rubric?.awards || [], [rubric]);
  const scale = rubric?.scale || 10;
  const total = useMemo(() => previewTotal(criteria, marks, scale), [criteria, marks, scale]);
  const missing = criteria.filter((c) => marks[c.key] === undefined || marks[c.key] === "");
  const submitted = myScore?.status === "submitted";

  const save = async (submit) => {
    setSaving(true);
    try {
      await judgeApi.put(`/judge/competitions/${competitionId}/entries/${entryId}/score`, {
        marks: Object.fromEntries(
          Object.entries(marks).filter(([, v]) => v !== "" && v !== undefined).map(([k, v]) => [k, Number(v)])
        ),
        comment,
        submit,
      });
      toast.success(submit ? "Score submitted." : "Draft saved.");
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save your score.");
    } finally {
      setSaving(false);
      setConfirmSubmit(false);
    }
  };

  const saveNomination = async () => {
    if (!nominating.awardKey) return;
    try {
      await judgeApi.put(`/judge/competitions/${competitionId}/nominations/${nominating.awardKey}`, {
        entryId,
        reason: nominating.reason,
      });
      setNominations((prev) => [
        ...prev.filter((n) => n.awardKey !== nominating.awardKey),
        { awardKey: nominating.awardKey, reason: nominating.reason },
      ]);
      setNominating({ awardKey: "", reason: "" });
      toast.success("Nomination saved.");
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save your nomination.");
    }
  };

  const withdrawNomination = async (awardKey) => {
    try {
      await judgeApi.delete(`/judge/competitions/${competitionId}/nominations/${awardKey}`);
      setNominations((prev) => prev.filter((n) => n.awardKey !== awardKey));
      toast.success("Nomination withdrawn.");
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not withdraw the nomination.");
    }
  };

  if (loading) return <div className="ckjd-loading"><Spinner /></div>;
  if (error) return <EmptyState title="Could not open this entry" body={error} actionLabel="Back to queue" onAction={onBack} />;
  if (!entry) return null;

  return (
    <div className="ckjd-sheet">
      <div className="ckjd-sheet-head">
        <Button variant="ghost" onClick={onBack}>← Back to queue</Button>
        {position ? <span className="ckjd-position">{position}</span> : null}
      </div>

      <div className="ckjd-panes">
        <div className="ckjd-script">
          <div className="ckjd-script-head">
            <div>
              {/* The entry code, not a name. It is how the admin's table labels this entry too, so a
                  judge and an organiser discussing "CGSC-4F2A" mean the same script. */}
              <code className="ckjd-code">{entry.eventId}</code>
              <h2 className="ckjd-title">{entry.title || "Untitled"}</h2>
            </div>
            <div className="ckjd-counts">
              <span>{entry.pageCount || 0} pages</span>
              <span>{entry.sceneCount || 0} scenes</span>
              <span>{(entry.wordCount || 0).toLocaleString()} words</span>
            </div>
          </div>
          {entry.body
            ? <ScreenplayReadOnly text={entry.body} dark={dark} />
            : <EmptyState title="This entry has no script" body="The submission was frozen without any content." />}
        </div>

        <aside className="ckjd-form">
          <Card
            title="Your score"
            actions={submitted ? <Badge tone="success">Submitted</Badge> : myScore ? <Badge tone="warn">Draft</Badge> : null}
          >
            {!criteria.length ? (
              <EmptyState
                title="No criteria yet"
                body="The organiser has not set up scoring criteria for this competition."
              />
            ) : (
              <>
                {criteria.map((c) => (
                  <Field key={c.key} label={`${c.label}${c.weight ? ` · weight ${c.weight}` : ""}`} help={c.description}>
                    {(props) => (
                      <Input
                        {...props}
                        type="number"
                        min={0}
                        max={scale}
                        // A number field, not a slider: a judge working through forty entries types.
                        value={marks[c.key] ?? ""}
                        disabled={!judgingOpen}
                        onChange={(e) => setMarks((m) => ({ ...m, [c.key]: e.target.value }))}
                        placeholder={`0–${scale}`}
                      />
                    )}
                  </Field>
                ))}

                <div className="ckjd-total">
                  <span>Weighted total</span>
                  <strong className="ckad-num">{total === null ? "—" : `${total} / 100`}</strong>
                </div>
                {/* Said out loud because a number on screen invites trust: the server recomputes this
                    from the raw marks and its own weights, and its answer is the one that counts. */}
                <p className="ckjd-note">Preview only — the organiser's server recalculates this on submit.</p>

                <Field label="Comment" help="Only the organiser reads this. The writer never sees it.">
                  {(props) => (
                    <Textarea
                      {...props}
                      rows={5}
                      value={comment}
                      disabled={!judgingOpen}
                      maxLength={2000}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="What worked, what didn't, and why."
                    />
                  )}
                </Field>

                {!judgingOpen ? (
                  <p className="ckjd-closed">{judgingClosedReason || "Judging is closed."}</p>
                ) : (
                  <>
                    <div className="ckjd-actions">
                      <Button variant="secondary" onClick={() => save(false)} disabled={saving}>Save draft</Button>
                      <Button variant="primary" onClick={() => setConfirmSubmit(true)} disabled={saving || missing.length > 0}>
                        {submitted ? "Update score" : "Submit score"}
                      </Button>
                    </div>
                    {missing.length > 0 ? (
                      <p className="ckjd-note">Score every criterion to submit. Missing: {missing.map((c) => c.label).join(", ")}.</p>
                    ) : null}
                  </>
                )}
              </>
            )}
          </Card>

          {awards.length ? (
            <Card title="Special awards" description="Put this entry forward for a category. One nomination per category.">
              {nominations.length ? (
                <ul className="ckjd-noms">
                  {nominations.map((n) => (
                    <li key={n.awardKey}>
                      <div>
                        <strong>{awards.find((a) => a.key === n.awardKey)?.label || n.awardKey}</strong>
                        {n.reason ? <span>{n.reason}</span> : null}
                      </div>
                      {judgingOpen ? (
                        <Button variant="ghost" size="sm" onClick={() => withdrawNomination(n.awardKey)}>Withdraw</Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {judgingOpen ? (
                <>
                  <Field label="Nominate for">
                    {(props) => (
                      <Select
                        {...props}
                        value={nominating.awardKey}
                        onChange={(e) => setNominating({ awardKey: e.target.value, reason: "" })}
                      >
                        <option value="">Choose a category…</option>
                        {awards.map((a) => (
                          <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  {nominating.awardKey ? (
                    <>
                      <Field label="Why" help="Required — the organiser weighs your reasoning, not just the count.">
                        {(props) => (
                          <Textarea
                            {...props}
                            rows={3}
                            maxLength={500}
                            value={nominating.reason}
                            onChange={(e) => setNominating((n) => ({ ...n, reason: e.target.value }))}
                          />
                        )}
                      </Field>
                      <Button variant="primary" onClick={saveNomination} disabled={!nominating.reason.trim()}>Nominate</Button>
                    </>
                  ) : null}
                </>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        title={submitted ? "Update this score?" : "Submit this score?"}
        body={
          submitted
            ? "This replaces the score you already submitted for this entry."
            : `You are scoring ${entry.eventId} at ${total ?? 0} out of 100. You can update it until judging closes.`
        }
        confirmLabel={submitted ? "Update" : "Submit"}
        loading={saving}
        onConfirm={() => save(true)}
        onClose={() => setConfirmSubmit(false)}
      />
    </div>
  );
}
