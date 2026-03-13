import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import BuyCreditsModal from "./BuyCreditsModal";
import api from "../services/api";
import BrandLogo from "./BrandLogo";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState(0);
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

  useEffect(() => {
    if (user && user.role !== "investor") {
      fetchCreditsBalance();
    }
  }, [user]);

  const fetchCreditsBalance = async () => {
    try {
      const { data } = await api.get("/credits/balance");
      setCreditsBalance(data.balance || 0);
    } catch {
      setCreditsBalance(0);
    }
  };

  const handleCreditsUpdate = (data) => {
    setCreditsBalance(data.credits.balance);
  };

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
    <>
      <BuyCreditsModal 
        isOpen={showBuyCredits} 
        onClose={() => setShowBuyCredits(false)}
        onSuccess={handleCreditsUpdate}
      />
      
      <nav className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200">
      <BrandLogo className="h-9 w-auto" />

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
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl shadow-gray-200/50 py-1.5 z-50 min-w-55">
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
                  <span className="ml-auto text-[11px] text-gray-400 truncate max-w-20">"{searchQuery}"</span>
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
        
        {/* Credits Button - Hidden for investors */}
        {user?.role !== "investor" && (
          <button
            onClick={() => setShowBuyCredits(true)}
            className="group flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 hover:border-sky-300 hover:bg-sky-50 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-3.5 h-3.5 text-sky-500 group-hover:text-sky-600 flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" />
            </svg>
            <span className="font-bold text-[13px] text-gray-900 tabular-nums tracking-tight">{creditsBalance}</span>
            <span className="text-[11px] font-medium text-gray-400">CR</span>
          </button>
        )}
        
        <button onClick={logout}
          className="px-3 py-1.5 text-base font-semibold text-gray-500 hover:text-red-600 transition-colors">
          Log out
        </button>
      </div>
    </nav>
    </>
  );
};

export default Navbar;
