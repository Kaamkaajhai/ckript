/*
 * CollaborationHubSkeleton — placeholder for the Collaboration Hub.
 *
 * Mirrors the loaded two-column workspace: a sticky left rail (cover, title,
 * section nav, back button) and a main column of section cards. Rendered on
 * the hub's own `#eef0f3` / dark surface so the reveal is seamless.
 */
import { Skeleton, SkeletonScreen } from "./Skeleton";

const NavRow = ({ active = false }) => (
  <Skeleton
    h={44}
    radius={16}
    style={{ width: "100%", opacity: active ? 1 : 0.85 }}
  />
);

const SectionCard = ({ rows = 3, dark }) => (
  <section
    className={`rounded-3xl border shadow-sm ${dark ? "bg-[#0d1520] border-[#1c2a3a]" : "bg-white border-gray-200"}`}
  >
    <div className={`border-b px-5 py-5 ${dark ? "border-[#1c2a3a]" : "border-gray-100"}`}>
      <Skeleton w={180} h={18} radius={6} style={{ marginBottom: 10 }} />
      <Skeleton w={280} h={11} text />
    </div>
    <div className="p-5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton circle w={40} h={40} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <Skeleton w="38%" h={11} text />
            <Skeleton w="60%" h={9} text />
          </div>
          <Skeleton w={90} h={32} radius={10} />
        </div>
      ))}
    </div>
  </section>
);

export default function CollaborationHubSkeleton({ dark = false }) {
  const surface = dark ? "bg-[#09111b]" : "bg-[#eef0f3]";
  const shellCard = dark ? "bg-[#0d1520] border-[#1c2a3a]" : "bg-white border-gray-200";

  return (
    <SkeletonScreen tone="cool" label="Loading collaboration workspace…" className={`min-h-screen ${surface} pb-8`}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:gap-6 lg:px-8">
        {/* Left rail */}
        <aside className={`hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:rounded-3xl lg:border lg:p-5 ${shellCard}`}>
          <Skeleton h={144} radius={16} style={{ width: "100%" }} />
          <div className="mt-4">
            <Skeleton w={140} h={9} text style={{ marginBottom: 10 }} />
            <Skeleton w="80%" h={22} radius={7} />
          </div>
          <div className="mt-6" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <NavRow key={i} active={i === 0} />
            ))}
          </div>
          <div className="mt-8">
            <Skeleton h={44} radius={16} style={{ width: "100%" }} />
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-5">
          <SectionCard rows={3} dark={dark} />
          <SectionCard rows={2} dark={dark} />
        </main>
      </div>
    </SkeletonScreen>
  );
}
