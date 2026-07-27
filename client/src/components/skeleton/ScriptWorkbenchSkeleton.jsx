/*
 * ScriptWorkbenchSkeleton — placeholder for the Script Workbench page.
 *
 * Reuses the workbench's own layout shell (`.script-workbench-page`,
 * `.swb-header`, `.swb-body`, `.swb-nav`, `.swb-canvas`, `.swb-metrics`) so
 * the skeleton occupies the exact grid the loaded page will — thumbnail +
 * title block + actions across the header, section rail on the left, a metrics
 * strip and content cards in the canvas. The swap to real content is
 * therefore shift-free. Its CSS is already imported by the page module.
 */
import { Skeleton, SkeletonScreen } from "./Skeleton";
// Reuse the workbench's own scoped layout CSS so this skeleton owns the exact
// header / rail / canvas grid regardless of who renders it. The rules are
// scoped under `.script-workbench-page`, and the import dedupes when the real
// page is already loaded.
import "../../features/script-workbench/ScriptWorkbenchPage.css";

const NavGroup = ({ items }) => (
  <div>
    <div className="swb-nav__grp" aria-hidden="true">
      <Skeleton w={54} h={8} text />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 6px" }}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} h={30} radius={8} style={{ width: "100%" }} />
      ))}
    </div>
  </div>
);

const Metric = () => (
  <div className="swb-metric" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <Skeleton w={44} h={9} text />
    <Skeleton w="70%" h={18} radius={6} />
    <Skeleton w={80} h={8} text />
  </div>
);

export default function ScriptWorkbenchSkeleton({ dark = false }) {
  return (
    <SkeletonScreen
      as="main"
      label="Loading project…"
      className={`script-workbench-page${dark ? " is-dark" : ""}`}
    >
      {/* Header */}
      <header className="swb-header">
        <Skeleton h={90} radius={12} style={{ width: "100%" }} />
        <div style={{ minWidth: 0 }}>
          <Skeleton w={180} h={11} text style={{ marginBottom: 12 }} />
          <Skeleton w={320} h={28} radius={8} style={{ marginBottom: 12 }} />
          <Skeleton w="90%" h={12} text style={{ marginBottom: 7, maxWidth: 640 }} />
          <Skeleton w="60%" h={12} text style={{ maxWidth: 420 }} />
        </div>
        <div className="swb-actions">
          <Skeleton w={120} h={36} radius={10} />
          <Skeleton w={84} h={36} radius={10} />
          <Skeleton w={84} h={36} radius={10} />
          <Skeleton w={36} h={36} radius={10} />
        </div>
      </header>

      {/* Body */}
      <div className="swb-body">
        {/* Section rail */}
        <nav className="swb-nav" aria-hidden="true">
          <NavGroup items={3} />
          <NavGroup items={4} />
          <NavGroup items={2} />
        </nav>

        {/* Canvas */}
        <div className="swb-canvas">
          <div className="swb-metrics">
            {[0, 1, 2, 3, 4].map((i) => (
              <Metric key={i} />
            ))}
          </div>

          {/* Content cards */}
          <div className="swb-card" style={{ padding: 20, marginBottom: 16 }}>
            <Skeleton w={160} h={16} radius={6} style={{ marginBottom: 16 }} />
            <Skeleton w="100%" h={12} text style={{ marginBottom: 9 }} />
            <Skeleton w="94%" h={12} text style={{ marginBottom: 9 }} />
            <Skeleton w="72%" h={12} text />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {[0, 1].map((i) => (
              <div key={i} className="swb-card" style={{ padding: 20 }}>
                <Skeleton w={130} h={14} radius={6} style={{ marginBottom: 14 }} />
                <Skeleton w="100%" h={11} text style={{ marginBottom: 8 }} />
                <Skeleton w="88%" h={11} text style={{ marginBottom: 8 }} />
                <Skeleton w="66%" h={11} text />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
