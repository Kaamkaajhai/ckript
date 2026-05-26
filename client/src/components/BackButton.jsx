import React from "react";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";

const BackButton = ({ className = "", compact = false }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const handleClick = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const sizeClass = compact ? "w-9 h-9" : "w-10 h-10";

  const themeClasses = isDarkMode
    ? `${sizeClass} bg-[#07111d] text-white hover:bg-[#0b1624] focus:ring-sky-400/60`
    : `${sizeClass} bg-white text-[#0f1d31] hover:bg-gray-100 focus:ring-sky-400/40`;

  return (
    <button
      onClick={handleClick}
      aria-label="Go back"
      title="Go back"
      className={`flex items-center justify-center shrink-0 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeClasses} ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
};

export default BackButton;
