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
      await login(email, password);
      navigate("/feed");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        <input type="email" placeholder="Email" className="w-full p-2 border rounded mb-3" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="w-full p-2 border rounded mb-3" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Login</button>
        <p className="mt-4 text-center text-sm">
          Don't have an account? <Link to="/signup" className="text-indigo-600 hover:underline">Sign up</Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-gray-600 hover:underline">Back to Home</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
