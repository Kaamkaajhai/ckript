import React, { useState, useEffect } from "react";
import { Trophy, CalendarDays, Clock, Users, ArrowRight } from "lucide-react";

export default function Events() {
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hours: "00",
    mins: "00",
    secs: "00"
  });

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3); // Example: 3 days from now
    targetDate.setHours(targetDate.getHours() + 14);
    
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
  }, []);

  return (
    <div className="w-full bg-[#f9f8f6] min-h-screen text-[#222]">
      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 bg-[#c94b3a] rotate-45"></div>
          <span className="text-sm font-semibold tracking-widest text-[#888] uppercase">The Ckript Challenge</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-serif leading-tight mb-8">
          Write a screenplay<br />
          in <span className="italic text-[#777]">one weekend.</span>
        </h1>
        <p className="text-xl md:text-2xl text-[#444] max-w-3xl leading-relaxed mb-12 font-serif">
          One theme is revealed to everyone at the same moment. You get forty-eight hours to turn it into a script. Every entry that arrives is read and evaluated.
        </p>
        <div className="flex items-center gap-6 text-sm font-medium border-t border-[#e0dfdd] pt-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c94b3a] opacity-60"></span>
            <span className="tracking-widest uppercase">Challenge 04 is live</span>
          </div>
          <div className="w-px h-4 bg-[#ccc]"></div>
          <span className="italic text-[#777] font-serif text-lg">Registration closes Friday</span>
        </div>
      </section>

      {/* EVENT CARD - REDESIGNED */}
      <section className="max-w-[1000px] mx-auto px-6 pb-32">
        <div className="group relative bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#eaeaea] overflow-hidden transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 mx-auto">
          
          {/* Banner Section */}
          <div className="relative h-56 md:h-64 bg-[#111] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#222]"></div>
            <div className="absolute top-0 right-0 w-[120%] h-[120%] bg-white/[0.02] transform -rotate-12 translate-x-1/3 -translate-y-1/4 rounded-[100%] blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>
            
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.25em] text-white/60 uppercase mb-2 block">The Next</span>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">GREAT STORY</h2>
                  <h2 className="text-3xl md:text-4xl font-bold text-[#c94b3a] tracking-tight">STARTS HERE.</h2>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
                    </span>
                    <span className="text-[10px] md:text-[11px] font-bold text-white tracking-widest uppercase">Registration Open</span>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/5 text-[10px] md:text-[11px] font-bold text-white/80 tracking-widest uppercase shadow-sm">
                    2026 Edition
                  </div>
                </div>
              </div>
              <p className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-white/70 uppercase">Write. Compete. Get Discovered.</p>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="p-8 md:p-10">
            
            {/* Header: Title & Quick Badges */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-[#f4f2f0] text-[#444] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest">🌍 Global Event</span>
                  <span className="bg-[#fff0ed] text-[#c94b3a] px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest">🔥 Trending</span>
                </div>
                <h3 className="text-3xl md:text-5xl font-serif text-[#111] leading-tight mb-4">
                  The Final Draft
                </h3>
                <p className="text-base md:text-lg text-[#666] max-w-2xl leading-relaxed">
                  Write a feature-length screenplay in 48 hours. Compete against writers worldwide, get evaluated by industry pros, and launch your career.
                </p>
              </div>
            </div>

            {/* Grid Details */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-[#faf9f8] border border-[#f0ece9] hover:bg-white hover:shadow-sm transition-colors">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-[#eaeaea] text-[#c94b3a] hidden sm:block">
                  <Trophy size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-[#888] font-bold uppercase tracking-widest mb-1.5">Prize Pool</p>
                  <p className="text-xs md:text-sm font-semibold text-[#111]">₹50,000 + Gold</p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-[#faf9f8] border border-[#f0ece9] hover:bg-white hover:shadow-sm transition-colors">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-[#eaeaea] text-[#555] hidden sm:block">
                  <CalendarDays size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-[#888] font-bold uppercase tracking-widest mb-1.5">Starts On</p>
                  <p className="text-xs md:text-sm font-semibold text-[#111]">Aug 24, 2026</p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-[#faf9f8] border border-[#f0ece9] hover:bg-white hover:shadow-sm transition-colors">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-[#eaeaea] text-[#555] hidden sm:block">
                  <Clock size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-[#888] font-bold uppercase tracking-widest mb-1.5">Duration</p>
                  <p className="text-xs md:text-sm font-semibold text-[#111]">48 Hours</p>
                </div>
              </div>
              <div className="flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-[#faf9f8] border border-[#f0ece9] hover:bg-white hover:shadow-sm transition-colors">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-[#eaeaea] text-[#555] hidden sm:block">
                  <Users size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] md:text-[11px] text-[#888] font-bold uppercase tracking-widest mb-1.5">Participants</p>
                  <p className="text-xs md:text-sm font-semibold text-[#111]">1,240+ Reg.</p>
                </div>
              </div>
            </div>

            {/* Bottom Section: Hero Countdown & CTA */}
            <div className="flex flex-col lg:flex-row items-center justify-between p-6 md:p-8 rounded-[24px] bg-[#111] text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#c94b3a] opacity-20 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="mb-8 lg:mb-0 text-center lg:text-left relative z-10 w-full lg:w-auto">
                <p className="text-[10px] md:text-[11px] font-bold text-white/50 uppercase tracking-[0.25em] mb-4 md:mb-5">Registration Closes In</p>
                <div className="flex items-center gap-3 md:gap-6 justify-center lg:justify-start">
                  <div className="flex flex-col items-center w-12 md:w-14">
                    <span className="text-3xl md:text-4xl font-light font-mono tabular-nums tracking-tighter">{timeLeft.days}</span>
                    <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1.5">Days</span>
                  </div>
                  <span className="text-2xl md:text-3xl text-white/20 font-light mb-4 md:mb-5">:</span>
                  <div className="flex flex-col items-center w-12 md:w-14">
                    <span className="text-3xl md:text-4xl font-light font-mono tabular-nums tracking-tighter">{timeLeft.hours}</span>
                    <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1.5">Hours</span>
                  </div>
                  <span className="text-2xl md:text-3xl text-white/20 font-light mb-4 md:mb-5">:</span>
                  <div className="flex flex-col items-center w-12 md:w-14">
                    <span className="text-3xl md:text-4xl font-light font-mono tabular-nums tracking-tighter">{timeLeft.mins}</span>
                    <span className="text-[9px] md:text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1.5">Mins</span>
                  </div>
                  <span className="text-2xl md:text-3xl text-white/20 font-light mb-4 md:mb-5">:</span>
                  <div className="flex flex-col items-center w-12 md:w-14">
                    <span className="text-3xl md:text-4xl font-light font-mono tabular-nums tracking-tighter text-[#e15b49]">{timeLeft.secs}</span>
                    <span className="text-[9px] md:text-[10px] text-[#e15b49]/60 font-bold uppercase tracking-widest mt-1.5">Secs</span>
                  </div>
                </div>
              </div>
              
              <button className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-[#111] font-bold text-[14px] md:text-[15px] rounded-2xl overflow-hidden transition-transform active:scale-95 w-full lg:w-auto shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] z-10">
                <span className="relative z-10">Reserve Your Spot</span>
                <ArrowRight size={18} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1.5" strokeWidth={2.5} />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-[#f0f0f0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
            
          </div>
        </div>
      </section>

      {/* THE JOURNEY */}
      <section className="bg-white py-24 border-t border-[#e0dfdd]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-24 gap-8">
            <h2 className="text-5xl md:text-7xl font-serif leading-tight text-[#111]">
              Six steps.<br />
              <span className="text-[#999]">One weekend.</span>
            </h2>
            <div className="flex items-center gap-3 text-[#555] font-medium tracking-wide pb-2">
              <div className="w-2.5 h-2.5 bg-[#c94b3a] rotate-45"></div>
              <span className="uppercase text-sm">24th of August at 8:00 PM London time</span>
            </div>
          </div>

          <div className="relative">
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
                   <div className={`w-3.5 h-3.5 rotate-45 ring-8 ring-white flex-shrink-0 ${idx === 5 ? 'bg-[#111]' : (idx > 0 && idx < 4 ? 'bg-[#8c3123]' : 'bg-[#d5d5d5]')}`}></div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </section>

      {/* OWNERSHIP */}
      <section className="bg-[#f9f8f6] py-24 border-t border-[#e0dfdd]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-6">
             <svg className="w-5 h-5 text-[#c94b3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
             <span className="text-sm font-semibold tracking-widest text-[#c94b3a] uppercase">Ownership</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-serif mb-20">
            It stays <span className="text-[#888]">yours.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="border-l border-[#e0dfdd] pl-8">
              <span className="text-xs font-semibold tracking-widest text-[#c94b3a] uppercase block mb-4">While writing</span>
              <h3 className="text-3xl font-serif mb-4">Private</h3>
              <p className="text-[#555] text-lg">Nobody reads a word before you submit.</p>
            </div>
            <div className="border-l border-[#e0dfdd] pl-8">
              <span className="text-xs font-semibold tracking-widest text-[#c94b3a] uppercase block mb-4">At submit</span>
              <h3 className="text-3xl font-serif mb-4">Frozen snapshot</h3>
              <p className="text-[#555] text-lg">One version is sealed for judging. Only that one.</p>
            </div>
            <div className="border-l border-[#e0dfdd] pl-8">
              <span className="text-xs font-semibold tracking-widest text-[#c94b3a] uppercase block mb-4">Afterwards</span>
              <h3 className="text-3xl font-serif mb-4">Still yours</h3>
              <p className="text-[#555] text-lg">Keep writing it, sell it, take it anywhere.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
