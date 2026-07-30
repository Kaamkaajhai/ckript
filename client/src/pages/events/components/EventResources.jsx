import React, { useEffect, useRef } from 'react';
import { FileText, Download, Video, ExternalLink, Users, Link as LinkIcon, MessageCircle, Twitter, Github } from 'lucide-react';

const ResourceIcon = ({ type }) => {
  switch (type?.toLowerCase()) {
    case 'document':
    case 'doc':
      return <FileText size={20} />;
    case 'video':
      return <Video size={20} />;
    case 'download':
      return <Download size={20} />;
    default:
      return <ExternalLink size={20} />;
  }
};

const CommunityIcon = ({ icon }) => {
  switch (icon?.toLowerCase()) {
    case 'discord':
    case 'slack':
    case 'chat':
      return <MessageCircle size={20} />;
    case 'twitter':
      return <Twitter size={20} />;
    case 'github':
      return <Github size={20} />;
    default:
      return <LinkIcon size={20} />;
  }
};

export default function EventResources({ resources = [], communityLinks = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = containerRef.current?.querySelectorAll('.animate-on-scroll');
    elements?.forEach((el) => observer.observe(el));

    return () => {
      elements?.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const hasResources = resources && resources.length > 0;
  const hasCommunity = communityLinks && communityLinks.length > 0;

  if (!hasResources && !hasCommunity) return null;

  return (
    <section className="event-resources-section" ref={containerRef}>
      <div className="resources-container">
        
        {/* Resources Section */}
        <div className="resources-column animate-on-scroll">
          <div className="section-header">
            <div className="icon-wrapper">
              <Download size={24} />
            </div>
            <h2>Resources & Downloads</h2>
          </div>
          
          <div className="links-list">
            {hasResources ? (
              resources.map((res, idx) => (
                <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer" className="resource-card">
                  <div className="resource-icon">
                    <ResourceIcon type={res.type} />
                  </div>
                  <span className="resource-label">{res.label}</span>
                  <ExternalLink size={16} className="arrow-icon" />
                </a>
              ))
            ) : (
              <div className="empty-state">
                <FileText size={32} className="empty-icon" />
                <p>Resources coming soon</p>
              </div>
            )}
          </div>
        </div>

        {/* Community Section */}
        <div className="resources-column animate-on-scroll">
          <div className="section-header">
            <div className="icon-wrapper">
              <Users size={24} />
            </div>
            <h2>Community & Social</h2>
          </div>
          
          <div className="links-list">
            {hasCommunity ? (
              communityLinks.map((link, idx) => (
                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="community-card">
                  <div className="community-icon">
                    <CommunityIcon icon={link.icon} />
                  </div>
                  <span className="community-label">{link.label}</span>
                  <ExternalLink size={16} className="arrow-icon" />
                </a>
              ))
            ) : (
              <div className="empty-state">
                <Users size={32} className="empty-icon" />
                <p>Community links coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .event-resources-section {
          padding: 4rem 2rem;
          background-color: var(--event-surface-alt, #F8F6F2);
          display: flex;
          justify-content: center;
        }

        .resources-container {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
        }

        @media (min-width: 768px) {
          .resources-container {
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
          }
        }

        .resources-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background-color: var(--event-bg, #FFFFFF);
          color: var(--event-accent, #8A3B2E);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .section-header h2 {
          margin: 0;
          font-family: var(--ck-sans, system-ui, sans-serif);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--event-text, #111);
        }

        .links-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Shared Card Styles */
        .resource-card,
        .community-card {
          display: flex;
          align-items: center;
          padding: 1.25rem;
          border-radius: 12px;
          background-color: var(--event-bg, #FFFFFF);
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid var(--event-border, rgba(0,0,0,0.05));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }

        /* Resource Card Hover */
        .resource-card:hover {
          transform: translateY(-2px);
          border-color: var(--event-accent, #8A3B2E);
          box-shadow: 0 8px 16px rgba(138, 59, 46, 0.1);
        }

        .resource-card:hover .resource-label {
          color: var(--event-accent, #8A3B2E);
        }

        .resource-card:hover .arrow-icon {
          opacity: 1;
          transform: translateX(0);
          color: var(--event-accent, #8A3B2E);
        }

        /* Community Card Hover */
        .community-card:hover {
          transform: translateY(-2px);
          background-color: var(--event-text, #111);
          color: #FFFFFF;
          border-color: var(--event-text, #111);
          box-shadow: 0 8px 16px rgba(17, 17, 17, 0.2);
        }

        .community-card:hover .community-label {
          color: #FFFFFF;
        }
        
        .community-card:hover .community-icon {
          color: #FFFFFF;
          background-color: rgba(255, 255, 255, 0.1);
        }

        .community-card:hover .arrow-icon {
          opacity: 1;
          transform: translateX(0);
          color: #FFFFFF;
        }

        .resource-icon,
        .community-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background-color: var(--event-surface-alt, #F8F6F2);
          color: var(--event-text-muted, #555);
          margin-right: 1rem;
          transition: all 0.2s ease;
        }

        .resource-label,
        .community-label {
          flex: 1;
          font-family: var(--ck-sans, system-ui, sans-serif);
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--event-text, #111);
          transition: color 0.2s ease;
        }

        .arrow-icon {
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.2s ease;
          color: var(--event-text-muted, #555);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background-color: var(--event-bg, #FFFFFF);
          border-radius: 12px;
          border: 1px dashed var(--event-border, rgba(0,0,0,0.1));
          text-align: center;
          color: var(--event-text-muted, #555);
        }

        .empty-icon {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state p {
          margin: 0;
          font-family: var(--ck-sans, system-ui, sans-serif);
          font-size: 1rem;
          font-weight: 500;
        }

        /* Animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .animate-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-on-scroll {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .resource-card,
          .community-card,
          .arrow-icon {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}
