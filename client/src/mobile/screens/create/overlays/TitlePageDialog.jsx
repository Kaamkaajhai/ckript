import { useState } from "react";
import { TITLE_PAGE_FIELDS } from "../../../../components/screenplay/classify";
import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import Button from "../../../components/buttons/Button";
import TextField from "../../../components/forms/TextField";
import Dialog from "../../../components/overlays/Dialog";

/*
 * TitlePageDialog — the industry-standard title block (surface: ckm-dialog).
 *
 * Title, credit ("Written by"), author, source ("Based on…") and draft date,
 * stored as structured data and rendered by the PDF and Fountain exports — never
 * mixed into the editor body, which is what keeps the Fountain classifier clean.
 * `TITLE_PAGE_FIELDS` is imported from the screenplay module rather than
 * re-listed, so a sixth field added there appears here without anyone
 * remembering to add it.
 *
 * SEEDED ONCE, ON OPEN. The fields are local state until Save, because a title
 * page half-typed and then cancelled must not have changed the project. The
 * dialog is remounted on each open (`key`), which is why lazy initial state is
 * the right place to seed and no effect is needed — the same technique the
 * desktop modal uses, and for the same reason.
 *
 * The live preview is kept from desktop. It is the only way to see what the
 * exported sheet will look like, and it is the reason "Credit" and "Author" are
 * not obviously the same field.
 *
 * `saveTitlePage` comes from the orchestrator rather than being re-derived here:
 * an all-blank set of fields must become `null` (no title page), not an empty
 * one, and two chromes deciding that separately is how one of them starts
 * exporting a blank sheet.
 */
export default function TitlePageDialog() {
  const {
    showTitlePageModal, setShowTitlePageModal, titlePage, title, saveTitlePage,
  } = useCreateProject();

  return showTitlePageModal ? (
    <TitlePageForm
      initial={titlePage}
      defaultTitle={title}
      onSave={saveTitlePage}
      onClose={() => setShowTitlePageModal(false)}
    />
  ) : null;
}

function TitlePageForm({ initial, defaultTitle, onSave, onClose }) {
  const [fields, setFields] = useState(() => {
    const seed = { ...Object.fromEntries(TITLE_PAGE_FIELDS.map((field) => [field.key, ""])), ...(initial || {}) };
    if (!String(seed.title || "").trim() && defaultTitle) seed.title = defaultTitle;
    if (!String(seed.credit || "").trim()) seed.credit = "Written by";
    return seed;
  });

  const set = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog
      open
      onClose={onClose}
      title="Title page"
      description="Printed on the first page of every export."
      className="ckm-create-project__titlepage"
      footer={(
        <div className="ckm-create-project__titlepage-actions">
          {/* Removing is destructive but trivially undone — the fields are still
              typed in and Save puts them back — so it is a text action, not a
              red fill, and it sits away from Save rather than beside it. */}
          <Button
            variant="tertiary"
            onClick={() => { onSave(null); onClose(); }}
          >
            Remove title page
          </Button>
          <Button onClick={() => { onSave(fields); onClose(); }}>Save</Button>
        </div>
      )}
    >
      {/* The preview is a picture of the output, so it is `aria-hidden` and the
          fields below carry the same information as labelled controls. Reading
          "TITLE, Written by, Arshad Rahman" twice adds nothing. */}
      <div className="ckm-create-project__titlepage-preview" aria-hidden="true">
        <p className="ckm-create-project__titlepage-title">{fields.title?.trim() || "TITLE"}</p>
        {fields.credit?.trim() && <p className="ckm-create-project__titlepage-credit">{fields.credit}</p>}
        {fields.author?.trim() && <p className="ckm-create-project__titlepage-author">{fields.author}</p>}
        {fields.source?.trim() && <p className="ckm-create-project__titlepage-source">{fields.source}</p>}
        {fields.draftDate?.trim() && <p className="ckm-create-project__titlepage-date">{fields.draftDate}</p>}
      </div>

      {TITLE_PAGE_FIELDS.map((field) => (
        <TextField
          key={field.key}
          label={field.label}
          value={fields[field.key] || ""}
          placeholder={field.placeholder || ""}
          onChange={(event) => set(field.key, event.target.value)}
        />
      ))}
    </Dialog>
  );
}
