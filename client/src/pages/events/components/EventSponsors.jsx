import React, { useState, useEffect, useRef } from 'react';
import { Handshake } from 'lucide-react';

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

  const publicSponsors = (sponsors || []).filter(s => s.visibility === 'public');
  
  if (publicSponsors.length === 0) {
    return (
      <section className="sponsors-section coming-soon-section" ref={sectionRef}>
        <div className="section-container">
          <div className="section-header">
            <div className="section-label">
              <Handshake size={16} />
              <span>Partners</span>
            </div>
            <h2 className="section-title">Our Sponsors</h2>
          </div>
          <div className="coming-soon-card">
            <p>Sponsors will be announced soon.</p>
          </div>
        </div>
        <style>{`
          .sponsors-section { padding: 4rem 2rem; background: var(--event-surface, #F8F6F2); color: var(--event-text, #111); }
          .section-container { max-width: 1200px; margin: 0 auto; }
          .section-header { text-align: center; margin-bottom: 3rem; }
          .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--event-accent, #8A3B2E); font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
          .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); }
          .coming-soon-card { background: var(--event-bg, #FFFFFF); border: 1px dashed var(--event-border, #E5E5E5); border-radius: var(--event-radius-lg, 12px); padding: 4rem 2rem; text-align: center; color: var(--event-text-muted, #555); font-weight: 500; }
        `}</style>
      </section>
    );
  }

  const hasTiers = publicSponsors.some(s => s.tier);
  
  let groupedSponsors = {};
  if (hasTiers) {
    publicSponsors.forEach(s => {
      const tier = s.tier || 'Other';
      if (!groupedSponsors[tier]) groupedSponsors[tier] = [];
      groupedSponsors[tier].push(s);
    });
  }

  const renderSponsorGrid = (sponsorList) => (
    <div className="sponsors-grid">
      {sponsorList.map((sponsor, idx) => {
        const Wrapper = sponsor.url ? 'a' : 'div';
        const wrapperProps = sponsor.url ? { href: sponsor.url, target: "_blank", rel: "noopener noreferrer" } : {};
        
        return (
          <Wrapper key={idx} className="sponsor-card" {...wrapperProps}>
            {sponsor.logoUrl ? (
              <img src={sponsor.logoUrl} alt={sponsor.name} className="sponsor-logo" />
            ) : (
              <div className="sponsor-text-fallback">{sponsor.name}</div>
            )}
          </Wrapper>
        );
      })}
    </div>
  );

  return (
    <section className={`sponsors-section ${isVisible ? 'fade-in' : 'hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <Handshake size={16} />
            <span>Partners</span>
          </div>
          <h2 className="section-title">Our Sponsors</h2>
        </div>

        {hasTiers ? (
          <div className="sponsors-tiers">
            {Object.entries(groupedSponsors).map(([tier, tierSponsors]) => (
              <div key={tier} className="sponsor-tier-group">
                <h3 className="tier-title">{tier}</h3>
                {renderSponsorGrid(tierSponsors)}
              </div>
            ))}
          </div>
        ) : (
          renderSponsorGrid(publicSponsors)
        )}
      </div>

      <style>{`
        .sponsors-section { padding: 5rem 2rem; background: var(--event-surface, #F8F6F2); color: var(--event-text, #111); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hidden { opacity: 0; transform: translateY(20px); }
        .fade-in { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--event-accent, #8A3B2E); font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); }
        
        .sponsor-tier-group { margin-bottom: 4rem; }
        .sponsor-tier-group:last-child { margin-bottom: 0; }
        .tier-title { text-align: center; font-size: 1.5rem; font-weight: 600; color: var(--event-text-muted, #555); margin-bottom: 2rem; text-transform: capitalize; font-family: var(--ck-serif, serif); }
        
        .sponsors-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; }
        @media (min-width: 768px) { .sponsors-grid { gap: 3rem; } }
        
        .sponsor-card { display: flex; align-items: center; justify-content: center; width: 160px; height: 100px; background: var(--event-bg, #FFFFFF); border-radius: var(--event-radius-md, 8px); padding: 1.5rem; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        @media (min-width: 768px) { .sponsor-card { width: 220px; height: 120px; padding: 2rem; } }
        
        a.sponsor-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        
        .sponsor-logo { max-width: 100%; max-height: 100%; object-fit: contain; filter: grayscale(100%) opacity(0.7); transition: all 0.3s ease; }
        a.sponsor-card:hover .sponsor-logo { filter: grayscale(0%) opacity(1); transform: scale(1.05); }
        
        .sponsor-text-fallback { font-weight: 700; font-size: 1.125rem; color: var(--event-text-muted, #555); text-align: center; font-family: var(--ck-serif, serif); transition: color 0.3s ease; }
        a.sponsor-card:hover .sponsor-text-fallback { color: var(--event-accent, #8A3B2E); }
      `}</style>
    </section>
  );
};

export default EventSponsors;
