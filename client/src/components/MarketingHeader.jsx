import { useContext, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  House,
  Info,
  Mail,
  User,
  LogIn,
  UserPlus,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";
import BrandLogo from "./BrandLogo"; // ✅ correct import
import { AuthContext } from "../context/AuthContext";

const links = [
  { to: "/", label: "Home", icon: House },
  { to: "/about", label: "About us", icon: Info },
  { to: "/contact", label: "Contact us", icon: Mail },
];

const isLinkActive = (pathname, to) => {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
};

const MarketingHeader = () => {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const primaryLabel = user?.role === "reader" ? "Reader" : "Dashboard";

  return (
    <nav className="fixed top-0 w-full z-50 bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">

        {/* ✅ LOGO */}
        <BrandLogo className="h-8 sm:h-10" />

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-4">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm px-3 py-2 rounded-full ${isLinkActive(pathname, item.to)
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
                }`}
            >
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link to="/profile" className="text-gray-400 hover:text-white">
                Profile
              </Link>
              <Link
                to={primaryPath}
                className="bg-white px-4 py-2 rounded-md text-[#0F172A] font-medium hover:bg-gray-100 transition-colors"
              >
                {primaryLabel}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-400 hover:text-white">
                Sign in
              </Link>
              <Link
                to="/join"
                className="bg-white px-4 py-2 rounded-md text-[#0F172A] font-medium hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-2 bg-black">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-gray-300 hover:text-white inline-flex items-center gap-2 py-1"
              onClick={() => setMenuOpen(false)}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link to="/profile" className="text-gray-300 hover:text-white inline-flex items-center gap-2 py-1">
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link to={primaryPath} className="text-gray-300 hover:text-white inline-flex items-center gap-2 py-1">
                {user?.role === "reader" ? <BookOpen className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                {primaryLabel}
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-300 hover:text-white inline-flex items-center gap-2 py-1">
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
              <Link to="/join" className="text-gray-300 hover:text-white inline-flex items-center gap-2 py-1">
                <UserPlus className="w-4 h-4" />
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default MarketingHeader;