import { Link } from "react-router-dom";
import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import {
  genres, toneOptions, themeOptions, settingOptions,
  CP_FILM_LANGUAGE_OPTIONS, LEGAL_AGREEMENT, SCRIPT_UPLOAD_TERMS_VERSION,
} from "../../../../pages/CreateProject/constants";
import { normalizeRightsLicensingState } from "../../../../pages/CreateProject/lib/rights";
import Checkbox from "../../../components/forms/Checkbox";
import ChipSelect from "../../../components/forms/ChipSelect";
import InlineMessage from "../../../components/feedback/InlineMessage";
import TextArea from "../../../components/forms/TextArea";
import TextField from "../../../components/forms/TextField";
import { PanelHead } from "./DetailsPanels";

/*
 * Steps 3, 4 and 5 as mobile panels (prefix: ckm-create-project).
 *
 * Their desktop counterparts are three files of Tailwind cards in a palette
 * (emerald / amber / blue) that belongs to no design system in this repo and
 * matches neither the mobile tokens nor the wizard the shell now draws. §2.2
 * forbids reflowing that markup onto a phone, so the *content* is ported and
 * the presentation comes from the ckm form family: every choice list that was a
 * hand-rolled pill row is a `ChipSelect`, every input is a labelled control with
 * a real error path, and the colour-coded card nesting is gone entirely.
 *
 * Nothing about what is asked, or in what order, changes. These write the same
 * state through the same setters, so `validateStep(3|4|5)` and `handlePublish`
 * are shared code.
 */

/* ───────────────────────── Step 3 · Classify ────────────────────────── */

const TAG_GROUPS = [
  { key: "tones", label: "Tones", options: toneOptions },
  { key: "themes", label: "Themes", options: themeOptions },
  { key: "settings", label: "Settings", options: settingOptions },
];

export function ClassifyPanel() {
  const { classification, formData, setFormData, toggleChip } = useCreateProject();

  return (
    <>
      <PanelHead
        title="Classification"
        blurb="How readers find your script. Genre is required; the rest sharpen the match."
      />

      <ChipSelect
        label="Primary genre"
        required
        options={genres}
        value={formData.primaryGenre}
        onChange={(value) => setFormData((prev) => ({ ...prev, primaryGenre: value }))}
      />

      {/*
        * `toggleChip` already owns the add/remove and the three-item cap, so the
        * group is driven one changed tag at a time rather than by replacing the
        * array. Two implementations of a cap is how the two platforms end up
        * disagreeing about whether four tags are allowed.
        */}
      {TAG_GROUPS.map(({ key, label, options }) => (
        <ChipSelect
          key={key}
          label={label}
          optional
          multiple
          max={3}
          options={options}
          value={classification[key]}
          onChange={(next) => {
            const before = classification[key];
            const changed = next.length > before.length
              ? next.find((value) => !before.includes(value))
              : before.find((value) => !next.includes(value));
            if (changed) toggleChip(key, changed);
          }}
        />
      ))}
    </>
  );
}

/* ───────────────────────── Step 4 · Film info ───────────────────────── */

const DIALOGUE_OPTIONS = [
  { value: "yes", label: "Full dialogue" },
  { value: "partial", label: "Some dialogue" },
  { value: "no", label: "Action only" },
];

