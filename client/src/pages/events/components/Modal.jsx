import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, children, title }) {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="ckl-event-modal-overlay" onClick={onClose}>
      <div 
        className="ckl-event-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--event-surface-hover)] transition-colors text-[var(--event-text-faint)]"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
          
          {title && (
            <h3 className="text-2xl font-serif font-bold text-[var(--event-text)] mb-6 pr-12">
              {title}
            </h3>
          )}
          
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
