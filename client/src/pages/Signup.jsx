import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { FileText, UserCircle, Mail, Lock, Users, ArrowLeft } from "lucide-react";

const Signup = () => {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "creator",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signup(formData);
      navigate("/feed");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f0f4f8]">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-96 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <FileText size={28} className="text-[#0a1628]" strokeWidth={1.5} />
          <h2 className="text-2xl font-extrabold text-[#0a1628] tracking-tight">Create Account</h2>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        <div className="relative mb-4">
          <UserCircle size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Full name"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent outline-none"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="relative mb-4">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            placeholder="Email address"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent outline-none"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="relative mb-4">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent outline-none"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            minLength="6"
          />
        </div>
        <div className="relative mb-5">
          <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a365d] focus:border-transparent outline-none appearance-none bg-white"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="creator">Creator / Writer</option>
            <option value="investor">Investor</option>
            <option value="producer">Producer</option>
            <option value="director">Director</option>
            <option value="actor">Actor</option>
            <option value="reader">Reader</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-[#0f2544] text-white py-2.5 rounded-lg hover:bg-[#1a365d] transition font-semibold text-sm">
          Create Account
        </button>
        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-[#1a365d] font-semibold hover:underline">Sign in</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"><ArrowLeft size={14} /> Back to Home</Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
