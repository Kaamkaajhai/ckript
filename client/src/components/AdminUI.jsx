export const Icon = ({ d, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

// One line, but StatCard is the repeating unit of every admin card grid — the old navy
// surface/border tinted the whole console cool against the warm shell.
// Token-styled: StatCard always renders inside the .ckad shell, so the design-system variables
// resolve and both themes come for free. `isDark` is accepted and ignored — 26 call sites keep
// their signature while the theme decides the colours.
// eslint-disable-next-line no-unused-vars
export const StatCard = ({ label, value, icon, color, isDark }) => (
    <div className="adst">
        <div className={`adst-ico ${color}`}>
            <Icon d={icon} className="w-5 h-5" />
        </div>
        <p className="adst-value ckad-num">{value}</p>
        <p className="adst-label">{label}</p>
    </div>
);
