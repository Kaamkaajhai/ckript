import React, { useEffect, useRef } from 'react';
import { Info, BookOpen, Layers, BarChart, Users, Layout, CheckCircle, ShieldAlert, FileText, Clock, Type, AlertCircle } from 'lucide-react';

export default function EventAbout({ competition }) {
  const observerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  if (!competition) return null;

  const Placeholder = () => <span className="coming-soon">Coming Soon</span>;
  
  const { theme } = competition;

  return (
    <div className="event-about-section">
      <style>{`
        .event-about-section {
          --event-bg: #FFFFFF;
          --event-surface: #F8F6F2;
          --event-surface-alt: #FFFFFF;
          --event-text: #111111;
          --event-text-muted: #555555;
          --event-text-faint: #888888;
          --event-accent: #8A3B2E;
          --event-accent-light: rgba(138, 59, 46, 0.1);
          --event-border: rgba(0,0,0,0.08);
          --event-border-hover: rgba(0,0,0,0.15);
          --event-radius-sm: 4px;
          --event-radius-md: 8px;
          --event-radius-lg: 12px;
          --event-radius-xl: 16px;
          --event-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
          --event-shadow-md: 0 4px 6px rgba(0,0,0,0.05);
          --event-shadow-lg: 0 10px 15px rgba(0,0,0,0.05);
          --ck-sans: system-ui, -apple-system, sans-serif;
          --ck-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 4rem 2rem;
          font-family: var(--ck-sans);
          color: var(--event-text);
        }

        .animate-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-on-scroll {
            transition: none;
            opacity: 1;
            transform: none;
          }
        }

        .animate-on-scroll.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .coming-soon {
          color: var(--event-text-faint);
          font-style: italic;
          font-size: 0.9em;
        }

        /* Overview */
        .ea-overview {
          text-align: center;
          margin-bottom: 4rem;
        }
        .ea-overview-title {
          color: var(--event-accent);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: block;
        }
        .ea-overview-text {
          font-family: var(--ck-serif);
          font-size: clamp(1.5rem, 4vw, 2.25rem);
          line-height: 1.4;
          max-width: 720px;
          margin: 0 auto;
          color: var(--event-text);
        }

        /* Classification Grid */
        .ea-grid-section {
          margin-bottom: 4rem;
        }
        .ea-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (min-width: 1024px) {
          .ea-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .ea-grid-card {
          background: var(--event-surface);
          border: 1px solid var(--event-border);
          border-radius: var(--event-radius-md);
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ea-grid-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--event-shadow-md);
          border-color: var(--event-border-hover);
        }
        .ea-grid-icon {
          color: var(--event-accent);
          margin-bottom: 0.75rem;
        }
        .ea-grid-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--event-text-muted);
          margin-bottom: 0.5rem;
        }
        .ea-grid-value {
          font-weight: 500;
          font-size: 0.95rem;
        }

        /* Section Headings */
        .ea-section-heading {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid var(--event-border);
          padding-bottom: 0.75rem;
        }

        /* Theme Section */
        .ea-theme-section {
          margin-bottom: 4rem;
        }
        .ea-theme-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .ea-theme-brief {
          white-space: pre-wrap;
          line-height: 1.6;
          color: var(--event-text-muted);
        }
        
        .ea-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .ea-badge {
          background: var(--event-surface);
          border: 1px solid var(--event-border);
          padding: 0.25rem 0.75rem;
          border-radius: 99px;
          font-size: 0.875rem;
          color: var(--event-text);
        }
        .ea-badge.warning {
          background: #FFF5F5;
          color: #C53030;
          border-color: #FEB2B2;
        }

        .ea-guidelines-card {
          background: var(--event-surface);
          border-radius: var(--event-radius-md);
          padding: 1.5rem;
          border: 1px solid var(--event-border);
        }
        .ea-guidelines-text {
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .ea-prompt-callout {
          background: var(--event-accent-light);
          border-left: 4px solid var(--event-accent);
          padding: 1.5rem;
          border-radius: 0 var(--event-radius-md) var(--event-radius-md) 0;
        }
        .ea-prompt-title {
          font-weight: 600;
          color: var(--event-accent);
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .ea-theme-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .ea-stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--event-surface-alt);
          border: 1px solid var(--event-border);
          border-radius: var(--event-radius-sm);
        }
        .ea-stat-icon {
          color: var(--event-text-muted);
        }

        /* Highlights */
        .ea-highlights-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .ea-highlight-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          font-size: 1.05rem;
          line-height: 1.5;
        }
        .ea-highlight-icon {
          color: var(--event-accent);
          flex-shrink: 0;
          margin-top: 0.125rem;
        }
      `}</style>

      {/* 1. Overview */}
      <div className="ea-overview animate-on-scroll">
        <span className="ea-overview-title">About the Event</span>
        <div className="ea-overview-text">
          {competition.overview ? competition.overview : <Placeholder />}
        </div>
      </div>

      {/* 2. Classification Grid */}
      <div className="ea-grid-section animate-on-scroll">
        <div className="ea-grid">
          <div className="ea-grid-card">
            <Info className="ea-grid-icon" size={24} strokeWidth={1.5} />
            <div className="ea-grid-label">Event Type</div>
            <div className="ea-grid-value">{competition.eventType || <Placeholder />}</div>
          </div>
          <div className="ea-grid-card">
            <BookOpen className="ea-grid-icon" size={24} strokeWidth={1.5} />
            <div className="ea-grid-label">Language</div>
            <div className="ea-grid-value">{competition.language || <Placeholder />}</div>
          </div>
          <div className="ea-grid-card">
            <Layers className="ea-grid-icon" size={24} strokeWidth={1.5} />
            <div className="ea-grid-label">Category</div>
            <div className="ea-grid-value">{competition.competitionCategory || <Placeholder />}</div>
          </div>
          <div className="ea-grid-card">
            <BarChart className="ea-grid-icon" size={24} strokeWidth={1.5} />
            <div className="ea-grid-label">Difficulty</div>
            <div className="ea-grid-value">{competition.difficulty || <Placeholder />}</div>
          </div>
          <div className="ea-grid-card">
            <Users className="ea-grid-icon" size={24} strokeWidth={1.5} />
            <div className="ea-grid-label">Eligibility</div>
            <div className="ea-grid-value">{competition.eligibility || <Placeholder />}</div>
          </div>
          <div className="ea-grid-card">
            <Layout className="ea-grid-icon" size={24} strokeWidth={1.5} />
            <div className="ea-grid-label">Format</div>
            <div className="ea-grid-value">{competition.format || <Placeholder />}</div>
          </div>
        </div>
      </div>

      {/* 3. Theme Section */}
      <div className="ea-theme-section animate-on-scroll">
        <h2 className="ea-section-heading">
          <FileText size={24} className="ea-grid-icon" style={{marginBottom: 0}} /> Theme & Guidelines
        </h2>
        
        <div className="ea-theme-content">
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              {theme?.title || <Placeholder />}
            </h3>
            <div className="ea-theme-brief">
              {theme?.brief || <Placeholder />}
            </div>
          </div>

          {/* Prompt */}
          <div className="ea-prompt-callout">
            <div className="ea-prompt-title">
              <AlertCircle size={18} /> Official Writing Prompt
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {theme?.writingPrompt || <Placeholder />}
            </div>
          </div>

          {/* Guidelines */}
          <div className="ea-guidelines-card">
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Guidelines</h4>
            <div className="ea-guidelines-text">
              {theme?.guidelines || <Placeholder />}
            </div>
          </div>

          {/* Stats / Requirements */}
          <div className="ea-theme-stats">
            <div className="ea-stat-card">
              <Type className="ea-stat-icon" size={20} />
              <div>
                <div className="ea-grid-label">Required Length</div>
                <div>{theme?.requiredLength || <Placeholder />}</div>
              </div>
            </div>
            <div className="ea-stat-card">
              <FileText className="ea-stat-icon" size={20} />
              <div>
                <div className="ea-grid-label">Word Limit</div>
                <div>{theme?.wordLimit || <Placeholder />}</div>
              </div>
            </div>
            <div className="ea-stat-card">
              <Clock className="ea-stat-icon" size={20} />
              <div>
                <div className="ea-grid-label">Time Limit</div>
                <div>{theme?.timeLimit || <Placeholder />}</div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div>
            <div className="ea-grid-label" style={{ marginBottom: '0.5rem' }}>Allowed Genres</div>
            {theme?.allowedGenres && theme.allowedGenres.length > 0 ? (
              <div className="ea-badges">
                {theme.allowedGenres.map((genre, i) => (
                  <span key={i} className="ea-badge">{genre}</span>
                ))}
              </div>
            ) : <Placeholder />}
          </div>

          <div>
            <div className="ea-grid-label" style={{ marginBottom: '0.5rem' }}>Allowed Languages</div>
            {theme?.allowedLanguages && theme.allowedLanguages.length > 0 ? (
              <div className="ea-badges">
                {theme.allowedLanguages.map((lang, i) => (
                  <span key={i} className="ea-badge">{lang}</span>
                ))}
              </div>
            ) : <Placeholder />}
          </div>

          <div>
            <div className="ea-grid-label" style={{ marginBottom: '0.5rem' }}>Restricted Topics</div>
            {theme?.restrictedTopics && theme.restrictedTopics.length > 0 ? (
              <div className="ea-badges">
                {theme.restrictedTopics.map((topic, i) => (
                  <span key={i} className="ea-badge warning">
                    <ShieldAlert size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}/> 
                    {topic}
                  </span>
                ))}
              </div>
            ) : <Placeholder />}
          </div>

        </div>
      </div>

      {/* 4. Highlights */}
      <div className="animate-on-scroll">
        <h2 className="ea-section-heading">
          <CheckCircle size={24} className="ea-grid-icon" style={{marginBottom: 0}} /> Event Highlights
        </h2>
        {competition.highlights && competition.highlights.length > 0 ? (
          <ul className="ea-highlights-list">
            {competition.highlights.map((highlight, index) => (
              <li key={index} className="ea-highlight-item">
                <CheckCircle className="ea-highlight-icon" size={20} strokeWidth={2} />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        ) : <Placeholder />}
      </div>

    </div>
  );
}
