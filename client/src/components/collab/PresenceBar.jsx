const palette = ["#1e3a5f", "#16a34a", "#dc2626", "#d97706", "#0891b2", "#7c3aed"];

export default function PresenceBar({ onlineUsers = [] }) {
  if (!onlineUsers.length) return null;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/90 px-3 py-2 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        Live
      </span>
      <div className="flex items-center -space-x-2">
        {onlineUsers.map((user, index) => {
          const color = palette[index % palette.length];
          return (
            <div
              key={user.userId}
              title={user.name}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#1e3a5f] text-xs font-bold text-white"
            >
              {user.name?.charAt(0)?.toUpperCase() || "U"}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                style={{ backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
