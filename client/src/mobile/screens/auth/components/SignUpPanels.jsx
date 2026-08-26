import { Link } from "react-router-dom";
import Checkbox from "../../../components/forms/Checkbox";
import ChipSelect from "../../../components/forms/ChipSelect";
import SelectField from "../../../components/forms/SelectField";
import TextArea from "../../../components/forms/TextArea";
import TextField from "../../../components/forms/TextField";
import InlineMessage from "../../../components/feedback/InlineMessage";
import PasswordField from "./PasswordField";
import { INDUSTRY_SUB_ROLES, MAX_STORY_TAGS } from "../authModel";
import {
  FORMAT_OPTIONS,
  GENDER_OPTIONS,
  GENRE_OPTIONS,
  GUILDS,
  LINK_FIELDS,
  NATIONALITY_OPTIONS,
  REPRESENTATION_OPTIONS,
  TAG_OPTIONS,
} from "../authOptions";
import { PRIVACY_ROUTE, TERMS_ROUTE } from "../useMobileSignUp";

/*
 * SignUpPanels — one panel per step id, for every role.
 *
 * Extracted from the screen because §6 asks route screens to stay
 * orchestration-focused, and because this is the part that is genuinely
 * per-role: the orchestrator handles the URL, the shell, the footer and the
 * OTP detour identically for all three, and only what goes inside the panel
 * differs.
 *
 * Panels are keyed by step id, so a role's step list (authModel.stepsForRole)
 * is the only thing that decides which appear and in what order. Adding a role
 * means a row in the catalogue and a step list — not a branch in here.
 *
 * Every panel is a plain fragment of fields. It owns no submit button and no
 * navigation: the docked footer does that, once, for every step, so the primary
 * action cannot end up in two places or move between steps.
 */

function UsernameStatus({ status }) {
  if (!status?.message) return null;
  const tone = {
    available: "ckm-signup__status--ok",
    unavailable: "ckm-signup__status--bad",
    invalid: "ckm-signup__status--bad",
  }[status.state] || "";
  return (
    /* Polite rather than assertive: this updates while someone is typing, and
       an assertive region would interrupt them on every keystroke. */
    <p className={["ckm-signup__status", tone].filter(Boolean).join(" ")} aria-live="polite">
      {status.state === "available" && <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>}
      {(status.state === "unavailable" || status.state === "invalid")
        && <span className="material-symbols-outlined" aria-hidden="true">error</span>}
      {status.message}
    </p>
  );
}

