import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, HelpCircle, ChevronDown } from 'lucide-react';

const FAQItem = ({ item, isOpen, onClick }) => {
  return (
    <div className={`faq-item ${isOpen ? 'open' : ''}`}>
      <button className="faq-question" onClick={onClick} aria-expanded={isOpen}>
        <span>{item.q}</span>
        <ChevronDown size={20} className="faq-icon" />
      </button>
      <div className="faq-answer-wrapper">
        <div className="faq-answer">
          <p>{item.a}</p>
        </div>
      </div>
    </div>
  );
};

const EventRules = ({ rules = [], faq = [] }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const hasRules = rules && rules.length > 0;
  const hasFaq = faq && faq.length > 0;

  if (!hasRules && !hasFaq) {
    return (
      <section className="rules-section coming-soon-section" ref={sectionRef}>
        <div className="section-container">
          <div className="coming-soon-card">
            <ShieldCheck size={48} className="coming-soon-icon" />
            <h3>Guidelines & FAQ</h3>
            <p>Rules and frequently asked questions will be posted here soon.</p>
          </div>
        </div>
        <style>{`
          .rules-section { padding: 4rem 2rem; background: var(--event-bg, #FFFFFF); color: var(--event-text, #111); }
          .section-container { max-width: 1200px; margin: 0 auto; }
          .coming-soon-card { background: var(--event-surface, #F8F6F2); border: 1px dashed var(--event-border, #E5E5E5); border-radius: var(--event-radius-lg, 12px); padding: 5rem 2rem; text-align: center; }
          .coming-soon-icon { color: var(--event-accent, #8A3B2E); margin-bottom: 1.5rem; opacity: 0.5; }
          .coming-soon-card h3 { font-size: 1.5rem; margin: 0 0 1rem 0; font-family: var(--ck-serif, serif); }
          .coming-soon-card p { color: var(--event-text-muted, #555); margin: 0; }
        `}</style>
      </section>
    );
  }

  return (
    <section className={`rules-section ${isVisible ? 'fade-in' : 'hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="rules-layout">
          <div className="rules-column">
            <div className="column-header">
              <ShieldCheck size={24} className="column-icon" />
              <h2 className="column-title">Rules & Guidelines</h2>
            </div>
            
            {!hasRules ? (
              <div className="column-coming-soon">
                <p>Rules will be announced soon.</p>
              </div>
            ) : (
              <div className="rules-list">
                {rules.map((rule, idx) => (
                  <div key={idx} className="rule-card" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="rule-number">{idx + 1}</div>
                    <div className="rule-content">
                      <p>{rule}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="faq-column">
            <div className="column-header">
              <HelpCircle size={24} className="column-icon" />
              <h2 className="column-title">FAQ</h2>
            </div>
            
            {!hasFaq ? (
              <div className="column-coming-soon">
                <p>FAQs will be posted soon.</p>
              </div>
            ) : (
              <div className="faq-list">
                {faq.map((item, idx) => (
                  <FAQItem 
                    key={idx} 
                    item={item} 
                    isOpen={openFaqIndex === idx} 
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .rules-section { padding: 5rem 2rem; background: var(--event-bg, #FFFFFF); color: var(--event-text, #111); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hidden { opacity: 0; transform: translateY(20px); }
        .fade-in { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        
        .rules-layout { display: grid; grid-template-columns: 1fr; gap: 4rem; }
        @media (min-width: 1024px) { .rules-layout { grid-template-columns: 1fr 1fr; gap: 6rem; } }
        
        .column-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--event-surface, #F8F6F2); }
        .column-icon { color: var(--event-accent, #8A3B2E); }
        .column-title { font-size: 2rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); }
        
        .column-coming-soon { background: var(--event-surface, #F8F6F2); padding: 3rem; border-radius: var(--event-radius-md, 8px); text-align: center; color: var(--event-text-muted, #555); border: 1px dashed var(--event-border, #E5E5E5); }
        
        /* Rules Styles */
        .rules-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .rule-card { display: flex; gap: 1.25rem; background: var(--event-surface, #F8F6F2); padding: 1.5rem; border-radius: var(--event-radius-md, 8px); transition: transform 0.2s ease, box-shadow 0.2s ease; border: 1px solid transparent; }
        .rule-card:hover { transform: translateY(-2px); border-color: var(--event-border, #E5E5E5); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        
        .rule-number { flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--event-accent, #8A3B2E); color: white; font-weight: 700; font-size: 0.875rem; border-radius: 50%; }
        .rule-content p { margin: 0; color: var(--event-text, #111); line-height: 1.6; }
        
        /* FAQ Styles */
        .faq-list { display: flex; flex-direction: column; gap: 1rem; }
        .faq-item { background: var(--event-bg, #FFFFFF); border: 1px solid var(--event-border, #E5E5E5); border-radius: var(--event-radius-md, 8px); overflow: hidden; transition: border-color 0.2s ease; }
        .faq-item:hover { border-color: var(--event-accent, #8A3B2E); }
        .faq-item.open { border-color: var(--event-accent, #8A3B2E); background: var(--event-surface, #F8F6F2); }
        
        .faq-question { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; background: none; border: none; text-align: left; font-size: 1.125rem; font-weight: 600; color: var(--event-text, #111); cursor: pointer; font-family: var(--ck-sans, sans-serif); }
        .faq-icon { color: var(--event-text-muted, #555); transition: transform 0.3s ease; flex-shrink: 0; margin-left: 1rem; }
        .faq-item.open .faq-icon { transform: rotate(180deg); color: var(--event-accent, #8A3B2E); }
        
        .faq-answer-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
        .faq-item.open .faq-answer-wrapper { grid-template-rows: 1fr; }
        .faq-answer { overflow: hidden; }
        .faq-answer p { margin: 0; padding: 0 1.5rem 1.5rem 1.5rem; color: var(--event-text-muted, #555); line-height: 1.6; }
      `}</style>
    </section>
  );
};

export default EventRules;
