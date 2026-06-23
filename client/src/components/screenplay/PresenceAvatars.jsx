// Stacked, color-coded collaborator avatars for the toolbar. Click → toggles the People list.
const initialsOf = (name = "") =>
  String(name).trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

export default function PresenceAvatars({ people = [], onClick, dark = false, max = 4 }) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const describe = (p) => {
    const where = p.sceneHeading ? ` — ${p.state === "editing" ? "editing" : "in"} ${p.sceneHeading}` : "";
    return `${p.name}${where}`;
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${people.length} online\n${people.map(describe).join("\n")}`}
      className="flex items-center -space-x-2 pl-1"
    >
      {shown.map((p) => (
        <span
          key={p.userId}
          title={describe(p)}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold text-white ring-2 ${dark ? "ring-[#080f1a]" : "ring-white"}`}
          style={{ backgroundColor: p.color }}
        >
          {initialsOf(p.name)}
        </span>
      ))}
      {extra > 0 && (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold ring-2 ${dark ? "ring-[#080f1a] bg-[#1c2a3a] text-gray-300" : "ring-white bg-gray-200 text-gray-600"}`}>
          +{extra}
        </span>
      )}
      <span className="sr-only">{people.length} online</span>
    </button>
  );
}
