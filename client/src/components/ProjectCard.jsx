import { Flame, Video, CheckCircle } from "lucide-react";

const ProjectCard = ({ project, userName }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 overflow-hidden max-w-sm w-full">
      {/* Card body */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6">
        {/* Project icon */}
        <div className="w-16 h-16 mb-5 flex items-center justify-center">
          <Flame size={48} className="text-[#1a365d]" strokeWidth={1.2} />
        </div>

        {/* Author name */}
        <p className="text-xs font-medium text-gray-400 tracking-widest uppercase mb-2">
          {userName || "Unknown Author"}
        </p>

        {/* Project title */}
        <h3 className="text-xl font-extrabold text-gray-900 tracking-wide text-center mb-6">
          {project?.title?.toUpperCase() || "UNTITLED"}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 text-center leading-relaxed line-clamp-3 mb-8">
          {project?.description || "No description provided."}
        </p>
      </div>

      {/* Card footer */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-gray-400">
          <Video size={16} strokeWidth={1.8} />
          <span className="text-xs font-semibold tracking-wider uppercase">Film</span>
        </div>
        <span className="text-gray-300">•</span>
        <div className="flex items-center gap-2 text-gray-400">
          <CheckCircle size={16} strokeWidth={1.8} />
          <span className="text-xs font-semibold tracking-wider uppercase">
            {project?.premium ? "Premium" : "Evaluations"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
