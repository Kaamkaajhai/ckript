import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const navItems = [
    {
      path: "/feed",
      label: "Home",
      icon: (a) => (
        <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      path: "/search",
      label: "Explore",
      icon: (a) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      path: "/messages",
      label: "Messages",
      icon: (a) => (
        <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    {
      path: "/upload",
      label: "Create",
      icon: (a) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: (a) => (
        <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      path: "/profile/" + (user?._id || ""),
      label: "Profile",
      icon: (a) => (
        <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      path: "/settings",
      label: "Settings",
      icon: (a) => (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={a ? 2.5 : 1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  /* Only show top-5 items on the mobile bottom bar to avoid crowding */
  const mobileItems = navItems.slice(0, 5);

  const NavLink = ({ item, showLabel = true }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        title={item.label}
        className={[
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
          active
            ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-semibold shadow-sm"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        ].join(" ")}
      >
        <span className={["shrink-0 transition-transform duration-200 group-hover:scale-110", active ? "text-indigo-600" : ""].join(" ")}>
          {item.icon(active)}
        </span>
        {showLabel && <span className="truncate text-[15px]">{item.label}</span>}
        {active && showLabel && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
      </Link>
    );
  };

  return (
    <>
      {/* ══ DESKTOP (lg+) — Full left sidebar with icon + title ══ */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[250px] bg-white border-r border-gray-200/80 flex-col z-30">
        <div className="px-5 py-5 border-b border-gray-100">
          <Link to="/feed" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-[19px] font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ScriptBridge
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} showLabel={true} />
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate("/profile/" + (user?._id || ""))}>
            <img src={user?.profileImage || "https://placehold.co/40x40/e2e8f0/64748b?text=U"} alt={user?.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full mt-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center gap-2 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Log out
          </button>
        </div>
      </aside>

      {/* ══ TABLET (md–lg) — Icon-only left sidebar ══ */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-screen w-[72px] bg-white border-r border-gray-200/80 flex-col items-center z-30">
        <div className="py-5">
          <Link to="/feed">
            <div className="w-9 h-9 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
              <span className="text-white font-bold text-lg">S</span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 px-2 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} title={item.label}
                className={[
                  "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200",
                  active ? "bg-linear-to-r from-indigo-50 to-purple-50 text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                ].join(" ")}
              >
                {item.icon(active)}
              </Link>
            );
          })}
        </nav>
        <div className="py-4 flex flex-col items-center gap-2">
          <button onClick={() => navigate("/profile/" + (user?._id || ""))}>
            <img src={user?.profileImage || "https://placehold.co/40x40/e2e8f0/64748b?text=U"} alt={user?.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200" />
          </button>
          <button onClick={handleLogout} title="Log out" className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </aside>

      {/* ══ MOBILE (<md) — Fixed bottom icon bar ══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-gray-200/60 flex items-center justify-around px-1 z-50">
        {mobileItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                "flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl transition-all duration-200",
                active ? "text-indigo-600" : "text-gray-400",
              ].join(" ")}
            >
              <span className={active ? "scale-110" : ""}>{item.icon(active)}</span>
              <span className={[
                "text-[10px] leading-tight",
                active ? "font-bold text-indigo-600" : "font-medium text-gray-400",
              ].join(" ")}>{item.label}</span>
              {active && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-indigo-600"></span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;
