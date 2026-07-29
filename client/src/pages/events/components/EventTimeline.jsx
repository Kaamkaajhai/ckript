import React from "react";
import { CheckCircle2, CircleDashed, CircleDot } from "lucide-react";

export default function EventTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <section className="ckl-event-section bg-[var(--event-bg)]">
      <div className="ckl-event-container">
        <h2 className="ckl-event-section-title text-center">Event Timeline</h2>
        
        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Line for Desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[var(--event-border)] -translate-x-1/2 z-0"></div>

          <div className="flex flex-col gap-8 md:gap-12 relative z-10">
            {timeline.map((step, index) => {
              const isPast = step.status === "past";
              const isCurrent = step.status === "current";
              const isFuture = step.status === "future";

              return (
                <div key={index} className={`flex flex-col md:flex-row items-center gap-6 md:gap-0 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Content Box */}
                  <div className={`w-full md:w-1/2 flex ${index % 2 === 0 ? 'md:justify-start md:pl-12' : 'md:justify-end md:pr-12'}`}>
                    <div className={`ckl-event-card p-6 w-full max-w-[400px] transition-all duration-300 ${isCurrent ? 'ring-2 ring-[var(--event-accent)] shadow-lg scale-[1.02]' : isPast ? 'opacity-80' : 'opacity-60'}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isCurrent ? 'text-[var(--event-accent)]' : isPast ? 'text-[#888]' : 'text-[#aaa]'}`}>
                        {new Date(step.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h4 className={`text-xl font-serif font-bold mb-2 ${isCurrent ? 'text-[#111]' : 'text-[#444]'}`}>
                        {step.label}
                      </h4>
                      {step.description && (
                        <p className="text-sm text-[#666] leading-relaxed">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Center Node */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center w-10 h-10 bg-[var(--event-bg)] z-10">
                    {isPast && <CheckCircle2 className="w-6 h-6 text-[#10b981]" />}
                    {isCurrent && <CircleDot className="w-6 h-6 text-[var(--event-accent)] animate-pulse" />}
                    {isFuture && <CircleDashed className="w-6 h-6 text-[#ccc]" />}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
