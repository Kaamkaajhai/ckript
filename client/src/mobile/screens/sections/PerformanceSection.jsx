import Icon from "../../components/Icon";
import EmptyState from "../../components/EmptyState";
import { PERFORMANCE } from "../../data/dashboardData";
import "./PerformanceSection.css";

/*
 * PerformanceSection — script analytics: headline stats, a "Views by script"
 * bar chart (bars grow on mount) and a details list. Falls back to the
 * zero-state when there is nothing published yet.
 */
export default function PerformanceSection({ onDetail }) {
  const { stats, chart, details } = PERFORMANCE;

  if (!chart.bars.length) {
    return (
      <div className="ckm-perf">
        <EmptyState
          icon="bar_chart"
          title="No performance data"
          body="Publish a script to start seeing views and engagement."
        />
      </div>
    );
  }

  return (
    <div className="ckm-perf">
      <div className="ckm-perf__head">
        <h3 className="ckm-perf__title">Script Performance</h3>
        <span className="ckm-perf__dot" />
      </div>
      <p className="ckm-perf__sub">How your scripts perform across the platform</p>

      <div className="ckm-perf__stats">
        {stats.map((s) => (
          <div key={s.label} className="ckm-perf__stat">
            <div className="ckm-perf__stat-label">{s.label}</div>
            <div className="ckm-perf__stat-value">{s.value}</div>
            {s.sub && <div className="ckm-perf__stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="ckm-perf__kicker">Views by script</div>
      <div className="ckm-perf__chart">
        <div className="ckm-perf__chart-row">
          <div className="ckm-perf__yaxis">
            {chart.yAxis.map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
          <div className="ckm-perf__plot-wrap">
            <div className="ckm-perf__plot">
              <span className="ckm-perf__grid" style={{ top: 0 }} />
              <span className="ckm-perf__grid" style={{ top: "25%" }} />
              <span className="ckm-perf__grid" style={{ top: "50%" }} />
              <span className="ckm-perf__grid" style={{ top: "75%" }} />
              <span className="ckm-perf__axis" />
              <div className="ckm-perf__bars">
                {chart.bars.map((b, i) => (
                  <div key={b.label} className="ckm-perf__bar-slot">
                    <div
                      className={`ckm-perf__bar${b.accent ? " is-accent" : ""}`}
                      style={{
                        height: `${b.h}%`,
                        opacity: b.opacity ?? 1,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="ckm-perf__xlabels">
              {chart.bars.map((b) => (
                <span key={b.label}>{b.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ckm-perf__kicker">Details</div>
      <div className="ckm-perf__details">
        {details.map((d, i) => (
          <button
            key={d.label}
            type="button"
            className={`ckm-perf__detail${i > 0 ? " has-divider" : ""}`}
            onClick={() => onDetail?.(d)}
          >
            <span className="ckm-perf__detail-icon">
              <Icon name={d.icon} size={18} />
            </span>
            <span className="ckm-perf__detail-label">{d.label}</span>
            <span className="ckm-perf__detail-value">{d.value}</span>
            <Icon name="chevron_right" size={18} color="#cfc8bd" />
          </button>
        ))}
      </div>
    </div>
  );
}