export function FilmInfoPanel() {
  const { filmDetails, setFilmDetails } = useCreateProject();

  const setField = (field, value) => setFilmDetails((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <PanelHead
        title="Film details"
        blurb="What industry professionals need to know about your involvement. Language is required."
      />

      {/*
        * Two independent yes/no answers, so two checkboxes — not a chip pair.
        * Wanting to direct and wanting to produce are not alternatives, and the
        * desktop card pair (which looks like a segmented choice but toggles
        * independently) is the ambiguity being fixed here rather than ported.
        */}
      <fieldset className="ckm-create-project__fieldset">
        <legend className="ckm-field__label">
          <span className="ckm-field__label-text">Your creative role</span>
          <span className="ckm-field__flag ckm-field__flag--soft">Optional</span>
        </legend>
        <Checkbox
          label="I want to direct this"
          description="Shown to buyers as a directing interest"
          checked={Boolean(filmDetails.wantToDirect)}
          onChange={(event) => setField("wantToDirect", event.target.checked)}
        />
        <Checkbox
          label="I want to produce this"
          description="Shown to buyers as a producing interest"
          checked={Boolean(filmDetails.wantToProduce)}
          onChange={(event) => setField("wantToProduce", event.target.checked)}
        />
      </fieldset>

      <ChipSelect
        label="Film language"
        required
        allowClear
        options={CP_FILM_LANGUAGE_OPTIONS}
        value={filmDetails.filmLanguage || ""}
        onChange={(value) => setField("filmLanguage", value)}
      />

      {filmDetails.filmLanguage === "Other" && (
        <TextField
          label="Which language?"
          required
          maxLength={80}
          value={filmDetails.filmLanguageCustom || ""}
          onChange={(event) => setField("filmLanguageCustom", event.target.value)}
        />
      )}

      <ChipSelect
        label="Dialogue"
        optional
        options={DIALOGUE_OPTIONS}
        value={filmDetails.dialoguesPresent || ""}
        onChange={(value) => setField("dialoguesPresent", value)}
      />
    </>
  );
}

/* ────────────────────────── Step 5 · Publish ────────────────────────── */

const PRICE_PRESETS = [49, 99, 149, 199, 249];

const RIGHTS_TYPES = [
  { value: "full_rights_sale", label: "Full rights sale" },
  { value: "exclusive_license", label: "Exclusive licence" },
  { value: "custom_negotiation_required", label: "Negotiate" },
];

const MODIFICATION_RIGHTS = [
  { value: "buyer_can_modify_freely", label: "Buyer may change it freely" },
  { value: "buyer_must_consult_writer", label: "Buyer must consult me" },
  { value: "writer_retains_creative_approval_rights", label: "I approve every change" },
];

const PAYMENT_STRUCTURES = [
  { value: "one_time_upfront_payment", label: "One-time upfront" },
  { value: "lower_upfront_plus_royalty_percent", label: "Upfront + royalty" },
  { value: "revenue_sharing_model", label: "Revenue share" },
  { value: "custom_deal", label: "Custom deal" },
];

const ROYALTY_DURATIONS = [
  { value: "none", label: "None" },
  { value: "project_lifetime", label: "Project lifetime" },
  { value: "years", label: "Fixed years" },
];

const NEGOTIATION_MODES = [
  { value: "fixed_terms_non_negotiable", label: "Fixed terms" },
  { value: "open_to_discussion_after_purchase", label: "Open to offers" },
];

export function PublishPanel() {
  const {
    agreementRef, legal, rightsLicensing, scriptPrice, setLegal, setRightsLicensing, setScriptPrice,
  } = useCreateProject();

  const rights = (patch) => setRightsLicensing((prev) => normalizeRightsLicensingState({ ...prev, ...patch }));
  const royalty = rightsLicensing?.royaltySettings || {};
  const showRoyalty = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"]
    .includes(rightsLicensing?.paymentStructure);

  return (
    <>
      <PanelHead
        title="Price & terms"
        blurb="What buyers pay, what they get, and the agreement you're signing."
      />

      <ChipSelect
        label="Asking price"
        options={PRICE_PRESETS.map((price) => ({ value: String(price), label: `₹${price}` }))}
        value={String(scriptPrice ?? "")}
        onChange={(value) => setScriptPrice(Number(value) || 0)}
        hint="Tap a preset, or type your own below."
      />

      {/*
        * `purpose="decimal"` rather than type="number": a numeric keyboard
        * without the spinner, and without type="number"'s habit of throwing away
        * an intermediate edit it cannot parse. The leading-zero strip is the
        * desktop rule, kept.
        */}
      <TextField
        label="Custom price"
        purpose="decimal"
        value={String(scriptPrice ?? "")}
        icon="currency_rupee"
        onChange={(event) => {
          const normalized = String(event.target.value || "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
          setScriptPrice(Number(normalized) || 0);
        }}
        hint="What a buyer pays to unlock the full script. You can change it any time before publishing."
      />

      <InlineMessage tone="info" variant="panel" title="Before you set a price">
        Industry professionals review your preview pages and your rights terms — the full screenplay
        stays locked. If they see potential they contact you directly. Price for the value of the
        rights, not the page count.
      </InlineMessage>

      <ChipSelect
        label="Rights on offer"
        required
        options={RIGHTS_TYPES}
        value={rightsLicensing?.rightsType || "custom_negotiation_required"}
        onChange={(value) => rights({ rightsType: value })}
      />

      {rightsLicensing?.rightsType === "exclusive_license" && (
        <TextField
          label="Licence length in months"
          purpose="number"
          value={String(rightsLicensing?.timeBound?.licenseDurationMonths ?? 12)}
          onChange={(event) => setRightsLicensing((prev) => normalizeRightsLicensingState({
            ...prev,
            timeBound: { ...prev.timeBound, licenseDurationMonths: Number(event.target.value) || 0 },
          }))}
        />
      )}

      <ChipSelect
        label="Creative control"
        options={MODIFICATION_RIGHTS}
        value={rightsLicensing?.modificationRights || ""}
        onChange={(value) => rights({ modificationRights: value })}
      />

      <ChipSelect
        label="How you're paid"
        options={PAYMENT_STRUCTURES}
        value={rightsLicensing?.paymentStructure || ""}
        onChange={(value) => rights({ paymentStructure: value })}
      />

      {showRoyalty && (
        <>
          <TextField
            label="Royalty percentage"
            purpose="decimal"
            value={String(royalty.percentage ?? 0)}
            onChange={(event) => setRightsLicensing((prev) => normalizeRightsLicensingState({
              ...prev,
              royaltySettings: { ...prev.royaltySettings, percentage: Number(event.target.value) || 0 },
            }))}
          />
          <ChipSelect
            label="Royalty runs for"
            options={ROYALTY_DURATIONS}
            value={royalty.durationType || "none"}
            onChange={(value) => setRightsLicensing((prev) => normalizeRightsLicensingState({
              ...prev,
              royaltySettings: { ...prev.royaltySettings, durationType: value },
            }))}
          />
          {royalty.durationType === "years" && (
            <TextField
              label="How many years"
              purpose="number"
              value={String(royalty.durationYears ?? 1)}
              onChange={(event) => setRightsLicensing((prev) => normalizeRightsLicensingState({
                ...prev,
                royaltySettings: { ...prev.royaltySettings, durationYears: Number(event.target.value) || 0 },
              }))}
            />
          )}
        </>
      )}

      <ChipSelect
        label="Negotiation"
        options={NEGOTIATION_MODES}
        value={rightsLicensing?.negotiationMode || ""}
        onChange={(value) => rights({ negotiationMode: value })}
      />

      <TextArea
        label="Custom conditions"
        optional
        rows={4}
        value={rightsLicensing?.customConditions || ""}
        placeholder="Specific investor terms, guaranteed credit conditions…"
        onChange={(event) => rights({ customConditions: event.target.value })}
      />

      {/*
        * The agreement. Three things a writer should not have to read 4,000
        * words to learn are pulled out above it — desktop does the same, as a
        * three-column grid; here they stack, because three 100px columns at
        * 320px is three words a line.
        */}
      <section className="ckm-create-project__section" aria-labelledby="ckm-cp-agreement">
        <h3 className="ckm-create-project__section-title" id="ckm-cp-agreement">Submission agreement</h3>

        <ul className="ckm-create-project__terms">
          <li><strong>Rights.</strong> You keep ownership of your script.</li>
          <li><strong>Licence.</strong> Ckript gets a non-exclusive licence to display and promote it.</li>
          <li><strong>Refunds.</strong> Service charges are not refundable once processing starts.</li>
        </ul>

        {/*
          * `tabIndex={0}` is not decoration: a scrollable region that is not
          * focusable cannot be scrolled by a keyboard or switch user at all
          * (WCAG 2.1.1), and a 4,000-word agreement in a 240px box is the exact
          * case that rule exists for. It is named and given a role so it is
          * announced as a region rather than as loose text.
          */}
        <div
          ref={agreementRef}
          className="ckm-create-project__agreement"
          tabIndex={0}
          role="region"
          aria-label="Submission agreement, full text"
        >
          <pre className="ckm-create-project__agreement-text">{LEGAL_AGREEMENT}</pre>
        </div>

        <p className="ckm-create-project__note">
          <Link to="/script-upload-terms" target="_blank" rel="noopener noreferrer">
            Open the full Script Upload Terms
          </Link>
          {" "}in a new tab.
        </p>

        <Checkbox
          label={`I agree to the Script Upload Terms (v${SCRIPT_UPLOAD_TERMS_VERSION})`}
          description="And I confirm I own or control the rights to this script."
          checked={Boolean(legal.agreedToTerms)}
          onChange={(event) => setLegal((prev) => ({ ...prev, agreedToTerms: event.target.checked }))}
        />

        <Checkbox
          label="I am the sole creator, or I own the IP outright"
          checked={Boolean(rightsLicensing?.legalAcknowledgement?.ownershipConfirmed)}
          onChange={(event) => setRightsLicensing((prev) => normalizeRightsLicensingState({
            ...prev,
            legalAcknowledgement: { ...prev.legalAcknowledgement, ownershipConfirmed: event.target.checked },
          }))}
        />
      </section>
    </>
  );
}
