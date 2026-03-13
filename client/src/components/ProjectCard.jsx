import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

const FORMAT_LABEL = {
  feature: "Feature Film",
  short: "Short Film",
  tv_pilot: "TV Pilot",
  limited_series: "Limited Series",
  webseries: "Web Series",
  documentary: "Documentary",
};

const STATUS = {
  pending_approval: { label: "In Review", dot: "bg-amber-400",   dk: "text-amber-400",   lt: "text-amber-600" },
  rejected:         { label: "Rejected",  dot: "bg-rose-400",    dk: "text-rose-400",    lt: "text-rose-600"  },
  published:        { label: "Published", dot: "bg-emerald-400", dk: "text-emerald-400", lt: "text-emerald-600" },
  draft:            { label: "Draft",     dot: "bg-[#4a5a6e]",   dk: "text-[#4a5a6e]",  lt: "text-gray-400"  },
};

const ProjectCard = ({ project, userName }) => {
  const navigate = useNavigate();
  const { isDarkMode: dark } = useDarkMode();

  const isClickable  = project?.status === "published";
  const genre        = project?.primaryGenre || project?.genre || null;
  const format       = FORMAT_LABEL[project?.format] || project?.format || null;
  const score        = project?.platformScore?.overall ?? project?.scriptScore?.overall ?? null;
  const views        = project?.views ?? 0;
  const rating       = project?.rating ?? 0;
  const reads        = project?.readsCount ?? 0;
  const status       = STATUS[project?.status] || STATUS.draft;
  const coverImage   = project?.coverImage || null;
  const initials     = (project?.title || "SC").replace(/[^a-zA-Z0-9 ]/g, "").trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "SC";

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div
      onClick={() => isClickable && navigate(`/script/${project._id}`)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-500 select-none ${
        isClickable ? "cursor-pointer" : "cursor-default"
      } ${
        dark
          ? "bg-[#0c1420] border-[#1a2636] hover:border-[#263c54] hover:shadow-[0_16px_56px_rgba(0,0,0,0.55)]"
          : "bg-white border-gray-200 hover:border-gray-300 shadow-[0_1px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
      }`}
    >

      {/* â•â• HERO â€” fixed h-44 for both thumbnail and placeholder â•â• */}
      <div className="relative h-44 w-full flex-shrink-0 overflow-hidden">

        {coverImage ? (
          /* â€” Thumbnail â€” */
          <img
            src={`${API_BASE}${coverImage}`}
            alt={project?.title || "Script cover"}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          /* — Placeholder: cinematic clapperboard — */
          <div className={`absolute inset-0 overflow-hidden flex flex-col items-center justify-center gap-3 ${
            dark ? "bg-[#070d17]" : "bg-[#eef2fb]"
          }`}>
            {/* scanlines */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: dark
                ? "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.016) 3px,rgba(255,255,255,0.016) 4px)"
                : "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.022) 3px,rgba(0,0,0,0.022) 4px)",
            }}/>
            {/* center ambient glow */}
            <div className={`absolute w-40 h-40 rounded-full blur-3xl pointer-events-none ${
              dark ? "bg-[#1a5aaa]/20" : "bg-[#90b0f0]/25"
            }`}/>
            {/* icon container */}
            <div className={`relative flex items-center justify-center w-[62px] h-[62px]`}>
              {/* subtle glow effect */}
              <div className={`absolute inset-0 rounded-[18px] ${
                dark ? "bg-[#1a5aaa]/10 blur-xl" : "bg-[#4080d0]/8 blur-xl"
              }`} />
              {/* clapperboard SVG */}
              <svg viewBox="0 0 48 48" fill="none" className={`w-[34px] h-[34px] ${dark ? "text-[#3d7ac0]" : "text-[#4e6ec0]"}`}>
                {/* body */}
                <rect x="6" y="17" width="36" height="24" rx="3" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.07"/>
                {/* top flap */}
                <rect x="6" y="9" width="36" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.16"/>
                {/* diagonal stripes clipped to flap via nested svg viewport */}
                <svg x="6" y="9" width="36" height="10" overflow="hidden">
                  <line x1="2"  y1="-1" x2="-3" y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                  <line x1="8"  y1="-1" x2="3"  y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                  <line x1="14" y1="-1" x2="9"  y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                  <line x1="20" y1="-1" x2="15" y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                  <line x1="26" y1="-1" x2="21" y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                  <line x1="32" y1="-1" x2="27" y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                  <line x1="38" y1="-1" x2="33" y2="12" stroke="currentColor" strokeWidth="2.8" opacity="0.38"/>
                </svg>
                {/* hinge pin */}
                <circle cx="13" cy="9" r="2" fill="currentColor" opacity="0.5"/>
                <circle cx="35" cy="9" r="2" fill="currentColor" opacity="0.5"/>
                {/* text lines on body */}
                <line x1="12" y1="24.5" x2="36" y2="24.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
                <line x1="12" y1="30"   x2="28" y2="30"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
                <line x1="12" y1="35.5" x2="22" y2="35.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.18"/>
                {/* small lens circle bottom-right */}
                <circle cx="37" cy="33" r="3.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.07" opacity="0.45"/>
                <circle cx="37" cy="33" r="1.4" fill="currentColor" opacity="0.35"/>
              </svg>
              {/* top-left corner accent dot */}
              <span className={`absolute top-2 left-2 w-1 h-1 rounded-full ${dark ? "bg-[#2a5898]/60" : "bg-[#7090d0]/40"}`}/>
            </div>
            <span className={`text-[9px] font-bold tracking-[0.22em] uppercase ${
              dark ? "text-[#1a3456]" : "text-[#b8caee]"
            }`}>No Cover</span>
          </div>
        )}

        {/* Bottom scrim â€” always present for consistent fade into card body */}
        <div className={`absolute inset-x-0 bottom-0 h-16 pointer-events-none ${
          dark
            ? "bg-gradient-to-t from-[#0c1420] to-transparent"
            : "bg-gradient-to-t from-white to-transparent"
        }`} />

        {/* â”€â”€ overlay badges â”€â”€ */}

        {/* Status â€” top-left */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-[0.13em] uppercase px-2.5 py-1.5 rounded-lg backdrop-blur-sm ${
            dark
              ? "bg-black/45 text-white/80 border border-white/[0.07]"
              : "bg-white/80 text-gray-700 border border-gray-200/80 shadow-sm"
          }`}>
            <span className="relative flex h-[6px] w-[6px]">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 ${status.dot} ${project?.status === "published" ? "animate-ping" : ""}`} />
              <span className={`relative inline-flex h-[6px] w-[6px] rounded-full ${status.dot}`} />
            </span>
            {status.label}
          </span>
        </div>

        {/* Score â€” top-right */}
        {score != null && (
          <div className={`absolute top-3 right-3 flex items-baseline gap-0.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm ${
            dark
              ? "bg-black/45 border border-white/[0.07]"
              : "bg-white/80 border border-gray-200/80 shadow-sm"
          }`}>
            <span className={`text-[13px] font-black leading-none tabular-nums ${dark ? "text-white" : "text-gray-800"}`}>{score}</span>
            <span className={`text-[9px] font-semibold ${dark ? "text-white/25" : "text-gray-300"}`}>/100</span>
          </div>
        )}

        {/* Premium â€” bottom-right (above the scrim) */}
        {project?.premium && (
          <div className={`absolute bottom-3.5 right-3.5 text-[9px] font-black tracking-[0.12em] uppercase px-2.5 py-[5px] rounded-lg backdrop-blur-sm ${
            dark
              ? "bg-amber-500/15 text-amber-300 border border-amber-400/20"
              : "bg-amber-400/15 text-amber-700 border border-amber-300/50"
          }`}>
            Premium
          </div>
        )}
      </div>

      {/* â•â• BODY â•â• */}
      <div className="flex flex-col flex-1 px-5 pt-4 pb-4 gap-0">

        {/* Title */}
        <h3 className={`text-[15px] font-bold leading-snug tracking-[-0.015em] line-clamp-1 transition-colors duration-200 ${
          dark ? "text-white/90 group-hover:text-white" : "text-gray-900"
        }`}>
          {project?.title || "Untitled Project"}
        </h3>

        {/* Author */}
        <p className={`mt-[3px] text-[11px] font-medium ${dark ? "text-[#3b4f63]" : "text-gray-400"}`}>
          by {userName || "Unknown Author"}
        </p>

        {/* Divider */}
        <div className={`my-3 h-px ${dark ? "bg-[#182535]" : "bg-gray-100"}`} />

        {/* Logline â€” always rendered, fills vertical space */}
        <p className={`text-[12px] leading-[1.65] line-clamp-2 flex-1 ${
          (project?.logline || project?.description)
            ? (dark ? "text-[#68788a]" : "text-gray-500")
            : (dark ? "text-[#253545]/60" : "text-gray-300")
        }`}>
          {project?.logline || project?.description || "No description provided."}
        </p>

        {/* Tags */}
        {(genre || format) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {genre && (
              <span className={`text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-lg ${
                dark ? "bg-[#111e2d] text-[#8896a7]" : "bg-gray-100 text-gray-600"
              }`}>
                {genre}
              </span>
            )}
            {format && (
              <span className={`text-[10px] font-medium tracking-wide px-2.5 py-1 rounded-lg ${
                dark ? "bg-[#111e2d] text-[#45576a]" : "bg-gray-50 text-gray-400 border border-gray-100"
              }`}>
                {format}
              </span>
            )}
          </div>
        )}
      </div>

      {/* â•â• FOOTER â•â• */}
      <div className={`flex items-center gap-3 px-5 py-3 border-t ${
        dark ? "border-[#182535] bg-[#091017]" : "border-gray-100 bg-gray-50/60"
      }`}>

        {/* Views */}
        <div className={`flex items-center gap-1.5 shrink-0 ${dark ? "text-[#3b4f63]" : "text-gray-400"}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[11px] font-semibold tabular-nums">{fmt(views)}</span>
        </div>

        {/* Reads */}
        <div className={`flex items-center gap-1.5 shrink-0 ${dark ? "text-[#3b4f63]" : "text-gray-400"}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <span className="text-[11px] font-semibold tabular-nums">{fmt(reads)}</span>
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <svg className="w-3.5 h-3.5 text-amber-400/70" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className={`text-[11px] font-semibold ${dark ? "text-[#68788a]" : "text-gray-500"}`}>{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price / availability label */}
        {project?.isSold ? (
          <span className={`text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-lg ${
            dark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
          }`}>Sold</span>
        ) : project?.holdStatus === "held" ? (
          <span className={`text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-lg ${
            dark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"
          }`}>On Hold</span>
        ) : project?.premium && project?.price ? (
          <span className={`text-[14px] font-extrabold tracking-tight ${dark ? "text-white" : "text-gray-900"}`}>${project.price}</span>
        ) : (
          <span className={`text-[10px] font-bold tracking-wide uppercase ${dark ? "text-[#3b4f63]" : "text-gray-300"}`}>Free</span>
        )}

        {/* Arrow CTA button â€” published only */}
        {isClickable && (
          <div className={`ml-1 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
            dark
              ? "bg-[#152030] text-[#3b4f63] group-hover:bg-[#1e3b58] group-hover:text-white"
              : "bg-gray-100 text-gray-400 group-hover:bg-gray-900 group-hover:text-white"
          }`}>
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-px" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Rejection reason strip */}
      {project?.status === "rejected" && project?.rejectionReason && (
        <div className={`px-5 py-2 border-t text-[10px] leading-relaxed line-clamp-2 ${
          dark ? "border-[#182535] bg-rose-950/20 text-rose-400/60" : "border-gray-100 bg-rose-50/60 text-rose-500"
        }`}>
          {project.rejectionReason}
        </div>
      )}
    </div>
  );
};

export default ProjectCard;