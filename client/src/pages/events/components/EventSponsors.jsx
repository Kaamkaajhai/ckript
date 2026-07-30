import React, { useState, useEffect, useRef } from 'react';
import { Star, ExternalLink, ShieldCheck } from 'lucide-react';

const EventSponsors = ({ sponsors = [] }) => {
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
    <section className={`sponsors-section ${isVisible ? 'ckl-fade-visible' : 'ckl-fade-hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <Star size={16} />
            <span>Partners</span>
          </div>
          <h2 className="section-title">Event Sponsors</h2>
        </div>
        <div className="coming-soon-card">
          <div className="coming-soon-icon-wrapper">
            <ShieldCheck size={40} className="coming-soon-icon" />
          </div>
          <h3>To Be Announced</h3>
          <p>We are currently onboarding our amazing partners and sponsors for this event.</p>
        </div>
      </div>
      <style>{`
        .sponsors-section { padding: 6rem 2rem; background-color: #F8F6F2; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .ckl-fade-hidden { opacity: 0; transform: translateY(20px); }
        .ckl-fade-visible { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        .coming-soon-card { background: #FFFFFF; border: 1px solid rgba(138, 59, 46, 0.1); border-radius: 12px; padding: 5rem 2rem; text-align: center; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.03); transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .coming-soon-card:hover { transform: translateY(-5px); box-shadow: 0 15px 40px rgba(0,0,0,0.06); }
        .coming-soon-icon-wrapper { width: 80px; height: 80px; background: #F8F6F2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .coming-soon-icon { color: #c97a5f; }
        .coming-soon-card h3 { font-family: var(--ck-serif, serif); font-size: 1.75rem; color: #111111; margin: 0 0 1rem 0; }
        .coming-soon-card p { color: #555555; font-size: 1.125rem; margin: 0; max-width: 500px; margin: 0 auto; line-height: 1.6; }
      `}</style>
    </section>
  );

  if (!sponsors || sponsors.length === 0) {
    return renderComingSoon();
  }

  // Group sponsors by tier if available, otherwise just use standard array
  const groupedSponsors = sponsors.reduce((acc, sponsor) => {
    const tier = sponsor.tier || 'partner';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(sponsor);
    return acc;
  }, {});

  const tierOrder = ['title', 'platinum', 'gold', 'silver', 'bronze', 'partner'];
  const sortedTiers = Object.keys(groupedSponsors).sort((a, b) => {
    const idxA = tierOrder.indexOf(a.toLowerCase());
    const idxB = tierOrder.indexOf(b.toLowerCase());
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <section className={`sponsors-section ${isVisible ? 'ckl-fade-visible' : 'ckl-fade-hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <Star size={16} />
            <span>Partners</span>
          </div>
          <h2 className="section-title">Event Sponsors</h2>
        </div>

        <div className="sponsors-content">
          {sortedTiers.map(tier => (
            <div key={tier} className="sponsor-tier-group">
              <h3 className="tier-title">{tier} Sponsors</h3>
              <div className={`sponsors-grid tier-${tier.toLowerCase()}`}>
                {groupedSponsors[tier].map((sponsor, idx) => (
                  <a 
                    key={idx} 
                    href={sponsor.websiteUrl || '#'} 
                    target={sponsor.websiteUrl ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="sponsor-card"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="sponsor-logo-container">
                      {sponsor.logoUrl ? (
                        <img src={sponsor.logoUrl} alt={sponsor.name} className="sponsor-logo" />
                      ) : (
                        <span className="sponsor-name-fallback">{sponsor.name}</span>
                      )}
                    </div>
                    {sponsor.websiteUrl && (
                      <div className="sponsor-hover-overlay">
                        <ExternalLink size={24} className="external-icon" />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .sponsors-section { padding: 6rem 2rem; background-color: #F8F6F2; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .ckl-fade-hidden { opacity: 0; transform: translateY(20px); }
        .ckl-fade-visible { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 5rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        
        .sponsors-content { display: flex; flex-direction: column; gap: 4rem; }
        .sponsor-tier-group { text-align: center; }
        
        .tier-title { font-size: 1.25rem; font-weight: 600; color: #8A3B2E; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2rem; display: flex; align-items: center; justify-content: center; gap: 1rem; }
        .tier-title::before, .tier-title::after { content: ''; height: 1px; width: 40px; background-color: rgba(138,59,46,0.3); }
        
        .sponsors-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; }
        
        .sponsor-card { position: relative; display: flex; align-items: center; justify-content: center; background: #FFFFFF; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: all 0.3s ease; text-decoration: none; overflow: hidden; }
        .sponsor-card:hover { transform: translateY(-5px); box-shadow: 0 15px 30px rgba(0,0,0,0.08); border-color: rgba(138,59,46,0.2); }
        
        /* Tier specific sizing */
        .tier-title .sponsor-card, .tier-platinum .sponsor-card { width: 100%; max-width: 400px; height: 200px; }
        .tier-gold .sponsor-card { width: calc(50% - 1rem); max-width: 300px; height: 160px; }
        .tier-silver .sponsor-card, .tier-bronze .sponsor-card, .tier-partner .sponsor-card { width: calc(33.333% - 1.5rem); max-width: 220px; height: 120px; }
        
        @media (max-width: 768px) {
          .tier-gold .sponsor-card, .tier-silver .sponsor-card, .tier-bronze .sponsor-card, .tier-partner .sponsor-card { width: calc(50% - 1rem); }
        }
        @media (max-width: 480px) {
          .tier-gold .sponsor-card, .tier-silver .sponsor-card, .tier-bronze .sponsor-card, .tier-partner .sponsor-card { width: 100%; max-width: 280px; }
        }

        .sponsor-logo-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .sponsor-logo { max-width: 100%; max-height: 100%; object-fit: contain; filter: grayscale(100%) opacity(0.7); transition: all 0.4s ease; }
        .sponsor-card:hover .sponsor-logo { filter: grayscale(0%) opacity(1); transform: scale(1.05); }
        
        .sponsor-name-fallback { font-family: var(--ck-serif, serif); font-size: 1.25rem; font-weight: 700; color: #111111; text-align: center; }
        
        .sponsor-hover-overlay { position: absolute; inset: 0; background: rgba(17,17,17,0.05); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; }
        .sponsor-card:hover .sponsor-hover-overlay { opacity: 1; }
        .external-icon { color: #8A3B2E; opacity: 0; transform: scale(0.8) translateY(10px); transition: all 0.3s ease; }
        .sponsor-card:hover .external-icon { opacity: 1; transform: scale(1) translateY(0); }
      `}</style>
    </section>
  );
};

export default EventSponsors;
