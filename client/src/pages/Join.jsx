import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

const EMAIL_EXISTS_MSG = "User already exists";

const Join = () => {
  const { join } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: searchParams.get("role") || "creator",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await join(formData);
      if (userData?.role === "investor") {
        navigate("/home");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Join failed";
      setError(msg);
    }
  };

  const isEmailExists = error === EMAIL_EXISTS_MSG;

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-[#0f1c2e] via-[#1e3a5f] to-[#2d5a8e] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',backgroundSize:'32px 32px'}} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 px-12 max-w-md">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-8">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4 leading-tight">Start your creative<br/>journey today.</h1>
          <p className="text-blue-200/70 text-base leading-relaxed">Upload scripts, connect with industry professionals, and unlock opportunities for your stories.</p>
          <div className="mt-12 space-y-3">
            {['Upload and share scripts','Get AI-powered analysis','Connect with producers & investors'].map((t,i)=>(
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-blue-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                </div>
                <span className="text-sm text-blue-200/60 font-medium">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
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
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
            <p className="text-[15px] text-gray-400 mt-1.5 font-medium">Get started with Ckript in seconds</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <span>
                {isEmailExists ? (
                  <>An account with this email already exists.{" "}
                    <Link to="/login" className="underline hover:no-underline">Sign in instead →</Link>
                  </>
                ) : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Full name</label>
              <input type="text" placeholder="Your full name"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Email address</label>
              <input type="email" placeholder="you@example.com"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Password</label>
              <input type="password" placeholder="Min 6 characters"
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200"
                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">I am a...</label>
              <select
                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl text-[15px] text-gray-800 outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 focus:bg-white transition-all duration-200 appearance-none"
                style={{backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center',backgroundSize:'16px'}}
                value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="creator">Creator / Writer</option>
                <option value="investor">Investor</option>
                <option value="producer">Producer</option>
                <option value="director">Director</option>
                <option value="actor">Actor</option>
                <option value="reader">Reader</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl text-[15px] font-bold hover:bg-[#162d4a] transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-[#1e3a5f]/20 hover:-translate-y-0.5 mt-1">
              Create account
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-gray-400 font-medium">
            Already have an account? <Link to="/login" className="text-[#1e3a5f] font-semibold hover:text-[#162d4a] transition-colors">Sign in</Link>
          </p>
          <p className="mt-3 text-center">
            <Link to="/" className="text-[13px] text-gray-400 hover:text-gray-600 font-medium transition-colors">&larr; Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Join;
