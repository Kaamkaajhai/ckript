import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  
  // State for collapsible sections
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [watchlistOpen, setWatchlistOpen] = useState(true); // NEW for Producers
  
  const [myScripts, setMyScripts] = useState([]);
  const [watchlist, setWatchlist] = useState([]); // NEW for Producers
  const [mobileOpen, setMobileOpen] = useState(false);

  const isIndustry = user?.role === 'professional' || user?.role === 'producer' || user?.role === 'investor';

  useEffect(() => {
    if (user) {
      if (isIndustry) {
        fetchWatchlist();
      } else {
        fetchMyScripts();
      }
    }
  }, [user]);

  const fetchMyScripts = async () => {
    try {
      const { data } = await api.get("/scripts");
      const mine = data.filter((s) => s.creator?._id === user?._id || s.creator === user?._id);
      setMyScripts(mine);
    } catch { setMyScripts([]); }
  };

  const fetchWatchlist = async () => {
    try {
      // You need an endpoint for this: /users/watchlist
      const { data } = await api.get("/users/watchlist"); 
      setWatchlist(data);
    } catch { 
      setWatchlist([]); 
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const mainNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { path: `/profile/${user?._id || ""}`, label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { path: "/top-list", label: "Top List", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
    { path: "/featured", label: "Featured", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
    { path: "/search", label: "Search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  ];

  const actionItems = [
    { path: "/upload", label: "New Project", icon: "M12 4v16m8-8H4" },
  ];

  const mobileItems = [
    { path: "/dashboard", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { path: "/upload", label: "Create", icon: "M12 4v16m8-8H4" },
    { path: "/search", label: "Search", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { path: `/profile/${user?._id || ""}`, label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ];

  const Icon = ({ d, size = "w-[22px] h-[22px]" }) => (
    <svg className={size} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  const NavItem = ({ item }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3.5 px-4 py-3 mx-2 rounded-xl text-[15px] font-bold transition-colors ${
          active
            ? "bg-[#1e3a5f]/10 text-[#1e3a5f]"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        }`}
      >
        <Icon d={item.icon} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center gap-3 shrink-0">
        <svg className="w-8 h-8 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-lg font-extrabold text-[#1e3a5f] tracking-tight">Script Bridge</span>
      </div>

      <div className="mx-3 border-t border-gray-100"></div>

      <nav className="flex-1 py-3 overflow-y-auto space-y-1">
        {mainNavItems.map((item) => <NavItem key={item.label} item={item} />)}
        <div className="mx-3 my-2 border-t border-gray-100"></div>
        {actionItems.map((item) => <NavItem key={item.label} item={item} />)}
        <div className="mx-3 my-2 border-t border-gray-100"></div>

        <button
          onClick={() => setProjectsOpen(!projectsOpen)}
          className="flex items-center gap-2.5 px-5 py-2.5 w-full text-left text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform duration-200 ${projectsOpen ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-bold tracking-wider uppercase text-gray-400">My Projects</span>
        </button>

        {projectsOpen && (
          <div className="pl-3">
            {myScripts.length > 0 ? (
              myScripts.map((script) => (
                <Link key={script._id} to="/dashboard" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-5 py-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0"></div>
                  <span className="text-[15px] font-semibold truncate">{script.title}</span>
                </Link>
              ))
            ) : (
              <p className="px-5 py-2 text-sm text-gray-400 italic font-medium">No projects yet</p>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <button onClick={handleLogout}
          className="w-full px-3 py-3 text-base font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2.5 justify-center">
          <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[270px] bg-white border-r border-gray-200 flex-col z-30">
        <SidebarContent />
      </aside>

      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-screen w-[64px] bg-white border-r border-gray-200 flex-col items-center z-30">
        <div className="h-16 flex items-center justify-center">
          <Link to="/dashboard">
            <svg className="w-7 h-7 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </Link>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto">
          {mainNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link key={item.label} to={item.path} title={item.label}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-colors ${
                  active ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                }`}>
                <Icon d={item.icon} />
              </Link>
            );
          })}
          <div className="w-6 my-1 border-t border-gray-100"></div>
          {actionItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link key={item.label} to={item.path} title={item.label}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                  active ? "bg-[#1e3a5f]/10 text-[#1e3a5f]" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                }`}>
                <Icon d={item.icon} />
              </Link>
            );
          })}
        </nav>
        <div className="py-3 flex flex-col items-center gap-2">
          <button onClick={() => navigate(`/profile/${user?._id || ""}`)}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-sm font-bold text-[#1e3a5f]">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </button>
          <button onClick={handleLogout} title="Log out"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </button>
        </div>
      </aside>

      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 shadow-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)}></div>
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-lg">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-1 z-40">
        {mobileItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 transition-colors ${
                active ? "text-[#1e3a5f]" : "text-gray-400"
              }`}>
              <Icon d={item.icon} size={`w-[22px] h-[22px] ${active ? "stroke-[2.2]" : ""}`} />
              <span className={`text-xs ${active ? "font-extrabold text-[#1e3a5f]" : "font-bold text-gray-400"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;
