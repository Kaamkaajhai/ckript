import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Zap, Users, TrendingUp, ChevronRight } from "lucide-react";
import FeaturesShowcase from "../components/FeaturesShowcase";
import SuccessStories from "../components/SuccessStories";
import PricingPlans from "../components/PricingPlans";

const Landing = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ScriptBridge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-6 py-2 text-sm font-semibold text-gray-300 hover:text-white transition">
              Sign In
            </Link>
            <Link to="/join" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 min-h-screen flex items-center">
        <motion.div
          className="max-w-5xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="text-center mb-6">
            <span className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold">
              🚀 The Future of Script Discovery
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 text-center"
          >
            Your Ideas Deserve <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">More Than Rejection</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={itemVariants} className="text-xl text-gray-300 text-center mb-10 max-w-3xl mx-auto leading-relaxed">
            ScriptBridge connects brilliant creators with producers, directors, and investors who are actively searching for your next big idea. Publish, visualize, and monetize your scripts like never before.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex gap-6 justify-center flex-wrap mb-16">
            <Link
              to="/join"
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/40 transition-all transform hover:scale-105 flex items-center gap-2"
            >
              Sign Up as Creator
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              to="/join"
              className="px-8 py-4 bg-slate-800 border-2 border-cyan-500/50 rounded-lg font-bold text-lg hover:bg-slate-700/50 transition-all"
            >
              For Industry Professionals
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-cyan-400">1000+</p>
              <p className="text-gray-400 text-sm">Ideas Uploaded</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-400">500+</p>
              <p className="text-gray-400 text-sm">Industry Members</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-400">$50K+</p>
              <p className="text-gray-400 text-sm">Earnings Generated</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Problem & Solution Section */}
      <section className="py-20 px-6 bg-slate-800/50">
        <motion.div
          className="max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            The <span className="text-red-400">Problem</span> We Solve
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-12 mb-16">
            {/* Problem for Creators */}
            <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 hover:border-red-400/50 transition-all">
              <div className="text-4xl mb-4">💔</div>
              <h3 className="text-2xl font-bold mb-4">For Creators</h3>
              <ul className="space-y-3 text-gray-300">
                <li>✗ Brilliant ideas stuck without capital or connections</li>
                <li>✗ No way to reach producers, directors, and investors</li>
                <li>✗ Endless rejection from traditional gatekeepers</li>
                <li>✗ Ideas remain dormant and undiscovered</li>
              </ul>
            </motion.div>

            {/* Problem for Industry */}
            <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 hover:border-red-400/50 transition-all">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-4">For Industry Professionals</h3>
              <ul className="space-y-3 text-gray-300">
                <li>✗ Producers hate reading—drowning in submissions</li>
                <li>✗ Hard to find fresh, genre-specific content</li>
                <li>✗ No way to preview talent before committing</li>
                <li>✗ Expensive and slow discovery process</li>
              </ul>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/50 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-3xl font-bold mb-4">The ScriptBridge Solution</h3>
            <p className="text-xl text-gray-200">
              A revolutionary platform that instantly connects creators with decision-makers. Scripts are visualized through AI trailers, matched algorithmically, and packaged with ready-to-cast talent. Everyone wins.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Showcase Component */}
      <FeaturesShowcase />

      {/* Success Stories Component */}
      <SuccessStories />

      {/* Pricing Plans Component */}
      <PricingPlans />

      {/* How it Works */}
      <section className="py-20 px-6 bg-slate-800/50">
        <motion.div
          className="max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            How It Works in 4 Simple Steps
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "Upload Your Script", desc: "Share your brilliant idea with an intriguing summary and let AI generate a visual preview" },
              { step: 2, title: "AI Creates Trailer", desc: "Our AI generates a captivating 30-second video trailer using stock footage and AI tech" },
              { step: 3, title: "Get Smart Matched", desc: "Algorithm connects you with interested producers and investors in your genre" },
              { step: 4, title: "Unlock & Earn", desc: "Producers pay to unlock full scripts, you earn 50% instantly" }
            ].map((item, index) => (
              <motion.div key={index} variants={itemVariants} className="text-center">
                <div className="mb-4 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto font-bold text-2xl ring-4 ring-cyan-500/20">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                {index < 3 && <div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 text-cyan-500/50">→</div>}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* For All User Types */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            For Everyone on the Creative Spectrum
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                role: "✍️ Writers & Creators",
                benefits: ["Publish with AI-generated trailers", "Earn 50% on unlock fees", "Get Pro Analysis reports", "Smart matching with producers"]
              },
              {
                role: "🎬 Producers & Directors",
                benefits: ["Browse visual trailers (not scripts)", "Auto-matched content", "Pre-auditioned talent attached", "30-day script options"]
              },
              {
                role: "💰 Investors",
                benefits: ["Curated Domain Packages", "Invest in pre-packaged deals", "Discover emerging talent", "Market trends & analytics"]
              }
            ].map((user, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 hover:border-cyan-500/50 transition-all group"
              >
                <h3 className="text-2xl font-bold mb-6 group-hover:text-cyan-400 transition">{user.role}</h3>
                <ul className="space-y-4">
                  {user.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-300">
                      <span className="text-cyan-400 font-bold">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-5xl font-bold mb-6">
            Your Next Big Break is Waiting
          </motion.h2>
          <motion.p variants={itemVariants} className="text-xl text-gray-300 mb-10">
            Join thousands of creators and industry professionals transforming the entertainment industry. Start today—it's free.
          </motion.p>
          <motion.div variants={itemVariants} className="flex gap-6 justify-center flex-wrap">
            <Link
              to="/join"
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/40 transition-all transform hover:scale-105"
            >
              Start as Creator
            </Link>
            <Link
              to="/join"
              className="px-10 py-4 bg-slate-800 border-2 border-cyan-500/50 rounded-lg font-bold text-lg hover:bg-slate-700/50 transition-all"
            >
              Join as Industry Pro
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-700/50 text-center text-gray-400">
        <div className="max-w-6xl mx-auto">
          <p className="mb-4 font-semibold">&copy; 2026 ScriptBridge. Connecting brilliant ideas with brilliant people.</p>
          <div className="flex gap-8 justify-center text-sm flex-wrap">
            <a href="#/" className="hover:text-cyan-400 transition">Privacy Policy</a>
            <a href="#/" className="hover:text-cyan-400 transition">Terms of Service</a>
            <a href="#/" className="hover:text-cyan-400 transition">Contact Us</a>
            <a href="#/" className="hover:text-cyan-400 transition">Blog</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
