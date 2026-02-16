import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { FileText, Mail, Lock, ArrowLeft } from "lucide-react";

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
      await login(email, password);
      navigate("/feed");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f0f4f8]">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-96 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <FileText size={28} className="text-[#0a1628]" strokeWidth={1.5} />
          <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Welcome back</h2>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        <div className="relative mb-4">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="email" placeholder="Email address" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="relative mb-5">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="password" placeholder="Password" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent outline-none" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="w-full bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm">Sign In</button>
        <p className="mt-5 text-center text-sm text-gray-500">
          Don't have an account? <Link to="/signup" className="text-[#1a365d] font-semibold hover:underline">Create one</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"><ArrowLeft size={14} /> Back to Home</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
