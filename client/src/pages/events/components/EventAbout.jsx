import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Globe,
  Layers,
  Users,
  FileEdit,
  CheckCircle2,
  Sparkles,
  PenTool,
  Clock,
  Hash,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

/* ── Intersection Observer hook ── */
function useInView(ref, opts = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold: 0.12, ...opts }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

/* ── "Coming Soon" chip ── */
const ComingSoon = () => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 999,
    background: 'var(--event-surface-alt, #F4F2EE)',
    border: '1px dashed var(--event-border, #E8E5E1)',
    fontFamily: 'var(--ck-sans)', fontSize: '0.72rem', fontWeight: 600,
    color: 'var(--event-text-faint, #aaa)', fontStyle: 'italic', letterSpacing: '0.03em',
  }}>Coming Soon</span>
);

/* ── Quick Info Chip ── */
function InfoChip({ icon: Icon, label, value, delay, inView }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
        background: 'var(--event-surface, #FFF)',
        border: '1px solid var(--event-border, #E8E5E1)',
        borderRadius: 14,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(12px)',
        transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--event-accent-light, #F4EAE8)',
        color: 'var(--event-accent, #8A3B2E)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--ck-sans)', fontSize: '0.68rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.15em',
          color: 'var(--event-text-faint, #888)', marginBottom: 2,
        }}>{label}</div>
        <div style={{
          fontFamily: 'var(--ck-sans)', fontSize: '0.88rem', fontWeight: 600,
          color: 'var(--event-text, #111)',
        }}>{value}</div>
      </div>
    </div>
  );
}