export default function SignUpPanels({ flow }) {
  const { current, role, account, setAccount, profile, setProfile, setLink, setDemographic, errors } = flow;

  const setAccountField = (name) => (event) => {
    const { value } = event.target;
    setAccount((prev) => ({ ...prev, [name]: value }));
  };
  const setProfileField = (name) => (event) => {
    const { value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  switch (current.id) {
    case "name":
      return (
        <TextField
          label="Your name"
          purpose="name"
          required
          autoFocus
          hint="However you want to be credited."
          value={account.name}
          error={errors.name}
          onChange={setAccountField("name")}
        />
      );

    case "contact":
      return (
        <>
          <TextField
            label="Email"
            purpose="email"
            required
            hint="Your verification code goes here."
            value={account.email}
            error={errors.email}
            onChange={setAccountField("email")}
          />
          <TextField
            label="Phone"
            purpose="tel"
            required
            hint="Used to secure your account, never shown on your profile."
            value={account.phone}
            error={errors.phone}
            onChange={setAccountField("phone")}
          />
          <TextField
            label="Referral code"
            optional
            hint="If someone invited you, their code goes here."
            value={account.referralCode}
            error={errors.referralCode}
            onChange={setAccountField("referralCode")}
          />
          <UsernameStatus status={flow.referralStatus} />
        </>
      );

    case "password":
      return (
        <>
          <PasswordField
            label="Password"
            autoComplete="new-password"
            showRequirements
            required
            value={account.password}
            error={errors.password}
            onChange={setAccountField("password")}
          />
          {/* Stated before the button, not after: the next tap creates a real
              account and sends an email, and that is worth knowing first. */}
          <p className="ckm-signup__note">
            Tapping below creates your account and emails you a 6-digit code.
          </p>
        </>
      );

    case "username":
      return (
        <>
          <TextField
            label="Username"
            purpose="text"
            required
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            hint="ckript.com/your-username. Lowercase letters, numbers and underscores."
            value={profile.username}
            error={errors.username}
            onChange={(event) => setProfile((prev) => ({
              ...prev,
              username: event.target.value.toLowerCase().replace(/\s+/g, ""),
            }))}
          />
          <UsernameStatus status={flow.usernameStatus} />
        </>
      );

    case "about":
      return (
        <>
          <TextArea
            label="Short bio"
            optional
            rows={4}
            maxLength={600}
            hint="A few lines producers will read first."
            value={profile.bio}
            onChange={setProfileField("bio")}
          />
          <SelectField
            label="Representation"
            options={REPRESENTATION_OPTIONS}
            value={profile.representationStatus}
            onChange={setProfileField("representationStatus")}
          />

          {/* Required by the server, so asked for plainly and explained rather
              than slipped in. Both lists include "Prefer not to say", and this
              is the one part of the form the draft never writes to storage. */}
          <SelectField
            label="Gender"
            required
            placeholder="Choose one"
            options={GENDER_OPTIONS.map((value) => ({ value, label: value }))}
            value={profile.diversity.gender}
            error={errors.gender}
            onChange={(event) => setDemographic("gender", event.target.value)}
          />
          <SelectField
            label="Nationality"
            required
            placeholder="Choose one"
            hint="Used for competition eligibility and the diversity reporting writers can opt out of below."
            options={NATIONALITY_OPTIONS.map((value) => ({ value, label: value }))}
            value={profile.diversity.nationality}
            error={errors.nationality}
            onChange={(event) => setDemographic("nationality", event.target.value)}
          />
          <Checkbox
            label="Let producers find me through diversity filters"
            description="Turn this off and your answers are stored but never used to surface you in a search."
            checked={profile.demographicPrivacy === "searchable"}
            onChange={(event) => setProfile((prev) => ({
              ...prev,
              demographicPrivacy: event.target.checked ? "searchable" : "private",
            }))}
          />
        </>
      );

    case "guilds":
      return (
        <>
          <p className="ckm-signup__note">
            Optional. Tick a guild and our team will verify it before the badge appears —
            you can add proof later from your profile.
          </p>
          {GUILDS.map((guild) => (
            <Checkbox
              key={guild.key}
              label={`${guild.title} member`}
              description={guild.detail}
              checked={Boolean(profile[guild.key])}
              onChange={(event) => setProfile((prev) => ({ ...prev, [guild.key]: event.target.checked }))}
            />
          ))}
        </>
      );

    case "links":
      return (
        <>
          {LINK_FIELDS.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              purpose={field.purpose}
              optional
              value={profile.links[field.name]}
              onChange={(event) => setLink(field.name, event.target.value)}
            />
          ))}
          {errors.links && <InlineMessage tone="error">{errors.links}</InlineMessage>}
        </>
      );

    case "identity":
      return (
        <>
          <TextField
            label="Company"
            required
            hint="The studio, agency or production house you work with."
            value={profile.company}
            error={errors.company}
            onChange={setProfileField("company")}
          />
          <TextField
            label="Your title"
            optional
            value={profile.jobTitle}
            onChange={setProfileField("jobTitle")}
          />
          {role.key === "industry" && (
            <SelectField
              label="What do you do there?"
              required
              placeholder="Choose one"
              options={INDUSTRY_SUB_ROLES.map((value) => ({ value, label: value }))}
              value={profile.subRole}
              error={errors.subRole}
              onChange={setProfileField("subRole")}
            />
          )}
          <TextArea
            label="Short bio"
            optional
            rows={3}
            maxLength={600}
            value={profile.bio}
            onChange={setProfileField("bio")}
          />
          <TextField
            label="LinkedIn"
            purpose="url"
            optional
            value={profile.links.linkedin}
            onChange={(event) => setLink("linkedin", event.target.value)}
          />
          <TextField
            label="IMDb"
            purpose="url"
            optional
            value={profile.links.imdb}
            onChange={(event) => setLink("imdb", event.target.value)}
          />
          {errors.links && <InlineMessage tone="error">{errors.links}</InlineMessage>}
        </>
      );

    case "credits":
      return (
        <TextArea
          label="Notable credits"
          optional
          rows={5}
          maxLength={1200}
          hint="Titles, roles and years. One per line is fine."
          value={profile.previousCredits}
          onChange={setProfileField("previousCredits")}
        />
      );

    case "tags":
      return (
        <>
          <ChipSelect
            label="Genres you write"
            multiple
            required
            options={GENRE_OPTIONS.map((value) => ({ value, label: value }))}
            value={flow.genres}
            error={errors.genres}
            onChange={flow.setGenres}
          />
          <ChipSelect
            label="Story tags"
            multiple
            optional
            max={MAX_STORY_TAGS}
            hint={`Up to ${MAX_STORY_TAGS}. These help the right producers find you.`}
            options={TAG_OPTIONS.map((value) => ({ value, label: value }))}
            value={flow.tags}
            error={errors.tags}
            onChange={flow.setTags}
          />
        </>
      );

    case "discover":
      return (
        <>
          <ChipSelect
            label="Formats you're looking for"
            multiple
            optional
            options={FORMAT_OPTIONS}
            value={flow.formats}
            onChange={flow.setFormats}
          />
          <ChipSelect
            label="Genres you're looking for"
            multiple
            optional
            hint="Shapes what we surface first. You can change it any time."
            options={GENRE_OPTIONS.map((value) => ({ value, label: value }))}
            value={flow.genres}
            onChange={flow.setGenres}
          />
        </>
      );

    case "terms":
      return (
        <>
          <Checkbox
            label="I accept the Terms & Conditions"
            error={errors.agreeTerms}
            checked={flow.agreeTerms}
            onChange={(event) => flow.setAgreeTerms(event.target.checked)}
          />
          <p className="ckm-signup__legal">
            <Link to={TERMS_ROUTE[role.key]} target="_blank" rel="noopener noreferrer">
              Read the Terms &amp; Conditions
            </Link>
          </p>

          <Checkbox
            label="I accept the Privacy Policy"
            error={errors.agreePrivacy}
            checked={flow.agreePrivacy}
            onChange={(event) => flow.setAgreePrivacy(event.target.checked)}
          />
          <p className="ckm-signup__legal">
            <Link to={PRIVACY_ROUTE} target="_blank" rel="noopener noreferrer">
              Read the Privacy Policy
            </Link>
          </p>
        </>
      );

    default:
      /* Not reachable through the step lists, and deliberately not a crash: an
         edited URL should never be able to blank the screen. */
      return (
        <InlineMessage tone="warning" variant="panel" title="That step doesn't exist">
          Use Back to return to the previous step.
        </InlineMessage>
      );
  }
}
