import React, { useState } from "react";
import { X, ExternalLink } from "lucide-react";

export default function EventJudges({ judges }) {
  const [selectedJudge, setSelectedJudge] = useState(null);

  if (!judges || judges.length === 0) return null;

  return (
    <section className="ckl-event-section bg-[var(--event-bg)]">
      <div className="ckl-event-container">
        <h2 className="ckl-event-section-title text-center">Meet the Judges</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {judges.map((judge, idx) => (
            <div 
              key={idx} 
              className="ckl-event-card group cursor-pointer"
              onClick={() => setSelectedJudge(judge)}
            >
              <div className="aspect-[4/5] bg-[#eaeaea] relative overflow-hidden">
                {judge.photoUrl ? (
                  <img 
                    src={judge.photoUrl} 
                    alt={judge.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-serif text-[#ccc]">
                    {judge.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                  <h4 className="text-xl font-bold mb-1">{judge.name}</h4>
                  <p className="text-sm text-white/80 font-medium">{judge.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Judge Modal */}
      {selectedJudge && (
        <div className="ckl-event-modal-overlay" onClick={() => setSelectedJudge(null)}>
          <div className="ckl-event-modal-content max-w-3xl flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-full md:w-2/5 aspect-square md:aspect-auto bg-[#eaeaea]">
               {selectedJudge.photoUrl ? (
                  <img src={selectedJudge.photoUrl} alt={selectedJudge.name} className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-serif text-[#ccc]">
                    {selectedJudge.name.charAt(0)}
                  </div>
               )}
            </div>
            <div className="p-8 md:p-12 w-full md:w-3/5 flex flex-col">
              <button 
                onClick={() => setSelectedJudge(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[#f4f2f0] transition-colors text-[#888]"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-3xl font-serif font-bold text-[#111] mb-2">{selectedJudge.name}</h3>
              <p className="text-lg text-[var(--event-accent)] font-medium mb-8">{selectedJudge.title}</p>
              
              <div className="prose prose-sm text-[#555] leading-relaxed mb-auto">
                <p>{selectedJudge.bio || "Industry professional."}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
