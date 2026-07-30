import { useContext, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../../../context/AuthContext";
import { useAuthModal } from "../../../../context/AuthModalContext";
import Icon from "../../_shared/Icon";
import useStageFit, { initialStageScale } from "../../_shared/useStageFit";
import { ROUTES, LOGO_SRC } from "../../_shared/theme";
import scriptOriginal from "../../../../assets/ckript-landing/script-original.png";
import filmClean from "../../../../assets/ckript-landing/film-clean.png";
import "./Hero.css";

const DESIGN_W = 1586;
const DESIGN_H = 992;

export default function Hero() {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);

  const { user } = useContext(AuthContext);
  const { openAuthModal, openProducerOnboarding, openWriterOnboarding, openAboutModal, openPricingModal } =
    useAuthModal();

  useStageFit(wrapRef, stageRef, DESIGN_W, DESIGN_H);
  const initScale = initialStageScale(DESIGN_W, 0.62);

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  return (
    <section ref={wrapRef} className="ckl-hero-wrap" style={{ height: `${DESIGN_H * initScale}px` }}>
      <div
        ref={stageRef}
        className="ckl-hero-stage"
        style={{ transform: `translateX(-50%) scale(${initScale})` }}
      >
        {/* Decorations */}
        <div className="ckl-hero-decor-1">
          <img src={scriptOriginal} alt="" />
        </div>
        <div className="ckl-hero-decor-2">
          <img src={filmClean} alt="" />
        </div>

        {/* Nav */}
        <div className="ckl-hero-nav">
          <Link to={ROUTES.home} className="ckl-hero-brand">
            <img src={LOGO_SRC} alt="Ckript" />
          </Link>
          <span className="ckl-hero-nav-divider desktop-only" />
          <nav className="ckl-hero-nav-links desktop-only">
            <button type="button" onClick={() => openWriterOnboarding()} className="ckl-hero-navlink hov-red">
              Scripts
            </button>
            {/* A real route, unlike its siblings which open modals. `.ckl-hero-navlink` already
                styles both <button> and <a>, so the shape matches without a variant. */}
            <Link to={ROUTES.challenge} className="ckl-hero-navlink hov-red">
              Challenge
            </Link>
            <button type="button" onClick={() => openProducerOnboarding()} className="ckl-hero-navlink hov-red">
              For Producers
            </button>
            <Link to="/events" className="ckl-hero-navlink hov-red">
              Events
            </Link>

            <div
              className="ckl-hero-pricing"
              onMouseEnter={() => setIsPricingDropdownOpen(true)}
              onMouseLeave={() => setIsPricingDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsPricingDropdownOpen((prev) => !prev)}
                className="ckl-hero-navlink ckl-hero-navlink--pricing hov-red"
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
            >
              <span className="msi" style={{ fontSize: 32 }}>menu</span>
            </button>
          </div>
        </div>

        {/* Mobile menu overlay */}
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
                to={ROUTES.challenge}
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
              <Link
                to="/events"
                className="ckl-hero-mmenu-item"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Events
              </Link>
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
                    openAuthModal();
                  }}
                >
                  {signInLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hero content */}
        <h1 className="ckl-hero-title">
          The Journey from
          <br />
          Page to Screen
          <span className="ckl-hero-title-dot" />
        </h1>
        <span className="ckl-hero-line" />
        <p className="ckl-hero-desc">
          Ckript brings powerful writing tools and a modern marketplace together, helping writers create exceptional scripts and producers discover the next great story worth producing.
        </p>
        <div className="ckl-hero-buttons">
          <button type="button" onClick={openProducerOnboarding} className="ckl-hero-btn-primary hov-btn-lift">
            Browse Scripts
          </button>
          <button type="button" onClick={() => openAboutModal()} className="ckl-hero-btn-text hov-underline">
            Meet the Platform
          </button>
        </div>
      </div>
    </section>
  );
}
