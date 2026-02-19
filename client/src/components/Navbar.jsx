import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="flex justify-between items-center px-6 h-16 bg-white border-b border-gray-200">
      <h1 className="text-base font-bold text-[#1e3a5f] tracking-tight">Script Bridge</h1>
      <div className="flex items-center gap-5 text-base">
        <Link to="/dashboard" className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors">Dashboard</Link>
        <Link to="/search" className="text-gray-500 hover:text-[#1e3a5f] font-medium transition-colors">Search</Link>
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
