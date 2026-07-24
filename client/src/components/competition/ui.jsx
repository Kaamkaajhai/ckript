// Shared layout primitives for the competition surface.
//
// These mirror the local Section/Card in pages/challenge/CompetitionLanding.jsx so the Hall of Fame
// reads as the same product. CompetitionLanding is deliberately NOT refactored to import these —
// it is shipped and working, and a cosmetic refactor of live code buys nothing.

export const Section = ({ id, title, subtitle, children, className = "" }) => (
  <section id={id} className={`scroll-mt-24 py-10 ${className}`}>
    {title ? <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{title}</h2> : null}
    {subtitle ? <p className="mt-2 text-gray-600 dark:text-gray-300">{subtitle}</p> : null}
    <div className={title ? "mt-6" : ""}>{children}</div>
  </section>
);

export const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    {children}
  </div>
);

export const Stat = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</dd>
  </div>
);

/** A person's avatar, or their initial when they have no photo. */
export const Avatar = ({ src, name, size = 48 }) => {
  const style = { width: size, height: size };
  if (src) return <img src={src} alt="" style={style} className="shrink-0 rounded-full object-cover" />;
  return (
    <div
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#D14D37]/10 font-bold text-[#D14D37]"
    >
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
};
