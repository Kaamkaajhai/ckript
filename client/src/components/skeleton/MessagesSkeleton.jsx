/*
 * MessagesSkeleton — structural placeholder for the two-pane Messages page.
 *
 * Mirrors the real layout box-for-box (conversation rail + thread + composer)
 * so the swap to loaded content is shift-free. Theme-aware via `dark`; bones
 * use the cool tone to sit correctly on the slate messaging surface.
 */
import { Skeleton, SkeletonCircle, SkeletonScreen } from "./Skeleton";

const ConversationRow = ({ active = false }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 ${active ? "border-l-2 border-[#1e3a5f]/30" : ""}`}
  >
    <SkeletonCircle size={40} />
    <div className="flex-1 min-w-0" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <div className="flex items-center justify-between">
        <Skeleton w="46%" h={11} text />
        <Skeleton w={28} h={9} text />
      </div>
      <Skeleton w="78%" h={9} text />
    </div>
  </div>
);

const Bubble = ({ mine = false, w }) => (
  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
    <Skeleton w={w} h={34} radius={16} />
  </div>
);

export default function MessagesSkeleton({ dark = false }) {
  const border = dark ? "border-[#151f2e]" : "border-gray-100";
  const page = dark ? "bg-[#0a111c] border-[#1c2a3a]" : "bg-white border-gray-100";
  const rail = dark ? "bg-[#0a111c]" : "bg-white";

  return (
    <SkeletonScreen tone="cool" label="Loading your messages…">
      <div className={`flex h-[500px] rounded-2xl shadow-sm border overflow-hidden ${page}`}>
        {/* Conversation rail */}
        <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r ${rail} ${border}`}>
          {/* Header */}
          <div className={`px-4 py-4 border-b ${border}`}>
            <div className="flex items-center justify-between mb-3">
              <Skeleton w={96} h={16} radius={6} />
              <Skeleton w={112} h={20} pill />
            </div>
            <Skeleton h={34} radius={12} style={{ width: "100%" }} />
          </div>
          {/* Rows */}
          <div className="flex-1 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ConversationRow key={i} active={i === 0} />
            ))}
          </div>
        </div>

        {/* Thread — hidden on mobile (list-first), like the real page */}
        <div className={`hidden md:flex flex-1 flex-col ${rail}`}>
          {/* Thread header */}
          <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${border}`}>
            <SkeletonCircle size={38} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton w={140} h={12} text />
              <Skeleton w={90} h={9} text />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Skeleton w={34} h={34} radius={10} />
              <Skeleton w={34} h={34} radius={10} />
            </div>
          </div>
          {/* Message stream */}
          <div className="flex-1 px-5 py-5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Bubble w="52%" />
            <Bubble w="38%" />
            <Bubble mine w="60%" />
            <Bubble mine w="30%" />
            <Bubble w="46%" />
            <Bubble mine w="54%" />
          </div>
          {/* Composer */}
          <div className={`px-5 py-3.5 border-t ${border} flex items-center gap-3`}>
            <Skeleton w={36} h={36} radius={11} />
            <Skeleton h={40} radius={12} style={{ flex: 1 }} />
            <Skeleton w={40} h={40} radius={11} />
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
