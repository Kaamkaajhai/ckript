import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Users, ArrowRight, ArrowLeft } from "lucide-react";

const RoleSelection = () => {
  return (
    <div className="min-h-screen bg-[#080e18] relative overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute top-0 left-0 w-[520px] h-[520px] bg-white/[0.025] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-white/[0.02] rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
      <div className="max-w-5xl w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Join Ckript
          </h1>
          <p className="text-xl text-[#8ea1b7] font-medium">
            Choose your path to get started
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Writer Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02, transition: { type: "tween", duration: 0.3 } }}
            className="group"
          >
            <Link to="/writer-onboarding">
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 p-8 border border-slate-200 hover:border-[#31465e]/40 transition-all duration-300 h-full">
                <div className="flex h-full flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0f2544] to-[#1a365d] rounded-xl flex items-center justify-center mb-6">
                    <FileText className="text-white" size={32} strokeWidth={1.5} />
                  </div>
                  
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight min-h-[72px] flex items-center justify-center">
                    I'm a Writer
                  </h2>
                  
                  <p className="text-slate-600 mb-6 text-sm min-h-[64px]">
                    Showcase your scripts to industry professionals
                  </p>
                  
                  <ul className="text-left space-y-2 w-full flex-1">
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Upload and host scripts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Professional evaluations</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Connect with producers</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Track analytics</span>
                    </li>
                  </ul>
                  
                  <div className="w-full mt-8 bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition flex items-center justify-center gap-2 text-sm">
                    Join as Writer
                    <ArrowRight size={16} />
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-4">
                    Free to write
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Industry Professional Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02, transition: { type: "tween", duration: 0.3 } }}
            className="group"
          >
            <Link to="/producer-director-onboarding">
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/80 p-8 border border-slate-200 hover:border-[#31465e]/40 transition-all duration-300 h-full">
                <div className="flex h-full flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0f2544] to-[#1a365d] rounded-xl flex items-center justify-center mb-6">
                    <Users className="text-white" size={32} strokeWidth={1.5} />
                  </div>
                  
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight min-h-[72px] flex items-center justify-center">
                    I'm a Film Industry Professional
                  </h2>
                  
                  <p className="text-slate-600 mb-6 text-sm min-h-[64px]">
                    Fund projects and connect with talented writers
                  </p>
                  
                  <ul className="text-left space-y-2 w-full flex-1">
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Find your next greenlight project</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Discover scripts by genre, format &amp; tone</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Connect directly with writers</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1e3a5f]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-700">Acquire IP &amp; secure rights for your next production</span>
                    </li>
                  </ul>
                  
                  <div className="w-full mt-8 bg-[#1e3a5f] text-white py-3 rounded-lg font-semibold hover:bg-[#162d4a] transition flex items-center justify-center gap-2 text-sm">
                    Join as Film Industry Professional
                    <ArrowRight size={16} />
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-4">
                    Free to browse
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-[#8ea1b7] text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-semibold hover:text-slate-200">
              Log in
            </Link>
          </p>
          <p className="mt-3">
            <Link to="/" className="text-[#5f6f83] hover:text-[#8ea1b7] flex items-center justify-center gap-1 text-sm transition-colors">
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleSelection;
