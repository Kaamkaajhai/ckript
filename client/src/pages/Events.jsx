import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy, CalendarDays, Clock, Users, ArrowRight, Menu, X, Loader2 } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { ROUTES, LOGO_SRC } from "./landing/_shared/theme";
import Footer from "./landing/sections/Footer/Footer";
import api from "../services/api";
import "./landing/landing.css";
import "./landing/sections/Hero/Hero.css";

export default function Events() {
  const { user } = useContext(AuthContext);
  const { openAuthModal, openProducerOnboarding, openWriterOnboarding, openPricingModal } = useAuthModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPricingDropdownOpen, setIsPricingDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  const [events, setEvents] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await api.get('/competitions/list');
        if (res.data) {
          const { live = [], upcoming = [], past = [] } = res.data;
          const combined = [
            ...live.map(e => ({ ...e, eventStatus: 'Live' })),
            ...upcoming.map(e => ({ ...e, eventStatus: 'Upcoming' })),
            ...past.map(e => ({ ...e, eventStatus: 'Past' }))
          ];
          setEvents(combined);
          
          if (live.length > 0) {
            setActiveEvent(live[0]);
          } else if (upcoming.length > 0) {
            setActiveEvent(upcoming[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch events", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [events]);

  return (
    <div className="ckl" style={{ width: '100%', minHeight: '100vh', background: '#F8F6F2' }}>
      <style>{`
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      
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

      {/* Main Events Content */}
      <div className="w-full text-[#111]">
        {/* HERO SECTION */}
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
          <div className="flex items-center gap-3 mb-6 reveal-on-scroll">
            <div className="w-3 h-3 bg-[#8A3B2E] rotate-45"></div>
            <span className="text-sm font-semibold tracking-widest text-[#555] uppercase">The Ckript Challenge</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-serif leading-tight mb-8 reveal-on-scroll">
            Write a screenplay<br />
            in <span className="italic text-[#777]">one weekend.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#444] max-w-3xl leading-relaxed mb-12 font-serif reveal-on-scroll">
            One theme is revealed to everyone at the same moment. You get forty-eight hours to turn it into a script. Every entry that arrives is read and evaluated.
          </p>
          <div className="flex items-center gap-6 text-sm font-medium border-t border-[#e0dfdd] pt-8 reveal-on-scroll">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8A3B2E] opacity-80"></span>
              <span className="tracking-widest uppercase">
                {activeEvent ? "A challenge is live" : "Upcoming Challenge"}
              </span>
            </div>
            <div className="w-px h-4 bg-[#ccc]"></div>
            <span className="italic text-[#777] font-serif text-lg">
              {activeEvent?.dates?.regClosesAt 
                ? `Registration closes ${new Date(activeEvent.dates.regClosesAt).toLocaleDateString()}` 
                : "Stay tuned for dates"}
            </span>
          </div>
        </section>

        {/* EVENTS ZIG-ZAG LIST */}
        <section className="max-w-6xl mx-auto px-6 pb-32">
          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-[#8A3B2E]" />
            </div>
          ) : events.length > 0 ? (
            <div className="flex flex-col gap-32">
              {events.map((event, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div 
                    key={event._id || event.slug || index} 
                    className={`reveal-on-scroll flex flex-col md:flex-row gap-12 lg:gap-20 items-center ${isEven ? '' : 'md:flex-row-reverse'}`}
                  >
                    {/* Image Side */}
                    <div className="w-full md:w-1/2 rounded-[24px] overflow-hidden shadow-2xl h-[350px] md:h-[450px] relative group cursor-pointer border border-[#e0dfdd]/50" onClick={() => navigate(`/events/${event.slug}`)}>
                      <div className="absolute inset-0 bg-[#111]">
                        {event.bannerUrl ? (
                          <div 
                            className="w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                            style={{ backgroundImage: `url(${event.bannerUrl})` }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#222]">
                            <span className="text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase mb-2">The Next</span>
                            <h2 className="text-3xl font-bold text-white tracking-tight text-center px-4">GREAT STORY</h2>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
                      </div>
                      {/* Status Badge */}
                      <div className="absolute top-6 right-6">
                        <div className={`backdrop-blur-md px-4 py-2 rounded-full border shadow-sm flex items-center gap-2 ${
                          event.eventStatus === 'Live' ? 'bg-white/10 border-white/20' : 
                          event.eventStatus === 'Upcoming' ? 'bg-[#c97a5f]/20 border-[#c97a5f]/30' : 
                          'bg-black/60 border-white/10'
                        }`}>
                          {event.eventStatus === 'Live' && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c97a5f] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c97a5f]"></span>
                            </span>
                          )}
                          <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${event.eventStatus === 'Past' ? 'text-white/60' : 'text-white'}`}>
                            {event.eventStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content Side */}
                    <div className="w-full md:w-1/2 flex flex-col items-start">
                      <h3 className="text-4xl lg:text-5xl font-serif text-[#111] leading-tight mb-4">{event.name}</h3>
                      <p className="text-lg text-[#555] mb-8 leading-relaxed font-serif">
                        {event.overview || "Write a feature-length screenplay in 48 hours. Compete worldwide, get evaluated by pros, and launch your career."}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 w-full mb-10">
                        <div className="flex flex-col p-5 rounded-2xl bg-white border border-[#e0dfdd] shadow-sm">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1.5 flex items-center gap-1.5">
                            <Trophy size={12} className="text-[#8A3B2E]" /> Prize Pool
                          </span>
                          <span className="text-sm font-semibold text-[#111]">{event.prizePool || "TBA"}</span>
                        </div>
                        <div className="flex flex-col p-5 rounded-2xl bg-white border border-[#e0dfdd] shadow-sm">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1.5 flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-[#c97a5f]" /> Start Date
                          </span>
                          <span className="text-sm font-semibold text-[#111]">
                            {event.dates?.startsAt ? new Date(event.dates.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "TBA"}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => navigate(`/events/${event.slug}`)}
                        className="group flex items-center gap-3 px-8 py-4 bg-[#111] text-white rounded-xl font-bold text-sm overflow-hidden relative hover:-translate-y-1 transition-all shadow-lg hover:shadow-2xl"
                      >
                        <span className="relative z-10">View Event</span>
                        <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24">
              <p className="text-lg text-[#666]">No events found. Check back soon!</p>
            </div>
          )}
        </section>

        {/* THE JOURNEY */}
        <section className="bg-white py-24 border-t border-[#e0dfdd]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-24 gap-8 reveal-on-scroll">
              <h2 className="text-5xl md:text-7xl font-serif leading-tight text-[#111]">
                Six steps.<br />
                <span className="text-[#999]">One weekend.</span>
              </h2>
              <div className="flex items-center gap-3 text-[#555] font-medium tracking-wide pb-2">
                <div className="w-2.5 h-2.5 bg-[#8A3B2E] rotate-45"></div>
                <span className="uppercase text-sm">
                  {activeEvent?.dates?.startsAt 
                    ? new Date(activeEvent.dates.startsAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) 
                    : "Next Event TBA"}
                </span>
              </div>
            </div>

            <div className="relative reveal-on-scroll">
              {/* Dotted line */}
              <div className="absolute bottom-[6px] left-[5%] right-[5%] h-px border-t-2 border-dashed border-[#e0dfdd] z-0"></div>
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-6 relative z-10">
                {[
                  { title: "Register", desc: "Claim your spot in the competition." },
                  { title: "Theme reveals", desc: "The prompt is shared with everyone." },
                  { title: "Write", desc: "48 hours to complete your script." },
                  { title: "Submit", desc: "Upload before the timer runs out." },
                  { title: "Evaluation", desc: "Industry pros read every script." },
                  { title: "Results", desc: "Winners are announced publicly." }
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center h-full">
                    <div className="flex-1 flex flex-col justify-end items-center text-center mb-8 px-2">
                      <h4 className="font-serif text-2xl text-[#222] mb-3 leading-snug">{step.title}</h4>
                      <p className="text-[13px] text-[#777] leading-relaxed max-w-[150px]">{step.desc}</p>
                    </div>
                    <div className={`w-3.5 h-3.5 rotate-45 ring-8 ring-white flex-shrink-0 ${idx === 5 ? 'bg-[#111]' : (idx > 0 && idx < 4 ? 'bg-[#8A3B2E]' : 'bg-[#d5d5d5]')}`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* OWNERSHIP */}
        <section className="bg-[#F8F6F2] py-24 border-t border-[#e0dfdd]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6 reveal-on-scroll">
              <svg className="w-5 h-5 text-[#8A3B2E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              <span className="text-sm font-semibold tracking-widest text-[#8A3B2E] uppercase">Ownership</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif mb-20 reveal-on-scroll">
              It stays <span className="text-[#888]">yours.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 reveal-on-scroll">
              <div className="border-l border-[#e0dfdd] pl-8">
                <span className="text-xs font-semibold tracking-widest text-[#8A3B2E] uppercase block mb-4">While writing</span>
                <h3 className="text-3xl font-serif mb-4">Private</h3>
                <p className="text-[#555] text-lg">Nobody reads a word before you submit.</p>
              </div>
              <div className="border-l border-[#e0dfdd] pl-8">
                <span className="text-xs font-semibold tracking-widest text-[#8A3B2E] uppercase block mb-4">At submit</span>
                <h3 className="text-3xl font-serif mb-4">Frozen snapshot</h3>
                <p className="text-[#555] text-lg">One version is sealed for judging. Only that one.</p>
              </div>
              <div className="border-l border-[#e0dfdd] pl-8">
                <span className="text-xs font-semibold tracking-widest text-[#8A3B2E] uppercase block mb-4">Afterwards</span>
                <h3 className="text-3xl font-serif mb-4">Still yours</h3>
                <p className="text-[#555] text-lg">Keep writing it, sell it, take it anywhere.</p>
              </div>
            </div>
          </div>
        </section>
        
      </div>
      <Footer />
    </div>
  );
}
