import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="flex justify-between items-center p-4 bg-white shadow-md backdrop-blur-md">
      <h1 className="text-xl font-bold text-[#0a1628]">Script Bridge</h1>
      <div className="flex items-center space-x-4">
        <Link to="/feed" className="hover:text-[#1a365d]">Feed</Link>
        <Link to="/search" className="hover:text-[#1a365d]">Search</Link>
        <Link to={`/profile/${user?._id}`} className="hover:text-[#1a365d]">Profile</Link>
        <Link to="/messages" className="hover:text-[#1a365d]">Messages</Link>
        <Link to="/upload" className="hover:text-[#1a365d]">Upload</Link>
        <Link to="/dashboard" className="hover:text-[#1a365d]">Dashboard</Link>
        <Link to="/settings" className="hover:text-[#1a365d]">Settings</Link>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
