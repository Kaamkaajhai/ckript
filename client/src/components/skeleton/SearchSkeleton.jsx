/*
 * SearchSkeleton — results-region placeholder for the Search page.
 *
 * The search field + filter bar stay mounted while a query runs; only the
 * results area below swaps to this skeleton. It mirrors the loaded result
 * layout: a count line, a short "people" row, then the script cover grid.
 */
import { Skeleton, SkeletonCircle, SkeletonScreen } from "./Skeleton";

const PersonChip = () => (
  <div className="flex items-center gap-3 px-3 py-2.5">
    <SkeletonCircle size={44} />
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <Skeleton w={110} h={11} text />
      <Skeleton w={72} h={9} text />
    </div>
  </div>
);

const CoverCard = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <Skeleton radius={16} style={{ width: "100%", aspectRatio: "3 / 4" }} />
    <Skeleton w="82%" h={12} text />
    <Skeleton w={64} h={18} pill />
    <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
      <Skeleton w={40} h={9} text />
      <Skeleton w={40} h={9} text />
    </div>
  </div>
);

export default function SearchSkeleton({ count = 10 }) {
  return (
    <SkeletonScreen tone="cool" label="Searching projects…" style={{ paddingTop: 4 }}>
      {/* Result count */}
      <Skeleton w={92} h={11} text style={{ marginBottom: 24 }} />

      {/* People row */}
      <div style={{ marginBottom: 36 }}>
        <Skeleton w={70} h={11} text style={{ marginBottom: 12 }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: 8,
          }}
        >
          {[0, 1, 2].map((i) => (
            <PersonChip key={i} />
          ))}
        </div>
      </div>

      {/* Scripts grid */}
      <Skeleton w={80} h={11} text style={{ marginBottom: 16 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 18,
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <CoverCard key={i} />
        ))}
      </div>
    </SkeletonScreen>
  );
}
