import { useNavigate } from "react-router-dom";

const ProjectCard = ({ project, userName }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/script/${project._id}`)}
      className="bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 overflow-hidden max-w-sm w-full cursor-pointer">
      {/* Card body */}
      <div className="flex flex-col items-center px-6 pt-10 pb-6">
        {/* Project icon */}
        <div className="w-16 h-16 mb-5 flex items-center justify-center">
          <svg className="w-14 h-14 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
          </svg>
        </div>

        {/* Author name */}
        <p className="text-sm font-semibold text-gray-400 tracking-widest uppercase mb-3">
          {userName || "Unknown Author"}
        </p>

        {/* Project title */}
        <h3 className="text-2xl font-bold text-gray-900 tracking-wide text-center mb-6">
          {project?.title?.toUpperCase() || "UNTITLED"}
        </h3>

        {/* Description */}
        <p className="text-base text-gray-500 text-center leading-relaxed line-clamp-3 mb-8">
          {project?.description || "No description provided."}
        </p>
      </div>

      {/* Card footer */}
      <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-bold tracking-wider uppercase">Film</span>
        </div>
        <span className="text-gray-300">•</span>
        <div className="flex items-center gap-2 text-gray-400">
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
