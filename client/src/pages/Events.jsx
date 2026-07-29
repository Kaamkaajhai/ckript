import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Award } from "lucide-react";

export default function Events() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Simple countdown timer for demonstration
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const diff = endOfDay - now;
      
      if (diff > 0) {
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
        const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
        setTimeLeft(`${h}:${m}:${s}`);
      } else {
        setTimeLeft("00:00:00");
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

      {/* EVENT CARD */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="max-w-3xl border border-[#e0dfdd] rounded-3xl overflow-hidden bg-white shadow-sm">
          {/* Card Image Area Placeholder */}
          <div className="h-64 bg-gradient-to-br from-[#1a1a1a] to-[#333] relative flex flex-col justify-center px-10 text-white border-b border-[#e0dfdd]">
             <div className="absolute top-0 right-0 w-1/2 h-full bg-black/20" style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}></div>
             <div className="relative z-10">
               <span className="text-sm tracking-[0.3em] uppercase mb-2 block">The Next</span>
               <h2 className="text-5xl font-bold mb-2">GREAT STORY</h2>
               <h2 className="text-5xl font-bold text-[#c94b3a] mb-6">STARTS HERE.</h2>
               <p className="text-xs tracking-widest uppercase opacity-70">Write. Compete. Get Discovered.</p>
             </div>
             <div className="absolute bottom-6 left-10 flex gap-4">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold tracking-wider flex items-center gap-2">
                  REGISTRATION OPEN <span className="w-2 h-2 rounded-full bg-[#ff5a43]"></span>
                </div>
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold tracking-wider">
                  2026
                </div>
             </div>
          </div>
          
          <div className="p-10">
            <h3 className="text-3xl font-serif mb-8">event 1</h3>
            
            <div className="space-y-4 mb-12">
              <div className="flex items-center gap-4 text-[#555] text-lg">
                <Calendar className="w-6 h-6" />
                <span>Jul 30, 2026 – Jul 30, 2026</span>
              </div>
              <div className="flex items-center gap-4 text-[#555] text-lg">
                <Award className="w-6 h-6 text-[#c94b3a]" />
                <span>50k + gold</span>
              </div>
            </div>

            <div className="bg-[#fcf8f7] border border-[#f0deda] rounded-3xl p-6 flex justify-between items-center text-[#c94b3a]">
              <span className="uppercase tracking-widest text-sm font-semibold">Registration closes in</span>
              <span className="font-mono text-xl text-[#333]">{timeLeft}</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE JOURNEY */}
      <section className="bg-white py-24 border-t border-[#e0dfdd]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-end mb-20">
            <h2 className="text-5xl md:text-7xl font-serif leading-tight">
              Six steps.<br />
              <span className="text-[#888]">One weekend.</span>
            </h2>
            <div className="flex items-center gap-2 text-[#777] text-sm">
              <div className="w-2 h-2 bg-[#c94b3a] rotate-45"></div>
              <span>24th of August at 8:00 PM London time</span>
            </div>
          </div>

          <div className="flex justify-between relative">
             {/* Dotted line */}
             <div className="absolute top-1/2 left-0 w-full h-px border-t-2 border-dashed border-[#e0dfdd] -z-10 transform -translate-y-1/2"></div>
             
             {[
               { title: "Register", desc: "Claim your spot in the competition." },
               { title: "Theme reveals", desc: "The prompt is shared with everyone." },
               { title: "Write", desc: "48 hours to complete your script." },
               { title: "Submit", desc: "Upload before the timer runs out." },
               { title: "Evaluation", desc: "Industry pros read every script." },
               { title: "Results", desc: "Winners are announced publicly." }
             ].map((step, idx) => (
               <div key={idx} className="flex flex-col items-center text-center max-w-[140px] bg-white px-2">
                 <h4 className="font-serif text-xl mb-2">{step.title}</h4>
                 <p className="text-xs text-[#666] mb-6">{step.desc}</p>
                 <div className={`w-3 h-3 rotate-45 ${idx === 5 ? 'bg-black' : (idx > 0 && idx < 4 ? 'bg-[#7a2e23]' : 'bg-[#e0dfdd]')}`}></div>
               </div>
             ))}
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
