import { Link } from "react-router-dom";
import { useAuthModal } from "../../../../context/AuthModalContext";
import { LOGO_FOOTER_SRC } from "../../_shared/theme";
import { COMPANY, COPYRIGHT_LINE } from "../../../../constants/company";
import { FOOTER_COLS } from "./footer.data";
import "./Footer.css";

export default function Footer() {
  const { openProducerOnboarding, openWriterOnboarding, openAboutModal, openPricingModal } = useAuthModal();

  const runAction = (action) => {
    if (action === "pricing") openPricingModal();
    else if (action === "about") openAboutModal();
    else if (action === "writer") openWriterOnboarding();
    else openProducerOnboarding();
  };

  return (
    <footer className="ckl-footer">
      <div className="ckl-footer-inner">
        <div className="ckl-footer-top">
          <div className="ckl-footer-brand">
            <img className="ckl-footer-logo" src={LOGO_FOOTER_SRC} alt="Ckript" />
            <p className="ckl-footer-tagline">From the page to the screen.</p>
            {/* The address now lives once, in the statutory Registered Office line below. */}
          </div>

          <div className="ckl-footer-cols">
            {FOOTER_COLS.map((col) => (
              <div key={col.head} className="ckl-footer-col">
                <div className="ckl-footer-col-head">{col.head}</div>
                {col.links.map((l) =>
                  l.action ? (
                    <button
                      key={l.label}
                      type="button"
                      onClick={() => runAction(l.action)}
                      className="ckl-footer-link hov-red"
                    >
                      {l.label}
                    </button>
                  ) : l.external ? (
                    <a
                      key={l.label}
                      href={l.to}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ckl-footer-link hov-red"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} to={l.to} className="ckl-footer-link hov-red">
                      {l.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="ckl-footer-bottom">
          <span className="ckl-footer-copy">{COPYRIGHT_LINE}</span>
          <span className="ckl-footer-copy">Made for storytellers.</span>
        </div>

        {/* Statutory corporate disclosure — legal entity, CIN and registered office. */}
        <div className="ckl-footer-legal">
          <p className="ckl-footer-legal-desc">{COMPANY.description}</p>
          <div className="ckl-footer-legal-head">Corporate Information</div>
          <p className="ckl-footer-legal-row">
            <span className="ckl-footer-legal-key">Legal Entity:</span> {COMPANY.legalName}
            <span className="ckl-footer-legal-sep">|</span>
            <span className="ckl-footer-legal-key">CIN:</span> {COMPANY.cin}
          </p>
          <p className="ckl-footer-legal-row">
            <span className="ckl-footer-legal-key">Registered Office:</span> {COMPANY.registeredOffice}
          </p>
          <p className="ckl-footer-legal-row">
            <span className="ckl-footer-legal-key">Contact:</span>{" "}
            <a href={`mailto:${COMPANY.email}`} className="ckl-footer-legal-mail">{COMPANY.email}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
