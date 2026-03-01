import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";

const EMAIL_EXISTS_MSG = "User already exists";

const Join = () => {
  const { join } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: searchParams.get("role") || "creator",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (formData.password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Form panel */}
      <div className="w-full flex flex-col items-center justify-center px-6 py-12">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BookOpen size={28} className="text-[#0a1628]" strokeWidth={1.5} />
            <h1 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Ckript</h1>
          </div>
          <p className="text-gray-400 text-sm font-medium mb-4">Reader Onboarding</p>
        <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-lg border border-gray-100 p-10">
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
                value={formData.password} onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setPasswordMismatch(false); }} required minLength="6" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-600 mb-2">Confirm password</label>
              <input type="password" placeholder="Re-enter your password"
                className={`w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-[15px] text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:bg-white transition-all duration-200 ${
                  passwordMismatch
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                    : 'border-gray-200 focus:border-[#1e3a5f] focus:ring-[#1e3a5f]/10'
                }`}
                value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMismatch(false); }} required />
              {passwordMismatch && (
                <p className="mt-1.5 text-[12px] font-semibold text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  Passwords do not match
                </p>
              )}
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
