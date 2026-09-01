import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { useAuthModal } from "../../../context/AuthModalContext";
import { ROUTES, LOGO_SRC } from "./theme";
import "./LandingNav.css";

/**
 * The landing-register site navigation.
 *
 * This lived inside Hero.jsx, which is why every OTHER .ckl page shipped without a header —
 * /challenges rendered a hand-rolled inline <header> with a logo and a single link, leaving a
 * first-time visitor with no way to reach Scripts, Pricing, For Producers or sign-in. Extracting it
 * is what lets any landing page mount the real nav.
 *
 * TWO VARIANTS, one markup tree:
 *
 *   "stage" — the homepage. The Hero is a pixel-perfect 1586×992 composition that useStageFit
 *             scales to the viewport, and the nav is absolutely positioned INSIDE that stage. Its
 *             metrics are design pixels; the stage transform shrinks them.
 *
 *   "page"  — every other landing page. There is no stage to scale it, so the same metrics are
 *             re-expressed as vw: the stage scale is viewportWidth / 1586, so a 104px design height
 *             is exactly 104/1586 = 6.557vw. Mirroring the ratios means this nav renders at the
 *             SAME size as the homepage's at any width, rather than merely near it.
 *
 * Both keep the `ckl-hero-nav` class so the shared descendant styling applies to each, and so the
 * existing ≤900px responsive rules — which already collapse the bar and reveal the burger — govern
 * both without being duplicated.
 */
export default function LandingNav({ variant = "page", active = "" }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);

  const { user } = useContext(AuthContext);
  const { openAuthModal, openProducerOnboarding, openWriterOnboarding, openPricingModal } =
    useAuthModal();

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  return (
    <>
      <div className={`ckl-hero-nav${variant === "page" ? " ckl-hero-nav--page" : ""}`}>
        <Link to={ROUTES.home} className="ckl-hero-brand" aria-label="Ckript home">
          <img src={LOGO_SRC} alt="Ckript" />
        </Link>
        <span className="ckl-hero-nav-divider desktop-only" />
        <nav className="ckl-hero-nav-links desktop-only" aria-label="Primary">
          <button type="button" onClick={() => openWriterOnboarding()} className="ckl-hero-navlink hov-red">
            Scripts
          </button>
          {/* A real route, unlike its siblings which open modals. `.ckl-hero-navlink` already
              styles both <button> and <a>, so the shape matches without a variant. */}
          {/* aria-current, not colour alone: the red marks the page you are on, and colour is not
              information anyone relying on a screen reader or unable to distinguish it receives. */}
          <Link
            to={ROUTES.challenges}
            className={`ckl-hero-navlink hov-red${active === "challenges" ? " is-active" : ""}`}
            aria-current={active === "challenges" ? "page" : undefined}
          >
            Challenge
          </Link>
          <button type="button" onClick={() => openProducerOnboarding()} className="ckl-hero-navlink hov-red">
            For Producers
          </button>

          <div
            className="ckl-hero-pricing"
            onMouseEnter={() => setIsPricingDropdownOpen(true)}
            onMouseLeave={() => setIsPricingDropdownOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsPricingDropdownOpen((prev) => !prev)}
              className="ckl-hero-navlink ckl-hero-navlink--pricing hov-red"
              aria-expanded={isPricingDropdownOpen}
            >
              Pricing
              <span className="msi" style={{ fontSize: 20 }}>expand_more</span>
            </button>
            {isPricingDropdownOpen && (
              <div className="ckl-hero-pricing-menu">
                <button
                  type="button"
                  className="ckl-hero-pricing-item"
                  onClick={() => {
                    setIsPricingDropdownOpen(false);
                    openPricingModal("writer");
                  }}
                >
                  Writer Plans
                </button>
                <button
                  type="button"
                  className="ckl-hero-pricing-item"
                  onClick={() => {
                    setIsPricingDropdownOpen(false);
                    openPricingModal("industry");
                  }}
                >
                  Film Industry Plan
                </button>
              </div>
            )}
          </div>
        </nav>
        <div className="ckl-hero-nav-actions">
          {user ? (
            <Link to={primaryPath} className="ckl-hero-nav-login hov-red desktop-only">
              {signInLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openPricingModal()}
              className="ckl-hero-nav-login hov-red desktop-only"
            >
              {signInLabel}
            </button>
          )}
          <button
            type="button"
            className="ckl-hero-iconbtn mobile-only"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span className="msi" style={{ fontSize: 32 }}>menu</span>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay, a sibling of the bar rather than a child of it.
          It is `position: fixed`, and in the "stage" variant it still sits inside the hero's
          transformed stage — which would normally break fixed positioning, since a transformed
          ancestor becomes the containing block. It works because the two never coincide: the
          burger that opens it appears only at ≤600px, and the stage's transform is already
          neutralised at ≤900px. Do not raise the transform above that breakpoint. */}
      {isMobileMenuOpen && (
        <div className="ckl-hero-mmenu">
          <div className="ckl-hero-mmenu-head">
            <Link to={ROUTES.home} onClick={() => setIsMobileMenuOpen(false)} className="ckl-hero-brand">
              <img src={LOGO_SRC} alt="Ckript" />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="ckl-hero-iconbtn"
              aria-label="Close menu"
            >
              <span className="msi" style={{ fontSize: 32 }}>close</span>
            </button>
          </div>
          <div className="ckl-hero-mmenu-links">
            <button
              type="button"
              className="ckl-hero-mmenu-item"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openWriterOnboarding();
              }}
            >
              Scripts
            </button>
            {/* Closes the overlay like every sibling — a route change alone would leave the
                fixed, full-screen menu covering the page it navigated to. */}
            <Link
              to={ROUTES.challenges}
              className="ckl-hero-mmenu-item"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Challenge
            </Link>
            <button
              type="button"
              className="ckl-hero-mmenu-item"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openProducerOnboarding();
              }}
            >
              For Producers
            </button>
            <button
              type="button"
              className="ckl-hero-mmenu-item"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openPricingModal("writer");
              }}
            >
              Writer Plans
            </button>
            <button
              type="button"
              className="ckl-hero-mmenu-item"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openPricingModal("industry");
              }}
            >
              Film Industry Plan
            </button>
            {user ? (
              <Link
                to={primaryPath}
                onClick={() => setIsMobileMenuOpen(false)}
                className="ckl-hero-mmenu-item ckl-hero-mmenu-login"
              >
                {signInLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="ckl-hero-mmenu-item ckl-hero-mmenu-login"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openPricingModal();
                }}
              >
                {signInLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