export default function EventAbout({ competition }) {
  if (!competition) return null;

  const sectionRef = useRef(null);
  const sectionInView = useInView(sectionRef);
  const themeRef = useRef(null);
  const themeInView = useInView(themeRef);

  const { theme } = competition;
  const hasTheme = theme && (theme.title || theme.brief || theme.guidelines || theme.writingPrompt);
  const hasGenres = theme?.allowedGenres?.length > 0;
  const hasHighlights = competition.highlights?.length > 0;

  /* Classification data — set defaults, only show "Coming Soon" for the truly critical ones */
  const classificationItems = [
    { icon: Sparkles, label: "Event Type", value: competition.eventType || "Global Challenge" },
    { icon: Globe, label: "Language", value: competition.language || "English" },
    { icon: Layers, label: "Category", value: competition.competitionCategory || "Screenwriting" },
    { icon: Users, label: "Eligibility", value: competition.eligibility || "Open to All" },
    { icon: FileEdit, label: "Format", value: competition.format || "Any format in the Ckript editor" },
    { icon: BookOpen, label: "Difficulty", value: competition.difficulty || "All Levels" },
  ];

  return (
    <section
      ref={sectionRef}
      className="ckl-event-section ckl-event-section--divider"
      style={{ background: 'var(--event-surface, #FFF)' }}
    >
      <div className="ckl-event-container" style={{ maxWidth: 960 }}>

        {/* ── 1. Section Label + Overview ── */}
        <div style={{
          textAlign: 'center', maxWidth: 720, margin: '0 auto',
          marginBottom: hasTheme || hasHighlights ? 'clamp(48px, 6vw, 80px)' : 0,
          opacity: sectionInView ? 1 : 0,
          transform: sectionInView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--ck-sans)', fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.2em',
            color: 'var(--event-accent, #8A3B2E)', marginBottom: 16,
          }}>
            <BookOpen size={14} strokeWidth={2.5} />
            <span>About</span>
          </div>
          <h2 className="ckl-event-title-section" style={{ marginBottom: 16 }}>
            About the Event
          </h2>
          <p style={{
            fontFamily: 'var(--ck-serif)',
            fontSize: 'clamp(1.05rem, 1.5vw + 0.8rem, 1.3rem)',
            lineHeight: 1.65, color: 'var(--event-text-muted, #555)',
          }}>
            {competition.overview || competition.shortDescription || <ComingSoon />}
          </p>
        </div>

        {/* ── 2. Classification Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
          marginBottom: 'clamp(48px, 6vw, 80px)',
        }}>
          {classificationItems.map((item, i) => (
            <InfoChip
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              delay={i * 60}
              inView={sectionInView}
            />
          ))}
        </div>

        {/* ── 3. Theme & Guidelines ── */}
        {hasTheme ? (
          <div
            ref={themeRef}
            style={{
              marginBottom: hasHighlights ? 'clamp(48px, 6vw, 80px)' : 0,
              opacity: themeInView ? 1 : 0,
              transform: themeInView ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 100ms',
            }}
          >
            {/* Theme header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: 'var(--ck-sans)', fontSize: '0.68rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.2em',
                color: 'var(--event-accent, #8A3B2E)', marginBottom: 8,
              }}>Official Theme</div>
              {theme.title && (
                <h3 style={{
                  fontFamily: 'var(--ck-serif)',
                  fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                  fontWeight: 700, lineHeight: 1.15,
                  color: 'var(--event-text, #111)', margin: '0 0 12px',
                }}>{theme.title}</h3>
              )}
              {theme.brief && (
                <p style={{
                  fontFamily: 'var(--ck-serif)',
                  fontSize: '1.05rem', lineHeight: 1.65,
                  color: 'var(--event-text-muted, #555)',
                  whiteSpace: 'pre-wrap', maxWidth: 700,
                }}>{theme.brief}</p>
              )}
            </div>

            {/* Genres */}
            {hasGenres && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  fontFamily: 'var(--ck-sans)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: 'var(--event-text-faint, #888)', marginBottom: 10,
                }}>Allowed Genres</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {theme.allowedGenres.map((g, i) => (
                    <span key={i} style={{
                      padding: '5px 14px', borderRadius: 999,
                      background: 'var(--event-surface-alt, #F4F2EE)',
                      border: '1px solid var(--event-border, #E8E5E1)',
                      fontFamily: 'var(--ck-sans)', fontSize: '0.8rem', fontWeight: 600,
                      color: 'var(--event-text-muted, #555)',
                    }}>{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Writing Prompt */}
            {theme.writingPrompt && (
              <div style={{
                background: 'var(--event-accent-light, #F4EAE8)',
                borderLeft: '4px solid var(--event-accent, #8A3B2E)',
                borderRadius: '0 14px 14px 0',
                padding: '20px 24px', marginBottom: 24,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--ck-sans)', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: 'var(--event-accent, #8A3B2E)', marginBottom: 8,
                }}>
                  <PenTool size={14} strokeWidth={2.5} />
                  Writing Prompt
                </div>
                <p style={{
                  fontFamily: 'var(--ck-serif)', fontSize: '1rem',
                  lineHeight: 1.6, color: 'var(--event-text, #111)',
                  whiteSpace: 'pre-wrap', margin: 0,
                }}>{theme.writingPrompt}</p>
              </div>
            )}

            {/* Guidelines */}
            {theme.guidelines && (
              <div style={{
                background: 'var(--event-surface-alt, #F4F2EE)',
                border: '1px solid var(--event-border, #E8E5E1)',
                borderRadius: 16, padding: '24px 28px', marginBottom: 24,
              }}>
                <div style={{
                  fontFamily: 'var(--ck-sans)', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: 'var(--event-text-faint, #888)', marginBottom: 12,
                }}>Submission Guidelines</div>
                <p style={{
                  fontFamily: 'var(--ck-sans)', fontSize: '0.92rem',
                  lineHeight: 1.7, color: 'var(--event-text-muted, #555)',
                  whiteSpace: 'pre-wrap', margin: 0,
                }}>{theme.guidelines}</p>
              </div>
            )}

            {/* Compact requirements row */}
            {(theme.requiredLength || theme.wordLimit || theme.timeLimit) && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24,
              }}>
                {theme.requiredLength && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 12,
                    background: 'var(--event-surface, #FFF)',
                    border: '1px solid var(--event-border, #E8E5E1)',
                  }}>
                    <FileEdit size={14} style={{ color: 'var(--event-accent, #8A3B2E)' }} />
                    <span style={{ fontFamily: 'var(--ck-sans)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--event-text, #111)' }}>
                      {theme.requiredLength}
                    </span>
                  </div>
                )}
                {theme.wordLimit && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 12,
                    background: 'var(--event-surface, #FFF)',
                    border: '1px solid var(--event-border, #E8E5E1)',
                  }}>
                    <Hash size={14} style={{ color: 'var(--event-accent, #8A3B2E)' }} />
                    <span style={{ fontFamily: 'var(--ck-sans)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--event-text, #111)' }}>
                      {theme.wordLimit.toLocaleString()} words max
                    </span>
                  </div>
                )}
                {theme.timeLimit && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 12,
                    background: 'var(--event-surface, #FFF)',
                    border: '1px solid var(--event-border, #E8E5E1)',
                  }}>
                    <Clock size={14} style={{ color: 'var(--event-accent, #8A3B2E)' }} />
                    <span style={{ fontFamily: 'var(--ck-sans)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--event-text, #111)' }}>
                      {theme.timeLimit}h time limit
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Restricted topics */}
            {theme.restrictedTopics?.length > 0 && (
              <div style={{
                padding: '16px 20px', borderRadius: 14,
                background: '#FDF6F5', border: '1px solid #F0DAD6',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--ck-sans)', fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.15em',
                  color: '#9B4D3C', marginBottom: 10,
                }}>
                  <AlertTriangle size={13} strokeWidth={2.5} />
                  Restricted Topics
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {theme.restrictedTopics.map((t, i) => (
                    <span key={i} style={{
                      padding: '4px 12px', borderRadius: 999,
                      background: '#FCEAE7', border: '1px solid #F0DAD6',
                      fontFamily: 'var(--ck-sans)', fontSize: '0.78rem', fontWeight: 600,
                      color: '#8A3B2E',
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No theme set — single Coming Soon */
          <div ref={themeRef} style={{
            textAlign: 'center', padding: '48px 24px',
            background: 'var(--event-surface-alt, #F4F2EE)',
            borderRadius: 20, border: '1px dashed var(--event-border, #E8E5E1)',
            marginBottom: hasHighlights ? 'clamp(48px, 6vw, 80px)' : 0,
            opacity: themeInView ? 1 : 0,
            transform: themeInView ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            <PenTool size={28} style={{ color: 'var(--event-text-faint, #aaa)', margin: '0 auto 12px' }} />
            <p style={{
              fontFamily: 'var(--ck-serif)', fontSize: '1.1rem', fontWeight: 600,
              color: 'var(--event-text-muted, #555)', margin: '0 0 4px',
            }}>Theme & guidelines coming soon</p>
            <p style={{
              fontFamily: 'var(--ck-sans)', fontSize: '0.82rem',
              color: 'var(--event-text-faint, #888)', margin: 0,
            }}>The official theme will be revealed when the competition starts.</p>
          </div>
        )}

        {/* ── 4. Highlights ── */}
        {hasHighlights && (
          <div>
            <div style={{
              fontFamily: 'var(--ck-sans)', fontSize: '0.68rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.2em',
              color: 'var(--event-accent, #8A3B2E)', marginBottom: 16,
            }}>Event Highlights</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {competition.highlights.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--event-surface-alt, #F4F2EE)',
                }}>
                  <CheckCircle2 size={18} strokeWidth={2.5}
                    style={{ color: 'var(--event-accent, #8A3B2E)', flexShrink: 0, marginTop: 2 }}
                  />
                  <span style={{
                    fontFamily: 'var(--ck-sans)', fontSize: '0.92rem',
                    lineHeight: 1.5, color: 'var(--event-text, #111)',
                  }}>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
