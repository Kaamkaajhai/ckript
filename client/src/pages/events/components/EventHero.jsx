import React, { useState, useEffect } from "react";
import { CalendarDays, Clock, Trophy, Users, ArrowRight, Bookmark, Share2 } from "lucide-react";

export default function EventHero({ competition, phase, serverNow }) {
  const [timeLeft, setTimeLeft] = useState({ days: "00", hours: "00", mins: "00", secs: "00" });

  useEffect(() => {
    if (!competition?.dates?.regClosesAt) return;
    const targetDate = new Date(competition.dates.regClosesAt);
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetDate - now;
      
      if (diff > 0) {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        setTimeLeft({ days: d, hours: h, mins: m, secs: s });
      } else {
        setTimeLeft({ days: "00", hours: "00", mins: "00", secs: "00" });
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [competition]);

  const bannerStyle = competition.bannerUrl ? {
    backgroundImage: `url(${competition.bannerUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #111111 50%, #222222 100%)'
  };

  return (
    <section className="w-full relative bg-[#111] overflow-hidden text-white" style={bannerStyle}>
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-[120%] h-[120%] bg-white/[0.03] transform -rotate-12 translate-x-1/3 -translate-y-1/4 rounded-[100%] blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-2/3 bg-gradient-to-t from-black/90 to-transparent"></div>

      <div className="ckl-event-container relative z-10 pt-32 pb-24 flex flex-col lg:flex-row gap-16 items-center">
        
        {/* Left Side: Title & Description */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-6">
            <span className="relative flex h-2 w-2">
              {phase === 'live' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${phase === 'live' ? 'bg-[#10b981]' : 'bg-[#eab308]'}`}></span>
            </span>
            <span className="text-xs font-bold tracking-[0.2em] text-white/80 uppercase">
              {phase.replace('_', ' ')}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif font-bold leading-tight mb-6">
            {competition.name}
          </h1>

          {competition.theme?.title && (
            <h2 className="text-2xl md:text-3xl text-white/80 font-serif italic mb-6">
              "{competition.theme.title}"
            </h2>
          )}

          <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed mb-10">
            {competition.overview || "Join the global screenwriting challenge."}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#111] font-bold text-sm rounded-xl overflow-hidden transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <span className="relative z-10">Register Now</span>
              <ArrowRight size={18} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
            </button>
            <button className="p-4 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/10 transition-colors">
              <Bookmark size={20} className="text-white" />
            </button>
            <button className="p-4 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-md border border-white/10 transition-colors">
              <Share2 size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Right Side: Highlights & Countdown */}
        <div className="w-full lg:w-[420px] flex flex-col gap-6">
          {/* Countdown Card */}
          <div className="ckl-event-glass rounded-2xl p-6 text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] mb-4">Registration Closes In</p>
            <div className="flex items-center gap-4 justify-center">
              <div className="flex flex-col items-center w-12">
                <span className="text-3xl font-light font-mono tabular-nums">{timeLeft.days}</span>
                <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest mt-1">Days</span>
              </div>
              <span className="text-2xl text-white/20 font-light mb-4">:</span>
              <div className="flex flex-col items-center w-12">
                <span className="text-3xl font-light font-mono tabular-nums">{timeLeft.hours}</span>
                <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest mt-1">Hrs</span>
              </div>
              <span className="text-2xl text-white/20 font-light mb-4">:</span>
              <div className="flex flex-col items-center w-12">
                <span className="text-3xl font-light font-mono tabular-nums">{timeLeft.mins}</span>
                <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest mt-1">Mins</span>
              </div>
              <span className="text-2xl text-white/20 font-light mb-4">:</span>
              <div className="flex flex-col items-center w-12">
                <span className="text-3xl font-light font-mono tabular-nums text-[#e15b49]">{timeLeft.secs}</span>
                <span className="text-[9px] text-[#e15b49]/70 font-bold uppercase tracking-widest mt-1">Secs</span>
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="ckl-event-glass p-4 rounded-xl flex flex-col gap-2">
              <Trophy size={18} className="text-[#eab308]" />
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Prize Pool</p>
                <p className="text-sm font-semibold">{competition.prizePool || "TBA"}</p>
              </div>
            </div>
            <div className="ckl-event-glass p-4 rounded-xl flex flex-col gap-2">
              <Clock size={18} className="text-[#60a5fa]" />
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Duration</p>
                <p className="text-sm font-semibold">{competition.format?.includes("48") ? "48 Hours" : "Fixed Window"}</p>
              </div>
            </div>
            <div className="ckl-event-glass p-4 rounded-xl flex flex-col gap-2">
              <CalendarDays size={18} className="text-[#a78bfa]" />
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Start Date</p>
                <p className="text-sm font-semibold">
                  {new Date(competition.dates?.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="ckl-event-glass p-4 rounded-xl flex flex-col gap-2">
              <Users size={18} className="text-[#4ade80]" />
              <div>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Eligibility</p>
                <p className="text-sm font-semibold truncate">{competition.eligibility || "Global"}</p>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}
