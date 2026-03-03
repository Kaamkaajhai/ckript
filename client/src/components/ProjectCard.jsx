import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";

const ProjectCard = ({ project, userName }) => {
  const navigate = useNavigate();
  const { isDarkMode: dark } = useDarkMode();

  const statusConfig = {
    pending_approval: {
      label: "Pending Approval",
      className: "bg-amber-100 text-amber-700 border border-amber-200",
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    rejected: {
      label: "Not Approved",
      className: "bg-red-100 text-red-700 border border-red-200",
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    published: null,
  };

  const statusInfo = statusConfig[project?.status];
  const isClickable = project?.status === "published";

  return (
    <div
      onClick={() => isClickable && navigate(`/script/${project._id}`)}
      className={`rounded-2xl border transition-all duration-300 overflow-hidden w-full group relative ${
        isClickable ? "cursor-pointer hover:-translate-y-1" : "cursor-default opacity-90"
      } ${
        dark
          ? "bg-[#0d1829] border-white/[0.06] hover:border-white/[0.1] hover:shadow-xl hover:shadow-[#020609]/30"
          : "bg-white border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/60"
      }`}
    >
      {/* Status badge */}
      {statusInfo && (
        <div className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusInfo.className}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </div>
      )}
      {/* Rejection reason tooltip */}
      {project?.status === "rejected" && project?.rejectionReason && (
        <div className="absolute top-10 right-3 z-10 max-w-[160px] bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5 text-[10px] text-red-600 leading-snug font-medium">
          {project.rejectionReason}
        </div>
      )}
      {/* Card body */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6 relative">
        {/* Subtle accent at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#1e3a5f]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Project icon */}
        <div className={`w-16 h-16 mb-5 flex items-center justify-center rounded-2xl transition-colors duration-300 ${
          dark
            ? "bg-white/[0.04] group-hover:bg-white/[0.07]"
            : "bg-[#1e3a5f]/[0.04] group-hover:bg-[#1e3a5f]/[0.08]"
        }`}>
          <svg className={`w-10 h-10 group-hover:scale-110 transition-transform duration-300 ${
            dark ? "text-[#7aafff]/50" : "text-[#1e3a5f]"
          }`} fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
          </svg>
        </div>

        {/* Author name */}
        <p className={`text-sm font-semibold tracking-widest uppercase mb-3 ${
          dark ? "text-white/25" : "text-gray-400"
        }`}>
          {userName || "Unknown Author"}
        </p>

        {/* Project title */}
        <h3 className={`text-2xl font-bold tracking-wide text-center mb-6 ${
          dark ? "text-white/85" : "text-gray-900"
        }`}>
          {project?.title?.toUpperCase() || "UNTITLED"}
        </h3>

        {/* Logline */}
        <p className={`text-base text-center leading-relaxed line-clamp-3 mb-8 italic ${
          dark ? "text-white/35" : "text-gray-500"
        }`}>
          {project?.logline || project?.description || "No description provided."}
        </p>
      </div>

      {/* Card footer */}
      <div className={`border-t px-6 py-4 flex items-center justify-center gap-3 ${
        dark ? "border-white/[0.06]" : "border-gray-100"
      }`}>
        <div className={`flex items-center gap-2 ${dark ? "text-white/30" : "text-gray-400"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-bold tracking-wider uppercase">Film</span>
        </div>
        <span className={dark ? "text-white/10" : "text-gray-300"}>•</span>
        <div className={`flex items-center gap-2 ${dark ? "text-white/30" : "text-gray-400"}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold tracking-wider uppercase">
            {project?.premium ? "Premium" : "Evaluations"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
