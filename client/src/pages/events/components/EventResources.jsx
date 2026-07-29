import React from "react";
import { ExternalLink, Download, FileText, Link2 } from "lucide-react";

export default function EventResources({ resources, communityLinks }) {
  if ((!resources || resources.length === 0) && (!communityLinks || communityLinks.length === 0)) {
    return null;
  }

  return (
    <section className="ckl-event-section bg-white border-t border-[var(--event-border)]">
      <div className="ckl-event-container">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
          
          {/* Resources & Downloads */}
          {resources && resources.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[var(--event-bg)] rounded-xl flex items-center justify-center text-[#444]">
                  <Download size={20} />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#111]">Resources</h2>
              </div>
              
              <div className="flex flex-col gap-4">
                {resources.map((resource, idx) => (
                  <a 
                    key={idx}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-4 bg-[#faf9f8] rounded-xl hover:bg-[var(--event-accent-light)] border border-transparent hover:border-[var(--event-accent)]/20 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <FileText size={18} className="text-[#888] group-hover:text-[var(--event-accent)] transition-colors" />
                      <span className="font-bold text-[#444] group-hover:text-[var(--event-accent)] transition-colors">{resource.label}</span>
                    </div>
                    <Download size={16} className="text-[#ccc] group-hover:text-[var(--event-accent)] transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Community Links */}
          {communityLinks && communityLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[var(--event-bg)] rounded-xl flex items-center justify-center text-[#444]">
                  <Link2 size={20} />
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#111]">Community & Social</h2>
              </div>
              
              <div className="flex flex-col gap-4">
                {communityLinks.map((link, idx) => (
                  <a 
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-4 bg-[#faf9f8] rounded-xl hover:bg-[#111] hover:text-white border border-transparent transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#444] group-hover:text-white transition-colors">{link.label}</span>
                    </div>
                    <ExternalLink size={16} className="text-[#888] group-hover:text-white transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
        
      </div>
    </section>
  );
}
