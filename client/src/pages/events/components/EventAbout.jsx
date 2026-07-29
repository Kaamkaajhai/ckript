import React from "react";

export default function EventAbout({ competition }) {
  if (!competition.overview && !competition.theme?.brief) return null;

  return (
    <section className="ckl-event-section bg-white">
      <div className="ckl-event-container">
        <div className="max-w-4xl mx-auto">
          <h2 className="ckl-event-section-title text-center">About the Competition</h2>
          
          <div className="flex flex-col gap-12">
            {competition.overview && (
              <div className="text-xl md:text-2xl text-[var(--event-text-muted)] leading-relaxed font-serif text-center">
                {competition.overview}
              </div>
            )}
            
            {(competition.theme?.title || competition.theme?.brief) && (
              <div className="ckl-event-card p-8 md:p-12 bg-[#faf9f8] border-none mt-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--event-accent-light)] rounded-full blur-[40px] opacity-60 -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-[10px] font-bold text-[var(--event-accent)] uppercase tracking-[0.2em] mb-4">Official Theme</h3>
                {competition.theme.title && (
                  <h4 className="text-3xl md:text-4xl font-serif font-bold text-[#111] mb-6">
                    {competition.theme.title}
                  </h4>
                )}
                {competition.theme.brief && (
                  <p className="text-[#555] text-lg leading-relaxed whitespace-pre-wrap">
                    {competition.theme.brief}
                  </p>
                )}
                
                {competition.theme.allowedGenres?.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-[var(--event-border)]">
                    <h5 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-4">Allowed Genres</h5>
                    <div className="flex flex-wrap gap-2">
                      {competition.theme.allowedGenres.map((genre, i) => (
                        <span key={i} className="ckl-event-badge ckl-event-badge--neutral">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {competition.eligibility && (
                <div className="p-6 rounded-2xl bg-white border border-[var(--event-border)] shadow-sm">
                  <h5 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-3">Eligibility</h5>
                  <p className="text-[#444] leading-relaxed">{competition.eligibility}</p>
                </div>
              )}
              {competition.format && (
                <div className="p-6 rounded-2xl bg-white border border-[var(--event-border)] shadow-sm">
                  <h5 className="text-xs font-bold text-[#888] uppercase tracking-widest mb-3">Format</h5>
                  <p className="text-[#444] leading-relaxed">{competition.format}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
