import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f9fb]">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="text-center max-w-lg px-6">
        <div className="flex items-center justify-center gap-3 mb-5">
          <svg className="w-9 h-9 text-[#1e3a5f]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h1 className="text-4xl font-bold text-[#1e3a5f] tracking-tight">Script Bridge</h1>
        </div>
        <p className="text-gray-500 mb-10 text-base leading-relaxed">
          Where scripts become investable opportunities
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login" className="px-8 py-3 bg-[#1e3a5f] text-white rounded-lg text-base font-semibold hover:bg-[#162d4a] transition-colors flex items-center gap-2">
            Sign in
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link to="/join" className="px-8 py-3 bg-white text-gray-600 border border-gray-200 rounded-lg text-base font-semibold hover:bg-gray-50 transition-colors">
            Create account
          </Link>
        </div>
      </motion.div>
      <p className="absolute bottom-6 text-sm text-gray-400">&copy; 2026 Script Bridge</p>
    </div>
  );
};

export default Landing;
