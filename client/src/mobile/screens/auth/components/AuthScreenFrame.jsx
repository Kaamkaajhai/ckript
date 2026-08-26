import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import IconButton from "../../../components/buttons/IconButton";
import { ensureAuthFonts } from "../authChrome";

/*
 * AuthScreenFrame — the one dark surface in an otherwise light app.
 *
 * The five account-entry screens share a shape, and putting it here rather than
 * in each of them is what keeps the family reading as one place rather than
 * five that happen to look similar:
 *
 *   • the editorial lockup (Baskervville display over PT Serif) that carries
 *     the brand across from the desktop auth surfaces without carrying across
 *     their photo column — on a 390px screen with a keyboard raised, a picture
 *     costs a third of the usable height to say what the words already say;
 *   • ONE <h1> per screen, wired to the region by aria-labelledby;
 *   • a close affordance that goes somewhere the visitor chose, never `-1` into
 *     whatever happened to be behind;
 *   • a footer slot for the one "or do this instead" line each screen has.
 *
 * `art` is the exception the design allows: a full-bleed still behind a scrim,
 * used by the role chooser alone, because that is the one screen that is a
 * choice rather than a form and has no keyboard competing for the space.
 */
export default function AuthScreenFrame({
  eyebrow = "",
  title,
  lede = "",
  closeTo = "/",
  closeLabel = "Close",
  onClose = null,
  art = null,
  footer = null,
  banner = null,
  children,
  className = "",
}) {
  const titleId = useId();
  const headingRef = useRef(null);

  useEffect(() => { ensureAuthFonts(); }, []);

  /*
   * Move focus to the heading when the screen's title changes.
   *
   * These screens replace each other inside one route (sign in -> verify) and
   * one route replaces another with the same chrome (sign in -> role chooser),
   * so a screen reader is otherwise never told the surface changed and a
   * keyboard user is left at whatever offset the last control had.
   * `preventScroll` keeps the focus from nudging the viewport under a raised
   * keyboard, and `tabIndex={-1}` makes the heading focusable without adding a
   * tab stop nobody wants.
   */
  useEffect(() => {
    const node = headingRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
  }, [title]);

  return (
    <section
      className={["ckm-auth", art ? "ckm-auth--art" : "", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      {art && (
        <div className="ckm-auth__art" aria-hidden="true">
          <img src={art.src} alt="" loading="eager" draggable={false} />
          <span className="ckm-auth__scrim" />
        </div>
      )}

      <div className="ckm-auth__bar">
        {onClose
          ? <IconButton icon="close" label={closeLabel} onClick={onClose} className="ckm-auth__close" />
          : (
            <Link to={closeTo} className="ckm-auth__close-link" aria-label={closeLabel}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </Link>
          )}
      </div>

      <header className="ckm-auth__head">
        {eyebrow && <p className="ckm-auth__eyebrow">{eyebrow}</p>}
        <h1 className="ckm-auth__title" id={titleId} ref={headingRef} tabIndex={-1}>{title}</h1>
        {lede && <p className="ckm-auth__lede">{lede}</p>}
        <span className="ckm-auth__rule" aria-hidden="true" />
      </header>

      {banner}

      <div className="ckm-auth__body">{children}</div>

      {footer && <footer className="ckm-auth__foot">{footer}</footer>}
    </section>
  );
}
