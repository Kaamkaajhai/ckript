import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const searchOptions = [
    { key: "all", label: "All", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
    { key: "projects", label: "Projects", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
    { key: "writers", label: "Writers", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
    { key: "investors", label: "Investors", icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { key: "readers", label: "Readers", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchNavigate = (type) => {
    setShowDropdown(false);
    navigate(`/search?type=${type}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200">
      <h1 className="text-base font-bold text-[#1e3a5f] tracking-tight">Script Bridge</h1>

      {/* Center search */}
      <div className="relative hidden md:block" ref={dropdownRef}>
        <div className="relative flex items-center">
          <svg className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="w-56 h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 focus:border-[#1e3a5f]/40 focus:bg-white transition-all"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/50 py-1.5 z-50 min-w-[220px]">
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Search for</p>
            {searchOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSearchNavigate(opt.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-[#1e3a5f] transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
                {opt.label}
                {searchQuery && (
                  <span className="ml-auto text-[11px] text-gray-400 truncate max-w-[80px]">"{searchQuery}"</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 text-base">
        <Link to="/dashboard" className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors">Dashboard</Link>
        <Link to="/search" className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors md:hidden">Search</Link>
        <Link to={`/profile/${user?._id}`} className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors">Profile</Link>
        <Link to="/upload" className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors">Upload</Link>
        <button onClick={logout}
          className="px-3 py-1.5 text-base font-semibold text-gray-500 hover:text-red-600 transition-colors">
          Log out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
