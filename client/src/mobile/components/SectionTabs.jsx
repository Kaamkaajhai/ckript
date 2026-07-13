import "./SectionTabs.css";

/*
 * SectionTabs — the sticky segmented control that splits the old long-scroll
 * dashboard into four short, focused pages. This is style "A · Segmented"
 * from the reference (the iOS-native default). Kept controlled so the parent
 * owns the active section.
 */
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Perf." },
  { id: "reviews", label: "Reviews" },
  { id: "projects", label: "Projects" },
];

export default function SectionTabs({ active, onChange }) {
  return (
    <div className="ckm-tabs" role="tablist" aria-label="Dashboard sections">
      <div className="ckm-tabs__track">
        {TABS.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`ckm-tabs__btn${on ? " is-active" : ""}`}
              onClick={() => onChange(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
