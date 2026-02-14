import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="flex justify-between items-center p-4 bg-white shadow-md backdrop-blur-md">
      <h1 className="text-xl font-bold text-indigo-600">Script Bridge</h1>
      <div className="flex items-center space-x-4">
        <Link to="/feed" className="hover:text-indigo-500">Feed</Link>
        <Link to="/search" className="hover:text-indigo-500">Search</Link>
        <Link to={`/profile/${user?._id}`} className="hover:text-indigo-500">Profile</Link>
        <Link to="/messages" className="hover:text-indigo-500">Messages</Link>
        <Link to="/upload" className="hover:text-indigo-500">Upload</Link>
        <Link to="/dashboard" className="hover:text-indigo-500">Dashboard</Link>
        <Link to="/settings" className="hover:text-indigo-500">Settings</Link>
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
