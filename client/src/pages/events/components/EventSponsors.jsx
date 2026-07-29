import React from "react";

export default function EventSponsors({ sponsors }) {
  if (!sponsors || sponsors.length === 0) return null;

  return (
    <section className="ckl-event-section bg-white">
      <div className="ckl-event-container">
        <h2 className="text-sm font-bold text-[#888] uppercase tracking-[0.2em] text-center mb-12">
          Backed by Industry Leaders
        </h2>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {sponsors.map((sponsor, idx) => (
            <a 
              key={idx}
              href={sponsor.url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center justify-center p-6 transition-all duration-300 ${sponsor.url ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
              title={sponsor.name}
            >
              {sponsor.logoUrl ? (
                <img 
                  src={sponsor.logoUrl} 
                  alt={sponsor.name} 
                  className="max-h-12 md:max-h-16 w-auto object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                  loading="lazy"
                />
              ) : (
                <span className="text-2xl font-serif font-bold text-[#aaa] group-hover:text-[#111] transition-colors">
                  {sponsor.name}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
