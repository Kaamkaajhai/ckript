import { useEffect, useId } from "react";
import Diamond from "../../_shared/Diamond";
import useScrollLock from "../../../../hooks/useScrollLock";
import { PARTNERS, PARTNER_KEYS } from "./partners.data";

/* ═══════════════════════════════════════════════════════════════
   PartnerModal — detail popup for the Partners section.

   A tabbed dialog switching between the two partners. Follows the
   repo's modal conventions (see AboutModal): fixed overlay, close on
   overlay click / Esc / close button, body scroll locked through the
   shared useScrollLock hook. Enter animations are CSS keyframes
   (see Partners.css), mirroring the design handoff.
   ═══════════════════════════════════════════════════════════════ */
export default function PartnerModal({ open, activeKey, onSelect, onClose }) {
  const titleId = useId();

  useScrollLock(open);

  // Close on Esc while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const active = PARTNERS[activeKey];

  return (
    <div
      className="ckl-pm-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ckl-pm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ckl-pm-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="ckl-pm-plate">
          <img
            src={active.logo}
            alt={active.name}
            style={{ height: active.logoHeight }}
          />
        </div>

        <div className="ckl-pm-tabs">
          {PARTNER_KEYS.map((key) => {
            const isActive = key === activeKey;
            return (
              <button
                type="button"
                key={key}
                className={`ckl-pm-tab${isActive ? " ckl-pm-tab--active" : ""}`}
                onClick={() => onSelect(key)}
              >
                {PARTNERS[key].name}
              </button>
            );
          })}
        </div>

        <div className="ckl-pm-body">
          <div className="ckl-pm-kicker">
            <Diamond size={7} />
            <span>{active.tag}</span>
          </div>
          <h3 className="ckl-pm-name" id={titleId}>{active.name}</h3>
          <p className="ckl-pm-desc">{active.desc}</p>
          <p className="ckl-pm-pull">{active.pull}</p>

          <div className="ckl-pm-foot">
            <span className="ckl-pm-foot-label">A Ckript partnership</span>
            <a
              className="ckl-pm-foot-link"
              href={active.href}
              target="_blank"
              rel="noopener"
            >
              {active.site} <span className="ckl-pm-foot-arrow">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
