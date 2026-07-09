import { Link } from "react-router-dom";
import { useAuthModal } from "../../../../context/AuthModalContext";
import Icon from "../../_shared/Icon";
import { LOGO_FOOTER_SRC } from "../../_shared/theme";
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
            <div className="ckl-footer-hq">
              <div className="ckl-footer-hq-head">Ckript Headquarters</div>
              <div className="ckl-footer-hq-row">
                <Icon name="location_on" size={20} color="#76726a" style={{ flex: "none", marginTop: 2 }} />
                <p className="ckl-footer-hq-addr">
                  SUIT-D, 400-A, 4th Floor,<br />
                  12 Ajit Singh House, Yusuf Sarai Commercial Complex,<br />
                  New Delhi 110016, India<br />
                  <span className="ckl-footer-hq-near">Near Green Park Metro Station Exit-2</span>
                </p>
              </div>
            </div>
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
          <span className="ckl-footer-copy">© 2026 Ckript. All rights reserved.</span>
          <span className="ckl-footer-copy">Made for storytellers.</span>
        </div>
      </div>
    </footer>
  );
}
