import {
  FORMAT_OPTIONS,
  MANDATE_GENRES,
  MANDATE_HOOKS,
  MANDATES_STATUS,
} from "../../../features/producer-workspace/mandatesData";
import useMandates from "../../../features/producer-workspace/useMandates";
import AppBar from "../../components/app-bars/AppBar";
import Button from "../../components/buttons/Button";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import "./MandatesMobile.css";

function ChoiceSection({ title, hint, field, choices, values, onToggle, open = false }) {
  return (
    <details className="ckm-mandates__section" open={open}>
      <summary>
        <span><strong>{title}</strong><small>{hint}</small></span>
        <em>{values.length} selected</em>
      </summary>
      <fieldset>
        <legend className="ckm-sr-only">{title}</legend>
        <div className="ckm-mandates__choices">
          {choices.map((choice) => {
            const value = typeof choice === "string" ? choice : choice.value;
            const label = typeof choice === "string" ? choice : choice.label;
            return (
              <label key={value} className={values.includes(value) ? "is-selected" : ""}>
                <input
                  type="checkbox"
                  aria-label={label}
                  checked={values.includes(value)}
                  onChange={() => onToggle(field, value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </details>
  );
}

export default function MandatesMobile({ user, previewState = null }) {
  const liveState = useMandates({ enabled: !previewState });
  const state = previewState || liveState;
  const loading = state.status === MANDATES_STATUS.IDLE || state.status === MANDATES_STATUS.LOADING;
  const saving = state.status === MANDATES_STATUS.SAVING;

  const submit = async (event) => {
    event.preventDefault();
    try { await state.save(); } catch { /* the persistent inline error owns this failure */ }
  };

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="mandates"
      className="ckm-mandates"
      scrollClassName="ckm-mandates__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={state.retry}
    >
      <header className="ckm-mandates__header">
        <p>Industry desk · matching brief</p>
        <h1>My mandate</h1>
        <span>Set the formats, genres and story signals you want the catalogue to match.</span>
      </header>

      {loading && (
        <SkeletonGroup label="Loading your mandate" className="ckm-mandates__loading">
          <SkeletonShape height={76} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={76} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={76} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={76} radius="var(--ckm-r-lg)" />
        </SkeletonGroup>
      )}

      {state.status === MANDATES_STATUS.FAILED && (
        <InlineMessage variant="panel" title="Your mandate is unavailable" onRetry={state.retry}>
          Check your connection and retry. No preferences were changed.
        </InlineMessage>
      )}

      {!loading && state.status !== MANDATES_STATUS.FAILED && (
        <form className="ckm-mandates__form" onSubmit={submit}>
          {state.saveFailure && (
            <InlineMessage title="Your changes were not saved" onRetry={state.save} retryLabel="Save again">
              The draft is still here. Check your connection and retry.
            </InlineMessage>
          )}
          {state.saved && (
            <InlineMessage tone="success" title="Mandate saved">
              New catalogue matches will use this brief.
            </InlineMessage>
          )}
          {state.dirty && !state.saved && (
            <p className="ckm-mandates__dirty" role="status">Unsaved changes</p>
          )}

          <ChoiceSection title="Formats" hint="What kind of work?" field="formats" choices={FORMAT_OPTIONS} values={state.mandates.formats} onToggle={state.toggle} open />
          <ChoiceSection title="Genres to include" hint="What should lead the search?" field="genres" choices={MANDATE_GENRES} values={state.mandates.genres} onToggle={state.toggle} />
          <ChoiceSection title="Genres to exclude" hint="What should stay out?" field="excludeGenres" choices={MANDATE_GENRES} values={state.mandates.excludeGenres} onToggle={state.toggle} />
          <ChoiceSection title="Story signals" hint="Specific qualities you want" field="specificHooks" choices={MANDATE_HOOKS} values={state.mandates.specificHooks} onToggle={state.toggle} />

          <aside className="ckm-mandates__note">
            Include and exclude choices cannot conflict. Changing one automatically clears the opposite choice.
          </aside>
          <div className="ckm-mandates__actions">
            <Button variant="secondary" fullWidth onClick={state.reset} disabled={saving || !state.mandates}>Clear brief</Button>
            <Button type="submit" fullWidth pending={saving} pendingLabel="Saving…" disabled={!state.dirty && !state.saveFailure}>Save mandate</Button>
          </div>
        </form>
      )}
    </MobileShell>
  );
}
