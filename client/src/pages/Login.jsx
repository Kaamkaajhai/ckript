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
      } else if (storedUser?.role === "investor") {
        navigate("/home");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0f1c2e] via-[#1e3a5f] to-[#2d5a8e] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',backgroundSize:'32px 32px'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 px-12 max-w-md">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4 leading-tight">Where stories find<br/>their audience.</h1>
          <p className="text-blue-200/70 text-base leading-relaxed">Ckript connects writers, producers, and investors to bring creative projects to life.</p>
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['#4a6d8c','#6b8fad','#8ab0c8'].map((c,i)=>(
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#1e3a5f]" style={{backgroundColor:c}} />
              ))}
            </div>
            <p className="text-sm text-blue-200/50 font-medium">Join 2,000+ creators</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <span className="text-lg font-extrabold text-[#1e3a5f] tracking-tight">Ckript</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-[15px] text-gray-400 mt-1.5 font-medium">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Email address</label>
              <input type="email" placeholder="you@example.com"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Password</label>
              <input type="password" placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl text-[15px] font-bold hover:bg-[#162d4a] transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#1e3a5f]/20 hover:-translate-y-0.5">
              Sign in
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-gray-400 font-medium">
            Don't have an account? <Link to="/join" className="text-[#1e3a5f] font-semibold hover:text-[#162d4a] transition-colors">Create one</Link>
          </p>
          <p className="mt-3 text-center">
            <Link to="/" className="text-[13px] text-gray-400 hover:text-gray-600 font-medium transition-colors">&larr; Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
