import EmptyState from "../../components/EmptyState";
import "./PerformanceSection.css";

/*
 * PerformanceSection — script analytics: headline stats and a "Views by
 * script" bar chart (bars grow on mount). Falls back to the zero-state when
 * there is nothing published yet.
 *
 * 2026-08-07 (plan §11 Phase 2): the "Details" list below the chart was
 * removed. It held two rows — "Avg watch time" and "Saves" — whose values were
 * the literal string "—" because no endpoint supplies either, and whose chevron
 * opened a `desktopOnly()` toast. A row that reports nothing and goes nowhere
 * is not a placeholder for a feature; it is an invitation to tap a dead end.
 * Desktop shows the three stats and the chart, and nothing else, so this is
 * also the parity-correct shape.
 */
export default function PerformanceSection({ data }) {
  const { stats, chart } = data;

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
                {/* Keyed by position, not by label: two untitled or identically
                    truncated scripts produce the same label. */}
                {chart.bars.map((b, i) => (
                  <div key={i} className="ckm-perf__bar-slot">
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
              {chart.bars.map((b, i) => (
                <span key={i}>{b.label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
