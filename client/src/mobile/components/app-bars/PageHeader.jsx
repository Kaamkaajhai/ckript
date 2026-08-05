import BackButton from "../navigation/BackButton";
import "./PageHeader.css";

/*
 * PageHeader — the app bar for every screen that is not the dashboard
 * (prefix: ckm-page-header). It goes in MobileShell's `appBar` slot; it is
 * never rendered inside the scroll body, because the shell owns chrome.
 *
 * Composition, not configuration: `actions` takes IconButtons so a screen can
 * put what it needs there, while the bar itself guarantees the parts that must
 * not vary — one <h1> per screen, a back affordance that honours §8.3, and a
 * title that wraps to two lines instead of pushing the actions off a 320px
 * screen.
 *
 * The title is left-aligned rather than centred: Ckript's type is editorial,
 * and a centred title cannot survive two actions plus a long screenplay name
 * at 320px without truncating to nonsense.
 */
export default function PageHeader({
  title,
  eyebrow = "",
  subtitle = "",
  backTo = null,
  backLabel = "",
  onBack = null,
  actions = null,
  border = true,
  className = "",
  titleId = undefined,
  ...rest
}) {
  const showBack = Boolean(backTo || onBack);

  const classes = [
    "ckm-page-header",
    border ? "" : "ckm-page-header--flush",
    className,
  ].filter(Boolean).join(" ");

  return (
    <header className={classes} {...rest}>
      <div className="ckm-page-header__bar">
        {showBack && (
          <BackButton
            to={backTo || "/"}
            label={backLabel}
            onBack={onBack}
            className="ckm-page-header__back"
          />
        )}

        <div className="ckm-page-header__titles">
          {eyebrow && <p className="ckm-page-header__eyebrow">{eyebrow}</p>}
          {/* `title` attribute keeps the full string reachable when a very long
              one clamps to two lines (plan §7.3: truncation is a decision). */}
          <h1 className="ckm-page-header__title" id={titleId} title={typeof title === "string" ? title : undefined}>
            {title}
          </h1>
          {subtitle && <p className="ckm-page-header__subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="ckm-page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
