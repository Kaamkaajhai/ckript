import { useContext, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import { ChevronDown, Search, User, Settings, LogOut } from "lucide-react";

const MainLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <Sidebar />

      {/* ── Top bar ── */}
      <header className="fixed top-0 right-0 left-0 md:left-[72px] lg:left-[380px] h-16 bg-white border-b border-[#d0dbe8] flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20">
        {/* Search area */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="flex items-center border border-[#c0d0e0] rounded-md overflow-hidden bg-white hover:border-[#1a365d] transition-colors">
            <div className="flex items-center gap-1.5 px-3 py-2 border-r border-[#c0d0e0] bg-[#edf2f7] cursor-pointer select-none">
              <span className="text-sm font-semibold text-[#1a365d] tracking-wide">PROJECTS</span>
              <ChevronDown size={16} className="text-[#2d4a6f]" />
            </div>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none w-48 sm:w-64 lg:w-80 bg-transparent"
            />
            <button type="submit" className="px-3 py-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Search size={18} />
            </button>
          </div>
        </form>

        {/* User badge */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#edf2f7] hover:bg-[#d0dbe8] transition-colors"
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1a365d] flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
            )}
            <span className="hidden sm:block text-sm font-semibold text-[#1a365d] tracking-wide">
              {user?.name?.toUpperCase() || "USER"}
            </span>
            <svg className="w-4 h-4 text-[#2d4a6f]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-[#d0dbe8] py-1 z-50">
              <button
                onClick={() => { navigate(`/profile/${user?._id || ""}`); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <User size={16} strokeWidth={1.8} />
                My Profile
              </button>
              <button
                onClick={() => { navigate("/settings"); setDropdownOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings size={16} strokeWidth={1.8} />
                Settings
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={16} strokeWidth={1.8} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="pt-16 pb-20 md:pb-0 md:ml-[72px] lg:ml-[380px] min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
