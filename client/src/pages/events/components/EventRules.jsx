import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, FileCheck, CheckCircle2 } from 'lucide-react';

const EventRules = ({ rules = [] }) => {
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

  const renderComingSoon = () => (
    <section className={`rules-section ${isVisible ? 'ckl-fade-visible' : 'ckl-fade-hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <AlertCircle size={16} />
            <span>Guidelines</span>
          </div>
          <h2 className="section-title">Rules & Requirements</h2>
        </div>
        <div className="coming-soon-card">
          <div className="coming-soon-icon-wrapper">
            <FileCheck size={40} className="coming-soon-icon" />
          </div>
          <h3>To Be Announced</h3>
          <p>The official rules and submission guidelines will be published shortly before the event begins.</p>
        </div>
      </div>
      <style>{`
        .rules-section { padding: 6rem 2rem; background-color: #F8F6F2; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .ckl-fade-hidden { opacity: 0; transform: translateY(20px); }
        .ckl-fade-visible { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        .coming-soon-card { background: #FFFFFF; border: 1px solid rgba(138, 59, 46, 0.1); border-radius: 12px; padding: 5rem 2rem; text-align: center; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.02); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .coming-soon-card:hover { transform: translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.05); }
        .coming-soon-icon-wrapper { width: 80px; height: 80px; background: #F8F6F2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .coming-soon-icon { color: #c97a5f; }
        .coming-soon-card h3 { font-family: var(--ck-serif, serif); font-size: 1.75rem; color: #111111; margin: 0 0 1rem 0; }
        .coming-soon-card p { color: #555555; font-size: 1.125rem; margin: 0; max-width: 500px; margin: 0 auto; line-height: 1.6; }
      `}</style>
    </section>
  );

  if (!rules || rules.length === 0) {
    return renderComingSoon();
  }

  return (
    <section className={`rules-section ${isVisible ? 'ckl-fade-visible' : 'ckl-fade-hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <AlertCircle size={16} />
            <span>Guidelines</span>
          </div>
          <h2 className="section-title">Rules & Requirements</h2>
        </div>

        <div className="rules-content">
          <div className="rules-list">
            {rules.map((rule, idx) => (
              <div 
                key={idx} 
                className="rule-item"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="rule-icon-container">
                  <CheckCircle2 size={24} className="rule-icon" />
                </div>
                <div className="rule-text">
                  {typeof rule === 'string' ? (
                    <p>{rule}</p>
                  ) : (
                    <>
                      {rule.title && <h3>{rule.title}</h3>}
                      <p>{rule.description || rule.text}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .rules-section { padding: 6rem 2rem; background-color: #F8F6F2; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .ckl-fade-hidden { opacity: 0; transform: translateY(20px); }
        .ckl-fade-visible { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        
        .rules-content { max-width: 800px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 3rem 2rem; box-shadow: 0 10px 40px rgba(0,0,0,0.03); }
        @media (min-width: 768px) { .rules-content { padding: 4rem; } }
        
        .rules-list { display: flex; flex-direction: column; gap: 2rem; }
        
        .rule-item { display: flex; gap: 1.5rem; align-items: flex-start; transition: transform 0.3s ease; }
        .rule-item:hover { transform: translateX(5px); }
        
        .rule-icon-container { flex-shrink: 0; margin-top: 0.25rem; color: #c97a5f; }
        .rule-item:hover .rule-icon-container { color: #8A3B2E; }
        
        .rule-text { flex-grow: 1; }
        .rule-text h3 { font-size: 1.25rem; font-weight: 700; font-family: var(--ck-serif, serif); color: #111111; margin: 0 0 0.5rem 0; }
        .rule-text p { font-size: 1.05rem; color: #555555; line-height: 1.6; margin: 0; }
      `}</style>
    </section>
  );
};

export default EventRules;
