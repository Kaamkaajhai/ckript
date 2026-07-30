import React, { useState, useEffect, useRef } from 'react';
import { Users, Linkedin, Film, Award } from 'lucide-react';
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

  const sortedJudges = [...(judges || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  const renderComingSoon = () => (
    <section className={`judges-section ${isVisible ? 'fade-in' : 'hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <Users size={16} />
            <span>Panel</span>
          </div>
          <h2 className="section-title">Meet the Judges</h2>
        </div>
        <div className="coming-soon-card">
          <div className="coming-soon-icon-wrapper">
            <Award size={40} className="coming-soon-icon" />
          </div>
          <h3>To Be Announced</h3>
          <p>Our esteemed panel of industry experts and judges will be revealed soon.</p>
        </div>
      </div>
      <style>{`
        .judges-section { padding: 6rem 2rem; background-color: #FFFFFF; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hidden { opacity: 0; transform: translateY(20px); }
        .fade-in { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        .coming-soon-card { background: #F8F6F2; border: 1px solid rgba(138, 59, 46, 0.1); border-radius: 12px; padding: 5rem 2rem; text-align: center; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.02); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .coming-soon-card:hover { transform: translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.05); }
        .coming-soon-icon-wrapper { width: 80px; height: 80px; background: #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .coming-soon-icon { color: #c97a5f; }
        .coming-soon-card h3 { font-family: var(--ck-serif, serif); font-size: 1.75rem; color: #111111; margin: 0 0 1rem 0; }
        .coming-soon-card p { color: #555555; font-size: 1.125rem; margin: 0; max-width: 500px; margin: 0 auto; line-height: 1.6; }
      `}</style>
    </section>
  );

  if (!judges || judges.length === 0) {
    return renderComingSoon();
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
                <div className="judge-overlay">
                  <span className="view-profile-text">View Profile</span>
                </div>
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
        .judges-section { padding: 6rem 2rem; background-color: #FFFFFF; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hidden { opacity: 0; transform: translateY(20px); }
        .fade-in { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        
        .judges-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
        @media (min-width: 640px) { .judges-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .judges-grid { grid-template-columns: repeat(3, 1fr); gap: 3rem; } }
        @media (min-width: 1280px) { .judges-grid { grid-template-columns: repeat(4, 1fr); } }
        
        .judge-card { cursor: pointer; transition: transform 0.3s ease; position: relative; }
        .judge-card:hover { transform: translateY(-8px); }
        
        .judge-photo-container { position: relative; width: 100%; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 12px; margin-bottom: 1.5rem; background: #F8F6F2; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .judge-photo { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease, filter 0.3s ease; }
        .judge-card:hover .judge-photo { transform: scale(1.08); filter: brightness(0.9); }
        .judge-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; color: #8A3B2E; font-family: var(--ck-serif, serif); background: #F8F6F2; opacity: 0.5; }
        
        .judge-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(17,17,17,0.7), transparent); opacity: 0; transition: opacity 0.3s ease; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 1.5rem; }
        .judge-card:hover .judge-overlay { opacity: 1; }
        .view-profile-text { color: #FFFFFF; font-weight: 600; font-size: 0.875rem; letter-spacing: 0.05em; text-transform: uppercase; transform: translateY(10px); transition: transform 0.3s ease; }
        .judge-card:hover .view-profile-text { transform: translateY(0); }
        
        .featured-badge { position: absolute; top: 1rem; right: 1rem; background: #8A3B2E; color: #FFFFFF; font-size: 0.75rem; font-weight: 600; padding: 0.35rem 0.875rem; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; z-index: 2; box-shadow: 0 4px 10px rgba(138,59,46,0.3); }
        
        .judge-info { text-align: center; }
        .judge-name { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.35rem 0; font-family: var(--ck-serif, serif); color: #111111; }
        .judge-title { font-size: 0.875rem; color: #8A3B2E; font-weight: 600; margin: 0 0 0.35rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .judge-company { font-size: 1rem; color: #555555; margin: 0; }
        
        /* Modal Styles */
        .judge-modal-content { padding: 2rem; color: #111111; background: #FFFFFF; border-radius: 16px; font-family: var(--ck-sans, sans-serif); }
        .judge-modal-header { display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2rem; }
        @media (min-width: 640px) { .judge-modal-header { flex-direction: row; align-items: flex-start; } }
        
        .modal-photo { width: 140px; flex-shrink: 0; aspect-ratio: 4/5; border-radius: 12px; margin-bottom: 0; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        @media (min-width: 640px) { .modal-photo { width: 180px; } }
        
        .modal-name { font-size: 2.25rem; font-weight: 700; margin: 0 0 0.5rem 0; font-family: var(--ck-serif, serif); color: #111111; }
        .modal-title { font-size: 1.125rem; color: #8A3B2E; font-weight: 600; margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.05em; }
        .modal-company { font-size: 1.125rem; color: #555555; margin: 0 0 1.5rem 0; }
        
        .modal-links { display: flex; gap: 1rem; }
        .social-link { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: #F8F6F2; color: #111111; transition: all 0.3s ease; }
        .social-link:hover { background: #c97a5f; color: #FFFFFF; transform: translateY(-3px); box-shadow: 0 6px 15px rgba(201,122,95,0.3); }
        
        .judge-modal-bio h4 { font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem 0; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(138,59,46,0.1); font-family: var(--ck-serif, serif); color: #111111; }
        .judge-modal-bio p { color: #555555; line-height: 1.7; white-space: pre-wrap; font-size: 1.05rem; }
      `}</style>
    </section>
  );
};

export default EventJudges;
