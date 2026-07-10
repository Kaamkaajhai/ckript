import { useState } from "react";
import Diamond from "../../_shared/Diamond";
import PartnerModal from "./PartnerModal";
import { PARTNERS, PARTNER_KEYS } from "./partners.data";
import "./Partners.css";

/* ═══════════════════════════════════════════════════════════════
   Partners — "The company we keep."

   Two production partners (Sceneway Films, SHAIKE) presented as
   logo-plate cards on a white canvas, with a single CTA that opens a
   detail modal (PartnerModal) tabbed between the two.

   Ported from the "Partnership Section.dc.html" handoff. The card's
   inline pt-fadeUp animation is dropped in favour of the shared
   reveal system (data-ra / data-rd), matching the sibling sections.
   ═══════════════════════════════════════════════════════════════ */
export default function Partners() {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState("sceneway");

  const openModal = (key = "sceneway") => {
    setActiveKey(key);
    setOpen(true);
  };

  return (
    <section className="ckl-partners">
      <div className="ckl-partners-inner">
        <div className="ckl-partners-head" data-ra="ckl-fadeUp">
          <div className="ckl-partners-eyebrow">
            <Diamond size={6} />
            <span>In Partnership With</span>
            <Diamond size={6} />
          </div>
          <h2 className="ckl-partners-title">
            The company <span className="ckl-h2-em">we keep.</span>
          </h2>
          <p className="ckl-partners-sub">
            Great scripts deserve great partners. We build alongside the studios
            and networks turning stories into the work that reaches the screen.
          </p>
        </div>

        <div className="ckl-partners-grid">
          {PARTNER_KEYS.map((key, i) => {
            const p = PARTNERS[key];
            return (
              <button
                type="button"
                key={key}
                className="ckl-partners-card"
                data-ra="ckl-fadeUp"
                data-rd={`0.${i + 1}`}
                onClick={() => openModal(key)}
                aria-label={`Learn more about ${p.name}`}
              >
                <div className="ckl-partners-plate">
                  <img
                    src={p.logo}
                    alt={p.name}
                    style={{
                      maxHeight: p.cardLogo.maxHeight,
                      maxWidth: p.cardLogo.maxWidth,
                    }}
                  />
                  <span
                    className="ckl-partners-accent"
                    style={{ background: p.accent }}
                  />
                </div>
                <div className="ckl-partners-meta">
                  <div className="ckl-partners-kicker">{p.kicker}</div>
                  <h3 className="ckl-partners-name">{p.name}</h3>
                </div>
              </button>
            );
          })}
        </div>

        <div className="ckl-partners-cta" data-ra="ckl-fadeUp" data-rd="0.3">
          <button
            type="button"
            className="ckl-partners-btn hov-btn-lift"
            onClick={() => openModal("sceneway")}
          >
            Get to know more <span className="ckl-partners-btn-arrow">→</span>
          </button>
          <p className="ckl-partners-foot">
            Two partners. One shared belief, taste over volume, craft over hype.
          </p>
        </div>
      </div>

      <PartnerModal
        open={open}
        activeKey={activeKey}
        onSelect={setActiveKey}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
