import React from "react";
import { Trophy, Medal, Star } from "lucide-react";

export default function EventPrizes({ prizes, prizePool }) {
  if (!prizes || (!prizes.winner?.length && !prizes.runnerUp?.length && !prizes.special?.length)) return null;

  return (
    <section className="ckl-event-section bg-white">
      <div className="ckl-event-container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#111] mb-4">Prizes & Awards</h2>
            <p className="text-lg text-[#666] max-w-xl">
              Win exclusive perks, industry exposure, and massive rewards.
            </p>
          </div>
          {prizePool && (
            <div className="flex items-center gap-4 bg-[#faf9f8] px-6 py-4 rounded-2xl border border-[var(--event-border)]">
              <div className="w-12 h-12 bg-[#fff0ed] text-[var(--event-accent)] rounded-full flex items-center justify-center">
                <Trophy size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#888] uppercase tracking-widest mb-1">Total Prize Pool</p>
                <p className="text-2xl font-serif font-bold text-[#111]">{prizePool}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Winner Card */}
          {prizes.winner?.length > 0 && (
            <div className="ckl-event-card p-8 relative overflow-hidden bg-[#111] text-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#eab308] opacity-20 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md">
                <Trophy size={24} className="text-[#eab308]" />
              </div>
              <h3 className="text-3xl font-serif font-bold mb-2">Grand Prize</h3>
              <p className="text-white/60 text-sm mb-8">The ultimate reward for the best script.</p>
              
              <ul className="flex flex-col gap-4">
                {prizes.winner.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-white/90">
                    <span className="text-[#eab308] mt-1">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Runner Up Card */}
          {prizes.runnerUp?.length > 0 && (
            <div className="ckl-event-card p-8 bg-[#faf9f8]">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-[var(--event-border)] flex items-center justify-center mb-6">
                <Medal size={24} className="text-[#94a3b8]" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-[#111] mb-2">Runner-Up</h3>
              <p className="text-[#666] text-sm mb-8">Exceptional recognition for top contenders.</p>
              
              <ul className="flex flex-col gap-4">
                {prizes.runnerUp.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[#444]">
                    <span className="text-[#94a3b8] mt-1">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Special Awards */}
          {prizes.special?.length > 0 && (
            <div className="ckl-event-card p-8 bg-[#faf9f8]">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-[var(--event-border)] flex items-center justify-center mb-6">
                <Star size={24} className="text-[var(--event-accent)]" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-[#111] mb-2">Special Awards</h3>
              <p className="text-[#666] text-sm mb-8">Unique categories and honorable mentions.</p>
              
              <ul className="flex flex-col gap-6">
                {prizes.special.map((item, idx) => (
                  <li key={idx} className="flex flex-col gap-1">
                    <h4 className="font-bold text-[#222]">{item.title}</h4>
                    {item.description && <p className="text-sm text-[#666] leading-relaxed">{item.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
