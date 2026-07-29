import React, { useState, useEffect, useContext } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { ROUTES, LOGO_SRC } from "../landing/_shared/theme";
import Footer from "../landing/sections/Footer/Footer";
import { Menu, X, Loader2 } from "lucide-react";

import "./events.css";
import "../landing/landing.css";
import "../landing/sections/Hero/Hero.css";

import EventHero from "./components/EventHero";
import EventAbout from "./components/EventAbout";
import EventTimeline from "./components/EventTimeline";
import EventPrizes from "./components/EventPrizes";
import EventJudges from "./components/EventJudges";
import EventSponsors from "./components/EventSponsors";
import EventRules from "./components/EventRules";

export default function EventDetails() {
  const { id } = useParams(); // id is the slug
  const { user } = useContext(AuthContext);
  const { openAuthModal, openProducerOnboarding, openWriterOnboarding, openPricingModal } = useAuthModal();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [serverNow, setServerNow] = useState(null);

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        // If id is present, pass it as ?c=slug, otherwise fetch the active one
        const url = id ? `/api/competitions/active?c=${id}` : `/api/competitions/active`;
        const res = await api.get(url);
        
        if (res.data && res.data.competition) {
          setEventData(res.data);
          setServerNow(res.data.serverNow);
        } else {
          setError("Event not found or has been archived.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load event details.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-[#f9f8f6]">
        <Loader2 className="w-8 h-8 animate-spin text-[#c94b3a]" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[#f9f8f6] text-[#222]">
        <h2 className="text-3xl font-serif mb-4">Event Not Found</h2>
        <p className="text-[#666] mb-8">{error}</p>
        <Link to="/" className="px-6 py-3 bg-[#111] text-white rounded-xl font-bold">Go Home</Link>
      </div>
    );
  }

  const { competition, phase, timeline } = eventData;

  return (
    <div className="ckl ckl-event-page">
      {/* HEADER (Same as Landing) */}
      <div className="ckl-hero-nav" style={{ position: 'relative', opacity: 1, animation: 'none', height: '104px', maxWidth: '1586px', margin: '0 auto' }}>
          <Link to={ROUTES.home} className="ckl-hero-brand">
            <img src={LOGO_SRC} alt="Ckript" />
          </Link>
          <span className="ckl-hero-nav-divider desktop-only" />
          <nav className="ckl-hero-nav-links desktop-only">
            <button type="button" onClick={() => openWriterOnboarding()} className="ckl-hero-navlink hov-red">
              Scripts
            </button>
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
          
          <div className="ckl-hero-nav-actions desktop-only">
            {user ? (
              <Link to={primaryPath} className="ckl-hero-nav-login hov-red">
                {signInLabel}
              </Link>
            ) : (
              <button type="button" onClick={openAuthModal} className="ckl-hero-nav-login hov-red">
                Sign in
              </button>
            )}
          </div>

          <button className="ckl-hero-iconbtn mobile-only" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
      </div>

      {isMobileMenuOpen && (
        <div className="ckl-hero-mmenu">
          <div className="ckl-hero-mmenu-head">
            <Link to={ROUTES.home} onClick={() => setIsMobileMenuOpen(false)}>
              <img src={LOGO_SRC} alt="Ckript" />
            </Link>
            <button className="ckl-hero-iconbtn" onClick={() => setIsMobileMenuOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <div className="ckl-hero-mmenu-links">
            <button type="button" onClick={() => { setIsMobileMenuOpen(false); openWriterOnboarding(); }} className="ckl-hero-mmenu-item">Scripts</button>
            <button type="button" onClick={() => { setIsMobileMenuOpen(false); openProducerOnboarding(); }} className="ckl-hero-mmenu-item">For Producers</button>
            <Link to="/events" onClick={() => setIsMobileMenuOpen(false)} className="ckl-hero-mmenu-item">Events</Link>
            <button type="button" onClick={() => { setIsMobileMenuOpen(false); openPricingModal("writer"); }} className="ckl-hero-mmenu-item">Pricing</button>
            {user ? (
              <Link to={primaryPath} onClick={() => setIsMobileMenuOpen(false)} className="ckl-hero-mmenu-login ckl-hero-mmenu-item">{signInLabel}</Link>
            ) : (
              <button type="button" onClick={() => { setIsMobileMenuOpen(false); openAuthModal(); }} className="ckl-hero-mmenu-login ckl-hero-mmenu-item">Sign in</button>
            )}
          </div>
        </div>
      )}

      <div className="w-full relative">
        <EventHero competition={competition} phase={phase} serverNow={serverNow} />
        <EventAbout competition={competition} />
        <EventTimeline timeline={timeline} />
        <EventPrizes prizes={competition.prizes} prizePool={competition.prizePool} />
        <EventJudges judges={competition.judges} />
        <EventSponsors sponsors={competition.sponsors} />
        <EventRules rules={competition.rules} faq={competition.faq} />
      </div>

      <Footer />
    </div>
  );
}
