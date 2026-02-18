import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Users, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";

const RoleSelection = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#112240] to-[#1a365d] flex items-center justify-center px-4">
      <div className="max-w-5xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-white mb-4">
            <FileText size={36} strokeWidth={1.5} />
            Script Bridge
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Join Script Bridge
          </h1>
          <p className="text-xl text-white/70 font-medium">
            Choose your path to get started
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Writer Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <Link to="/writer-onboarding">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100 hover:border-[#1a365d] transition-all duration-300 h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0f2544] to-[#1a365d] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <FileText className="text-white" size={32} strokeWidth={1.5} />
                  </div>
                  
                  <h2 className="text-2xl font-extrabold text-[#0a1628] mb-3 tracking-tight">
                    I'm a Writer
                  </h2>
                  
                  <p className="text-gray-600 mb-6 text-sm">
                    Showcase your scripts to industry professionals
                  </p>
                  
                  <ul className="text-left space-y-2 mb-8 w-full">
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Upload and host scripts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Professional evaluations</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Connect with producers</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Track analytics</span>
                    </li>
                  </ul>
                  
                  <div className="w-full bg-[#0f2544] text-white py-3 rounded-lg font-semibold hover:bg-[#1a365d] transition flex items-center justify-center gap-2 text-sm">
                    Join as Writer
                    <ArrowRight size={16} />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    Starting at $30/month
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
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <Link to="/industry-onboarding">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100 hover:border-[#1a365d] transition-all duration-300 h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0f2544] to-[#1a365d] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <Users className="text-white" size={32} strokeWidth={1.5} />
                  </div>
                  
                  <h2 className="text-2xl font-extrabold text-[#0a1628] mb-3 tracking-tight">
                    Industry Pro
                  </h2>
                  
                  <p className="text-gray-600 mb-6 text-sm">
                    Discover scripts and connect with writers
                  </p>
                  
                  <ul className="text-left space-y-2 mb-8 w-full">
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Search by genre & theme</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Read full scripts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Connect with writers</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Option projects</span>
                    </li>
                  </ul>
                  
                  <div className="w-full bg-[#0f2544] text-white py-3 rounded-lg font-semibold hover:bg-[#1a365d] transition flex items-center justify-center gap-2 text-sm">
                    Join as Professional
                    <ArrowRight size={16} />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    Free to browse
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Reader Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <Link to="/signup?role=reader">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100 hover:border-[#1a365d] transition-all duration-300 h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0f2544] to-[#1a365d] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                    <BookOpen className="text-white" size={32} strokeWidth={1.5} />
                  </div>
                  
                  <h2 className="text-2xl font-extrabold text-[#0a1628] mb-3 tracking-tight">
                    I'm a Reader
                  </h2>
                  
                  <p className="text-gray-600 mb-6 text-sm">
                    Explore scripts, write reviews & discover stories
                  </p>
                  
                  <ul className="text-left space-y-2 mb-8 w-full">
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Browse & read scripts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Write reviews & feedback</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Save favorite scripts</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Discover featured stories</span>
                    </li>
                  </ul>
                  
                  <div className="w-full bg-[#0f2544] text-white py-3 rounded-lg font-semibold hover:bg-[#1a365d] transition flex items-center justify-center gap-2 text-sm">
                    Join as Reader
                    <ArrowRight size={16} />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    Free to read
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
          <p className="text-white/70 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-white font-semibold hover:underline">
              Log in
            </Link>
          </p>
          <p className="mt-3">
            <Link to="/" className="text-white/50 hover:text-white/70 flex items-center justify-center gap-1 text-sm">
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RoleSelection;
