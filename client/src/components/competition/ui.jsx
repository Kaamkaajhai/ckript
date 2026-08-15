// Shared layout primitives for the competition surface.
//
// These mirror the local Section/Card in pages/challenge/CompetitionLanding.jsx so the Hall of Fame
// reads as the same product. CompetitionLanding is deliberately NOT refactored to import these —
// it is shipped and working, and a cosmetic refactor of live code buys nothing.
//
// Everything here speaks the challenge.css vocabulary. These are components, not pages, so they
// neither import that stylesheet nor add the `.ckc` wrapper — the page they render inside does.

export const Section = ({ id, eyebrow, title, subtitle, children, className = "" }) => (
  <section id={id} className={`scroll-mt-24 py-10 ${className}`}>
    {/* The slug-line eyebrow is optional: a section that already sits under a masthead does not
        need to name itself twice. */}
    {eyebrow ? <p className="ckc-meta mb-2.5">{eyebrow}</p> : null}
    {title ? <h2 className="ckc-title ckc-h2">{title}</h2> : null}
    {subtitle ? <p className="ckc-lede mt-2">{subtitle}</p> : null}
    <div className={title ? "mt-6" : ""}>{children}</div>
  </section>
);

export const Card = ({ children, className = "", onClick, role, tabIndex }) => (
  <div 
    className={`ckc-card ckc-card-pad ${className}`}
    onClick={onClick}
    role={role}
    tabIndex={tabIndex}
  >
    {children}
  </div>
);

export const Stat = ({ label, value }) => (
  // A statistic is a figure, so it is set like one: the numeral leads in the display serif with
  // tabular figures, and the label reads beneath it in the slug-line voice.
  //
  // `dt` still precedes `dd` in the DOM because these sit inside a <dl> and a description list is
  // only valid in that order — column-reverse does the flipping, so the markup stays honest.
  <div className="flex flex-col-reverse">
    <dt className="ckc-meta mt-1.5">{label}</dt>
    <dd
      style={{
        fontFamily: "var(--ckc-display)",
        fontSize: "2rem",
        lineHeight: 1.05,
        fontVariantNumeric: "tabular-nums",
        color: "var(--ckc-ink)",
      }}
    >
      {value}
    </dd>
  </div>
);

/** A person's avatar, or their initial when they have no photo. */
export const Avatar = ({ src, name, size = 48 }) => {
  const style = { width: size, height: size };
  if (src) return <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  // The fallback is a quiet inset, not a coral badge: a missing photo is not a live competition, and
  // the accent has to keep meaning something. The initial scales with the avatar so a 30px row
  // avatar and a 64px card avatar are the same object at two sizes.
  return (
    <div
      style={{
        ...style,
        background: "var(--ckc-cream)",
        border: "1px solid var(--ckc-rule)",
        color: "var(--ckc-muted)",
        fontFamily: "var(--ckc-display)",
        fontSize: Math.max(12, Math.round(size * 0.42)),
        lineHeight: 1,
      }}
      className="flex shrink-0 items-center justify-center rounded-full"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};
