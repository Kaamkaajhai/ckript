import React, { useState, useEffect, useRef } from 'react';
import { Users, Linkedin, Film } from 'lucide-react';
import Modal from './Modal';

const EventJudges = ({ judges = [] }) => {
  const [selectedJudge, setSelectedJudge] = useState(null);
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

  const sortedJudges = [...judges].sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!judges || judges.length === 0) {
    return (
      <section className="judges-section coming-soon-section" ref={sectionRef}>
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">
              <Users size={16} />
              <span>Panel</span>
            </div>
            <h2 className="section-title">Meet the Judges</h2>
          </div>
          <div className="coming-soon-card">
            <p>Judges will be announced soon.</p>
          </div>
        </div>
        <style>{`
          .judges-section { padding: 4rem 2rem; background: var(--event-bg, #FFFFFF); color: var(--event-text, #111); }
          .section-container { max-width: 1200px; margin: 0 auto; }
          .section-header { text-align: center; margin-bottom: 3rem; }
          .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--event-accent, #8A3B2E); font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
          .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); }
          .coming-soon-card { background: var(--event-surface, #F8F6F2); border: 1px dashed var(--event-border, #E5E5E5); border-radius: var(--event-radius-lg, 12px); padding: 4rem 2rem; text-align: center; color: var(--event-text-muted, #555); font-weight: 500; }
        `}</style>
      </section>
    );
  }

  return (
    <section className={`judges-section ${isVisible ? 'fade-in' : 'hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <Users size={16} />
            <span>Panel</span>
          </div>
          <h2 className="section-title">Meet the Judges</h2>
        </div>

        <div className="judges-grid">
          {sortedJudges.map((judge, idx) => (
            <div 
              key={idx} 
              className="judge-card"
              onClick={() => setSelectedJudge(judge)}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="judge-photo-container">
                {judge.photoUrl ? (
                  <img src={judge.photoUrl} alt={judge.name} className="judge-photo" />
                ) : (
                  <div className="judge-photo-placeholder">
                    <span>{judge.name ? judge.name.charAt(0) : '?'}</span>
                  </div>
                )}
                {judge.featured && <span className="featured-badge">Featured</span>}
              </div>
              <div className="judge-info">
                <h3 className="judge-name">{judge.name}</h3>
                <p className="judge-title">{judge.title}</p>
                {judge.company && <p className="judge-company">{judge.company}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedJudge && (
        <Modal isOpen={!!selectedJudge} onClose={() => setSelectedJudge(null)}>
          <div className="judge-modal-content">
            <div className="judge-modal-header">
              <div className="judge-photo-container modal-photo">
                {selectedJudge.photoUrl ? (
                  <img src={selectedJudge.photoUrl} alt={selectedJudge.name} className="judge-photo" />
                ) : (
                  <div className="judge-photo-placeholder">
                    <span>{selectedJudge.name ? selectedJudge.name.charAt(0) : '?'}</span>
                  </div>
                )}
              </div>
              <div className="judge-modal-info">
                <h3 className="modal-name">{selectedJudge.name}</h3>
                <p className="modal-title">{selectedJudge.title}</p>
                {selectedJudge.company && <p className="modal-company">{selectedJudge.company}</p>}
                
                <div className="modal-links">
                  {selectedJudge.linkedin && (
                    <a href={selectedJudge.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">
                      <Linkedin size={20} />
                    </a>
                  )}
                  {selectedJudge.imdb && (
                    <a href={selectedJudge.imdb} target="_blank" rel="noopener noreferrer" className="social-link">
                      <Film size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            {selectedJudge.bio && (
              <div className="judge-modal-bio">
                <h4>About</h4>
                <p>{selectedJudge.bio}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <style>{`
        .judges-section { padding: 5rem 2rem; background: var(--event-bg, #FFFFFF); color: var(--event-text, #111); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hidden { opacity: 0; transform: translateY(20px); }
        .fade-in { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--event-accent, #8A3B2E); font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); }
        
        .judges-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
        @media (min-width: 640px) { .judges-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .judges-grid { grid-template-columns: repeat(3, 1fr); gap: 3rem; } }
        @media (min-width: 1280px) { .judges-grid { grid-template-columns: repeat(4, 1fr); } }
        
        .judge-card { cursor: pointer; transition: transform 0.2s ease; }
        .judge-card:hover { transform: translateY(-4px); }
        
        .judge-photo-container { position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden; border-radius: var(--event-radius-md, 8px); margin-bottom: 1.25rem; background: var(--event-surface, #F8F6F2); }
        .judge-photo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .judge-card:hover .judge-photo { transform: scale(1.05); }
        .judge-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: var(--event-text-muted, #555); font-family: var(--ck-serif, serif); }
        
        .featured-badge { position: absolute; top: 1rem; right: 1rem; background: var(--event-accent, #8A3B2E); color: white; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .judge-info { text-align: center; }
        .judge-name { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.25rem 0; font-family: var(--ck-serif, serif); }
        .judge-title { font-size: 0.875rem; color: var(--event-accent, #8A3B2E); font-weight: 600; margin: 0 0 0.25rem 0; }
        .judge-company { font-size: 0.875rem; color: var(--event-text-muted, #555); margin: 0; }
        
        /* Modal Styles */
        .judge-modal-content { padding: 1rem; color: var(--event-text, #111); }
        .judge-modal-header { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem; }
        @media (min-width: 640px) { .judge-modal-header { flex-direction: row; align-items: center; } }
        
        .modal-photo { width: 120px; flex-shrink: 0; aspect-ratio: 4/5; }
        @media (min-width: 640px) { .modal-photo { width: 160px; } }
        
        .modal-name { font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem 0; font-family: var(--ck-serif, serif); }
        .modal-title { font-size: 1.125rem; color: var(--event-accent, #8A3B2E); font-weight: 600; margin: 0 0 0.25rem 0; }
        .modal-company { font-size: 1rem; color: var(--event-text-muted, #555); margin: 0 0 1rem 0; }
        
        .modal-links { display: flex; gap: 1rem; }
        .social-link { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--event-surface, #F8F6F2); color: var(--event-text, #111); transition: all 0.2s ease; }
        .social-link:hover { background: var(--event-accent, #8A3B2E); color: white; }
        
        .judge-modal-bio h4 { font-size: 1.125rem; font-weight: 600; margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid var(--event-border, #E5E5E5); }
        .judge-modal-bio p { color: var(--event-text-muted, #555); line-height: 1.6; white-space: pre-wrap; }
      `}</style>
    </section>
  );
};

export default EventJudges;
