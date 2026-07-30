import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Download, Link as LinkIcon, FileText, Layers } from 'lucide-react';

const EventResources = ({ resources = [] }) => {
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
    <section className={`resources-section ${isVisible ? 'fade-in' : 'hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <BookOpen size={16} />
            <span>Materials</span>
          </div>
          <h2 className="section-title">Event Resources</h2>
        </div>
        <div className="coming-soon-card">
          <div className="coming-soon-icon-wrapper">
            <Layers size={40} className="coming-soon-icon" />
          </div>
          <h3>To Be Announced</h3>
          <p>Check back soon for downloadable assets, guidelines, and other important event materials.</p>
        </div>
      </div>
      <style>{`
        .resources-section { padding: 6rem 2rem; background-color: #FFFFFF; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
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

  if (!resources || resources.length === 0) {
    return renderComingSoon();
  }

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'download':
      case 'pdf':
      case 'document':
        return <Download size={24} />;
      case 'link':
      case 'website':
        return <LinkIcon size={24} />;
      default:
        return <FileText size={24} />;
    }
  };

  return (
    <section className={`resources-section ${isVisible ? 'fade-in' : 'hidden'}`} ref={sectionRef}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-label">
            <BookOpen size={16} />
            <span>Materials</span>
          </div>
          <h2 className="section-title">Event Resources</h2>
        </div>

        <div className="resources-grid">
          {resources.map((resource, idx) => (
            <a 
              key={idx} 
              href={resource.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="resource-card"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="resource-icon-wrapper">
                {getIcon(resource.type)}
              </div>
              <div className="resource-info">
                <h3 className="resource-title">{resource.title}</h3>
                {resource.description && <p className="resource-desc">{resource.description}</p>}
              </div>
              <div className="resource-action">
                <span className="action-text">{resource.type === 'link' ? 'Visit' : 'Download'}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style>{`
        .resources-section { padding: 6rem 2rem; background-color: #FFFFFF; color: #111111; font-family: var(--ck-sans, sans-serif); transition: opacity 0.8s ease, transform 0.8s ease; }
        .hidden { opacity: 0; transform: translateY(20px); }
        .fade-in { opacity: 1; transform: translateY(0); }
        .section-container { max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { display: inline-flex; align-items: center; gap: 0.5rem; color: #8A3B2E; font-weight: 600; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
        .section-title { font-size: 2.5rem; font-weight: 700; margin: 0; font-family: var(--ck-serif, serif); color: #111111; }
        
        .resources-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; max-width: 900px; margin: 0 auto; }
        @media (min-width: 768px) { .resources-grid { grid-template-columns: repeat(2, 1fr); gap: 2rem; } }
        
        .resource-card { display: flex; align-items: center; gap: 1.5rem; background: #F8F6F2; padding: 2rem; border-radius: 12px; border: 1px solid transparent; text-decoration: none; color: inherit; transition: all 0.3s ease; }
        .resource-card:hover { transform: translateY(-5px); background: #FFFFFF; border-color: rgba(138,59,46,0.2); box-shadow: 0 15px 35px rgba(0,0,0,0.06); }
        
        .resource-icon-wrapper { width: 60px; height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #FFFFFF; color: #c97a5f; border-radius: 12px; transition: all 0.3s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.03); }
        .resource-card:hover .resource-icon-wrapper { background: #8A3B2E; color: #FFFFFF; transform: scale(1.05); }
        
        .resource-info { flex-grow: 1; }
        .resource-title { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem 0; font-family: var(--ck-serif, serif); color: #111111; transition: color 0.3s ease; }
        .resource-card:hover .resource-title { color: #8A3B2E; }
        .resource-desc { font-size: 0.95rem; color: #555555; margin: 0; line-height: 1.5; }
        
        .resource-action { margin-left: auto; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; }
        .resource-card:hover .resource-action { opacity: 1; transform: translateX(0); }
        .action-text { font-size: 0.875rem; font-weight: 600; color: #8A3B2E; text-transform: uppercase; letter-spacing: 0.05em; }
      `}</style>
    </section>
  );
};

export default EventResources;
