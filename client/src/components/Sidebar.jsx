import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import {
  LayoutDashboard,
  User,
  TrendingUp,
  Star,
  CalendarDays,
  FileSearch,
  UserPlus,
  MapPin,
  Rocket,
  Bell,
  PlusCircle,
  ShoppingCart,
  ChevronRight,
  Flame,
  LogOut,
  Menu,
  X,
  Search,
  FileText,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [myScripts, setMyScripts] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetchMyScripts();
  }, []);

  const fetchMyScripts = async () => {
    try {
      const { data } = await api.get("/scripts");
      const mine = data.filter(
        (s) => s.creator?._id === user?._id || s.creator === user?._id
      );
      setMyScripts(mine);
    } catch {
      setMyScripts([]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  /* ── Navigation items ── */
  const mainNavItems = [
    { path: "/dashboard", label: "MY DASHBOARD", icon: <LayoutDashboard size={18} strokeWidth={1.8} /> },
    { path: `/profile/${user?._id || ""}`, label: "MY PROFILE", icon: <User size={18} strokeWidth={1.8} /> },
    { path: "/feed", label: "TOP LISTS", icon: <TrendingUp size={18} strokeWidth={1.8} /> },
    { path: "/featured", label: "FEATURED PROJECTS", icon: <Star size={18} strokeWidth={1.8} /> },
    { path: "/messages", label: "MY PROGRAMS", icon: <CalendarDays size={18} strokeWidth={1.8} /> },
    { path: "/search", label: "SEARCH PROJECTS", icon: <FileSearch size={18} strokeWidth={1.8} /> },
    { path: "/search?type=writers", label: "SEARCH WRITERS", icon: <UserPlus size={18} strokeWidth={1.8} /> },
    { path: "/smart-match", label: "SMART MATCH", icon: <MapPin size={18} strokeWidth={1.8} /> },
    { path: "/auditions", label: "AUDITIONS", icon: <Rocket size={18} strokeWidth={1.8} /> },
    { path: "/notifications", label: "NOTIFICATIONS", icon: <Bell size={18} strokeWidth={1.8} /> },
  ];

  const actionItems = [
    { path: "/upload", label: "ADD PROJECT", icon: <PlusCircle size={18} strokeWidth={1.8} /> },
    { path: "/settings", label: "BUY EVALUATIONS", icon: <ShoppingCart size={18} strokeWidth={1.8} /> },
  ];

  /* ─── Mobile bottom items ─── */
  const mobileItems = [
    { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/feed", label: "Feed", icon: <TrendingUp size={20} /> },
    { path: "/upload", label: "Create", icon: <PlusCircle size={20} /> },
    { path: "/search", label: "Search", icon: <Search size={20} /> },
    { path: `/profile/${user?._id || ""}`, label: "Profile", icon: <User size={20} /> },
  ];

  const NavItem = ({ item }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center gap-3.5 px-5 py-2.5 text-[13px] font-semibold tracking-wider transition-all duration-200 ${
          active
            ? "bg-white/15 text-white border-r-2 border-white"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className={`shrink-0 ${active ? "text-white" : "text-white/50 group-hover:text-white"}`}>
          {item.icon}
        </span>
        <span>{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center">
          <FileText size={26} className="text-white" strokeWidth={1.5} />
        </div>
        <span className="text-white font-bold text-lg tracking-wide">SCRIPT BRIDGE</span>
      </div>

      {/* ── Separator ── */}
      <div className="mx-4 border-t border-white/10"></div>

      {/* ── Main navigation ── */}
      <nav className="flex-1 py-3 overflow-y-auto sidebar-scroll">
        {mainNavItems.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}

        {/* ── Separator ── */}
        <div className="mx-4 my-3 border-t border-white/10"></div>

        {actionItems.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}

        {/* ── MY PROJECTS collapsible ── */}
        <div className="mx-4 my-3 border-t border-white/10"></div>

        <button
          onClick={() => setProjectsOpen(!projectsOpen)}
          className="flex items-center gap-2 px-5 py-2.5 w-full text-left text-white/60 hover:text-white transition-colors"
        >
          <ChevronRight
            size={16}
            className={`transition-transform duration-200 ${projectsOpen ? "rotate-90" : ""}`}
          />
          <span className="text-[13px] font-semibold tracking-wider">MY PROJECTS</span>
        </button>

        {projectsOpen && (
          <div className="pl-5">
            {myScripts.length > 0 ? (
              myScripts.map((script) => (
                <Link
                  key={script._id}
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-5 py-2 text-white/50 hover:text-white transition-colors"
                >
                  <Flame size={18} className="text-white/70" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <span className="block text-[12px] font-semibold tracking-wider truncate">
                      {script.title?.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-gray-500">Listed</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-5 py-2 text-[11px] text-gray-600 italic">No projects yet</p>
            )}
          </div>
        )}
      </nav>

      {/* ── User section at bottom ── */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-[12px] font-semibold tracking-wider text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2 justify-center"
        >
          <LogOut size={16} />
          LOG OUT
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ══ DESKTOP (lg+) — Full dark sidebar ══ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[380px] bg-[#0a1628] flex-col z-30">
        <SidebarContent />
      </aside>

      {/* ══ TABLET (md–lg) — Icon-only dark sidebar ══ */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-screen w-[72px] bg-[#0a1628] flex-col items-center z-30">
        <div className="py-5">
          <Link to="/dashboard">
            <div className="w-10 h-10 flex items-center justify-center">
              <FileText size={26} className="text-white" strokeWidth={1.5} />
            </div>
          </Link>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 px-2 py-2 overflow-y-auto">
          {mainNavItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                title={item.label}
                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.icon}
              </Link>
            );
          })}
          <div className="w-8 my-2 border-t border-white/10"></div>
          {actionItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                title={item.label}
                className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.icon}
              </Link>
            );
          })}
        </nav>
        <div className="py-4 flex flex-col items-center gap-2">
          <button onClick={() => navigate(`/profile/${user?._id || ""}`)}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-700" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </button>
          <button onClick={handleLogout} title="Log out" className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ══ MOBILE (<md) — Hamburger + slide-out sidebar + bottom bar ══ */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#0a1628] rounded-lg flex items-center justify-center text-white shadow-lg"
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}></div>
          <aside className="absolute left-0 top-0 h-full w-[300px] bg-[#0a1628] shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={22} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a1628]/95 backdrop-blur-md border-t border-[#1a365d] flex items-center justify-around px-1 z-40">
        {mobileItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all duration-200 ${
                active ? "text-white" : "text-white/40"
              }`}
            >
              <span className={active ? "scale-110" : ""}>{item.icon}</span>
              <span className={`text-[10px] leading-tight ${active ? "font-bold text-white" : "font-medium text-white/40"}`}>
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
