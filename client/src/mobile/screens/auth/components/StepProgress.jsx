/*
 * StepProgress — where you are in the sign-up flow.
 *
 * An <ol> rather than a decorative bar, because "step 4 of 9" is structure: a
 * screen reader should be able to hear the list, hear which item is current
 * (`aria-current="step"`, the ARIA-recommended token for exactly this), and
 * know how many remain. A styled div with a width percentage says none of that.
 *
 * The ticks are `aria-hidden` and the sentence beside them is the real content,
 * so the information is stated once rather than announced twice.
 *
 * At 320px nine ticks would be under 20px each and unreadable as anything but
 * texture — which is fine, because they ARE texture here. The name of the step
 * is what carries the meaning, and it is a heading in the panel below.
 */
export default function StepProgress({ step, total, label = "" }) {
  const safeStep = Math.min(Math.max(step, 1), total);

  return (
    <div className="ckm-signup__progress">
      <ol className="ckm-signup__ticks" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <li
            key={index}
            className={[
              "ckm-signup__tick",
              index + 1 < safeStep ? "is-done" : "",
              index + 1 === safeStep ? "is-current" : "",
            ].filter(Boolean).join(" ")}
          />
        ))}
      </ol>

      {/* aria-live so advancing a step is announced without stealing focus —
          the focus move belongs to the panel heading. */}
      <p className="ckm-signup__step-label" aria-live="polite">
        <span className="ckm-signup__step-count">Step {safeStep} of {total}</span>
        {label && <span className="ckm-signup__step-name">{label}</span>}
      </p>
    </div>
  );
}
