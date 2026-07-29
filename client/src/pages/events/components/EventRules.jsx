import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function EventRules({ rules, faq }) {
  const [openFaq, setOpenFaq] = useState(null);

  if ((!rules || rules.length === 0) && (!faq || faq.length === 0)) return null;

  return (
    <section className="ckl-event-section bg-[#f9f8f6]">
      <div className="ckl-event-container">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
          
          {/* Rules Section */}
          {rules && rules.length > 0 && (
            <div>
              <h2 className="text-4xl font-serif font-bold text-[#111] mb-8">Official Rules</h2>
              <ul className="flex flex-col gap-6">
                {rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-sm border border-[var(--event-border)]">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#f4f2f0] text-[#444] font-bold text-sm">
                      {idx + 1}
                    </span>
                    <span className="text-[#444] leading-relaxed mt-1">
                      {rule}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* FAQ Section */}
          {faq && faq.length > 0 && (
            <div>
              <h2 className="text-4xl font-serif font-bold text-[#111] mb-8">Common Questions</h2>
              <div className="flex flex-col gap-4">
                {faq.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`ckl-event-card border-none transition-all duration-300 ${isOpen ? 'shadow-md ring-1 ring-[var(--event-border)]' : 'shadow-sm'}`}
                    >
                      <button 
                        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                      >
                        <span className="font-bold text-[#222]">{item.q}</span>
                        <ChevronDown 
                          size={20} 
                          className={`text-[#888] transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <div className="px-6 pb-6 pt-2 text-[#555] leading-relaxed border-t border-[#f4f2f0] mt-2">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
