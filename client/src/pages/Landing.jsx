import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";

const Landing = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#112240] to-[#1a365d] text-white">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex items-center gap-3 mb-6"
      >
        <FileText size={42} strokeWidth={1.5} />
        <h1 className="text-5xl font-extrabold tracking-tight">Script Bridge</h1>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="text-lg text-white/70 mb-8 font-medium"
      >
        Where scripts become investable opportunities
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex gap-4"
      >
        <Link to="/login" className="px-7 py-2.5 bg-white text-[#0a1628] rounded-lg shadow-lg hover:scale-105 transition font-semibold flex items-center gap-2">
          Login <ArrowRight size={16} />
        </Link>
        <Link to="/signup" className="px-7 py-2.5 bg-white/10 border border-white/30 rounded-lg shadow hover:bg-white/20 hover:scale-105 transition font-medium">
          Create Account
        </Link>
      </motion.div>
    </div>
  );
};

export default Landing;
