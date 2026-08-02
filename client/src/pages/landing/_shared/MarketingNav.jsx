import { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { useAuthModal } from "../../../context/AuthModalContext";
import { LOGO_SRC, ROUTES } from "./theme";
import "../sections/Hero/Hero.css";

export default function MarketingNav({ page = false }) {
  const { pathname } = useLocation();
  const { user } = useContext(AuthContext);
  const {
    openAuthModal,
    openProducerOnboarding,
    openWriterOnboarding,
    openPricingModal,
  } = useAuthModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);

  /*
   * A navigation closes both overlays. Adjusted during render — the pattern
   * React documents for resetting state when a prop changes — because an effect
   * would paint one frame of the new page with the old menu still covering it.
   */
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setIsMobileMenuOpen(false);
    setIsPricingDropdownOpen(false);
  }

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  return (
    <>
      <div className={`ckl-hero-nav${page ? " ckl-hero-nav--page" : ""}`}>
        <Link to={ROUTES.home} className="ckl-hero-brand">
          <img src={LOGO_SRC} alt="Ckript" />
        </Link>
        <span className="ckl-hero-nav-divider desktop-only" />
        <nav className="ckl-hero-nav-links desktop-only" aria-label="Main navigation">
          <button
            type="button"
            onClick={openWriterOnboarding}
            className="ckl-hero-navlink hov-red"
          >
            Scripts
          </button>
          {/* A real route, unlike its siblings which open modals. `.ckl-hero-navlink` already
              styles both <button> and <a>, so the shape matches without a variant. */}
          <Link
            to={ROUTES.challenges}
            className="ckl-hero-navlink hov-red"
            aria-current={pathname.startsWith(ROUTES.challenges) ? "page" : undefined}
          >
            Challenge
          </Link>
          <button
            type="button"
            onClick={openProducerOnboarding}
            className="ckl-hero-navlink hov-red"
          >
            For Producers
          </button>

          <div
            className="ckl-hero-pricing"
            onMouseEnter={() => setIsPricingDropdownOpen(true)}
            onMouseLeave={() => setIsPricingDropdownOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsPricingDropdownOpen((open) => !open)}
              className="ckl-hero-navlink ckl-hero-navlink--pricing hov-red"
              aria-haspopup="menu"
              aria-expanded={isPricingDropdownOpen}
            >
              Pricing
              <span className="msi" style={{ fontSize: 20 }} aria-hidden="true">
                expand_more
              </span>
            </button>
            {isPricingDropdownOpen ? (
              <div className="ckl-hero-pricing-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
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
                  role="menuitem"
                  className="ckl-hero-pricing-item"
                  onClick={() => {
                    setIsPricingDropdownOpen(false);
                    openPricingModal("industry");
                  }}
                >
                  Film Industry Plan
                </button>
              </div>
            ) : null}
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
              onClick={() => openAuthModal()}
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
            aria-expanded={isMobileMenuOpen}
          >
            <span className="msi" style={{ fontSize: 32 }} aria-hidden="true">
              menu
            </span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="ckl-hero-mmenu">
          <div className="ckl-hero-mmenu-head">
            <Link to={ROUTES.home} className="ckl-hero-brand">
              <img src={LOGO_SRC} alt="Ckript" />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="ckl-hero-iconbtn"
              aria-label="Close menu"
            >
              <span className="msi" style={{ fontSize: 32 }} aria-hidden="true">
                close
              </span>
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
              <Link to={primaryPath} className="ckl-hero-mmenu-item ckl-hero-mmenu-login">
                {signInLabel}
              </Link>
            ) : (
              <button
                type="button"
                className="ckl-hero-mmenu-item ckl-hero-mmenu-login"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  openAuthModal();
                }}
              >
                {signInLabel}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
