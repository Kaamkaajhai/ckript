import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await login(email, password);
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser?.role === "reader") {
        navigate("/reader");
      } else if (storedUser?.role === "professional" || storedUser?.role === "producer" || storedUser?.role === "investor") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f8f9fb]">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Sign in</h2>
          <p className="text-base text-gray-500 mt-2">Welcome back to Script Bridge</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Email</label>
            <input type="email" placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] transition-colors"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Password</label>
            <input type="password" placeholder="••••••••"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] transition-colors"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-base font-bold hover:bg-[#162d4a] transition-colors">
            Sign in
          </button>
        </form>

        <p className="mt-8 text-center text-base text-gray-500">
          Don't have an account? <Link to="/join" className="text-[#1e3a5f] font-semibold hover:underline">Sign up</Link>
        </p>
        <p className="mt-3 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 font-medium">&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
