/*
 * RouteFallback — the Suspense fallback for writer-section route chunks.
 *
 * When a creator navigates to a lazily-loaded page, the chunk fetch used to
 * flash a bare "Loading…" string. This replaces that with a calm, generic
 * page skeleton — an eyebrow, a title, a short toolbar and a content grid —
 * that occupies the same rhythm as most writer pages. It is intentionally
 * generic: it covers the brief window before the real page mounts (and swaps
 * in its own page-specific skeleton for its data fetch).
 */
import { Skeleton, SkeletonScreen } from "./Skeleton";

export default function RouteFallback({ tone = "warm", label = "Loading…" }) {
  return (
    <SkeletonScreen
      label={label}
      tone={tone}
      style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "4px 2px 40px" }}
    >
      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <Skeleton w={92} h={11} text />
        <Skeleton w={260} h={26} radius={9} style={{ marginTop: 14 }} />
        <Skeleton w={420} h={12} text style={{ marginTop: 12 }} />
      </div>

      {/* Toolbar row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 26, flexWrap: "wrap" }}>
        <Skeleton w={132} h={38} radius={11} />
        <Skeleton w={104} h={38} radius={11} />
        <Skeleton w={104} h={38} radius={11} />
        <Skeleton w={120} h={38} radius={11} style={{ marginLeft: "auto" }} />
      </div>

      {/* Content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton h={168} radius={16} style={{ width: "100%" }} />
            <Skeleton w="80%" h={13} text />
            <Skeleton w="55%" h={11} text />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
