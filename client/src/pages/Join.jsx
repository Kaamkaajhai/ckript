import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

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
      await join(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Join failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f8f9fb]">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1e3a5f] tracking-tight">Create account</h2>
          <p className="text-base text-gray-500 mt-2">Join Script Bridge today</p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Name</label>
            <input type="text" placeholder="Your full name"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] transition-colors"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Email</label>
            <input type="email" placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] transition-colors"
              value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Password</label>
            <input type="password" placeholder="Min 6 characters"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-800 placeholder-gray-400 outline-none focus:border-[#1e3a5f] transition-colors"
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength="6" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">Role</label>
            <select
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-base text-gray-800 outline-none focus:border-[#1e3a5f] transition-colors"
              value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
              <option value="creator">Creator / Writer</option>
              <option value="investor">Investor</option>
              <option value="producer">Producer</option>
              <option value="director">Director</option>
              <option value="actor">Actor</option>
              <option value="reader">Reader</option>
            </select>
          </div>
          <button type="submit" className="w-full py-3 bg-[#1e3a5f] text-white rounded-lg text-base font-bold hover:bg-[#162d4a] transition-colors">
            Create account
          </button>
        </form>

        <p className="mt-8 text-center text-base text-gray-500">
          Already have an account? <Link to="/login" className="text-[#1e3a5f] font-semibold hover:underline">Sign in</Link>
        </p>
        <p className="mt-3 text-center">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 font-medium">&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
};

export default Join;
