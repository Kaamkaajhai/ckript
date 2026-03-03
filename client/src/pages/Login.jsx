import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import OTPVerification from "../components/OTPVerification";
import BrandLogo from "../components/BrandLogo";

const Login = () => {
  const { login, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await login(email, password);
      
      // Check if OTP verification is required
      if (userData?.requiresVerification) {
        setUserEmail(email);
        setShowOTPVerification(true);
        return;
      }
      
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

  const handleOTPSuccess = (userData) => {
    // Update auth context with user data
    setUser(userData);
    
    // Navigate based on role
    if (userData.role === "reader") {
      navigate("/reader");
    } else if (userData.role === "investor") {
      navigate("/home");
    } else {
      navigate("/dashboard");
    }
  };

  const handleBackToLogin = () => {
    setShowOTPVerification(false);
    setUserEmail("");
  };

  // Show OTP verification screen if needed
  if (showOTPVerification) {
    return (
      <OTPVerification 
        email={userEmail} 
        onSuccess={handleOTPSuccess} 
        onBack={handleBackToLogin}
      />
    );
  }

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
            <BrandLogo className="h-10 w-auto" />
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
