import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-5xl font-bold mb-4"
      >
        Script Bridge
      </motion.h1>
      <p className="text-lg mb-6">Where scripts become investable opportunities</p>
      <div className="space-x-4">
        <Link to="/login" className="px-6 py-2 bg-white text-indigo-600 rounded-lg shadow hover:scale-105 transition">Login</Link>
        <Link to="/signup" className="px-6 py-2 bg-indigo-700 rounded-lg shadow hover:scale-105 transition">Signup</Link>
      </div>
    </div>
  );
};

export default Landing;
