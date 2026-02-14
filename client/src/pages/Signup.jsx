import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

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
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Signup</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        <input
          type="text"
          placeholder="Name"
          className="w-full p-2 border rounded mb-3"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded mb-3"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded mb-3"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength="6"
        />
        <select
          className="w-full p-2 border rounded mb-3"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
        >
          <option value="creator">Creator</option>
          <option value="investor">Investor</option>
          <option value="actor">Actor</option>
          <option value="reader">Reader</option>
        </select>
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">
          Signup
        </button>
        <p className="mt-4 text-center text-sm">
          Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Login</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-gray-600 hover:underline">Back to Home</Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
