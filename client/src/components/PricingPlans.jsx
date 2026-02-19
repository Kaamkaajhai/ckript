import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";

const PricingPlans = () => {
  const plans = [
    {
      name: "Creator Free Tier",
      price: "$0",
      description: "Start publishing your ideas",
      features: [
        "Upload unlimited scripts",
        "Auto-generated AI trailer",
        "Public profile visibility",
        "Basic analytics",
        "Get discovered by producers",
      ],
      notIncluded: ["Pro Analysis Report", "Priority matching", "Direct messaging"],
      cta: "Get Started Free",
      highlighted: false
    },
    {
      name: "Creator Pro",
      price: "$10",
      description: "Per script analysis",
      features: [
        "Everything in Free Tier",
        "AI Script Score & Analysis",
        "Detailed pacing feedback",
        "Grammar & structure report",
        "Genre optimization tips",
        "Competitive comparison",
      ],
      notIncluded: [],
      cta: "Unlock Pro Analysis",
      highlighted: true
    },
    {
      name: "Industry Standard",
      price: "$200+",
      description: "Per 30-day option",
      features: [
        "Hold scripts for 30 days",
        "Exclusive access to new scripts",
        "Priority notifications",
        "Audition access",
        "Direct creator contact",
        "Domain Package access",
      ],
      notIncluded: [],
      cta: "Start Optioning",
      highlighted: false
    }
  ];

  const revenueStreams = [
    {
      title: "Unlock Fees",
      description: "Producers pay to see full scripts",
      creator: "You earn 50%",
      example: "$500 unlock = $250 for you",
      icon: "🔓"
    },
    {
      title: "Pro Analysis",
      description: "Offer AI-powered script feedback",
      creator: "You earn 70%",
      example: "$10 analysis = $7 for you",
      icon: "📊"
    },
    {
      title: "Option Fees",
      description: "Producers hold scripts with fees",
      creator: "Platform takes 10%",
      example: "$300 option = $270 for you",
      icon: "⏳"
    },
    {
      title: "Domain Packages",
      description: "Bulk access to scripts by category",
      creator: "Revenue share included",
      example: "1000 buyers = Royalties",
      icon: "📦"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Pricing Section */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-center mb-4">
            Simple, Transparent <span className="text-cyan-400">Pricing</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Different plans for creators and professionals. Always with you earning the most.
          </p>

          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`relative rounded-2xl p-8 border transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border-cyan-500 ring-2 ring-cyan-500/50 transform md:scale-105"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4" /> MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "$0" && <span className="text-gray-400 text-sm">/usage</span>}
                  </div>
                </div>

                <button
                  className={`w-full py-3 rounded-lg font-bold mb-8 transition-all ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/40"
                      : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="mb-8 pb-8 border-b border-slate-700">
                  <h4 className="text-sm font-bold text-gray-300 mb-4">INCLUDES:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.notIncluded.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 mb-3">NOT INCLUDED:</h4>
                    <ul className="space-y-2">
                      {plan.notIncluded.map((feature, idx) => (
                        <li key={idx} className="text-xs text-gray-500">• {feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Revenue Streams */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold text-center mb-4">
            How You <span className="text-green-400">Earn</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Multiple revenue streams mean creators maximize earnings from every interaction
          </p>

          <motion.div
            className="grid md:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {revenueStreams.map((stream, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="text-4xl mb-4">{stream.icon}</div>
                <h3 className="font-bold text-lg mb-2">{stream.title}</h3>
                <p className="text-gray-400 text-sm mb-4">{stream.description}</p>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-xs text-cyan-300 font-semibold mb-1">{stream.creator}</p>
                  <p className="text-sm text-cyan-400 font-bold">{stream.example}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Example Earnings */}
          <motion.div
            className="mt-16 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-8"
            variants={itemVariants}
          >
            <h3 className="text-2xl font-bold text-green-400 mb-6">📈 Example Monthly Earnings (Creator)</h3>
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <p className="text-gray-400 text-sm mb-2">10 Script Unlocks</p>
                <p className="text-2xl font-bold text-green-400">$2,500</p>
                <p className="text-xs text-gray-500">@ 50% of $500 avg</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">5 Pro Analyses</p>
                <p className="text-2xl font-bold text-green-400">$350</p>
                <p className="text-xs text-gray-500">@ 70% of $10 each</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">3 Option Fees</p>
                <p className="text-2xl font-bold text-green-400">$810</p>
                <p className="text-xs text-gray-500">@ 90% of $300 avg</p>
              </div>
              <div className="md:col-span-1 bg-slate-800 rounded-lg p-4 flex flex-col justify-center border-2 border-green-500/50">
                <p className="text-gray-400 text-sm mb-2">Total Monthly</p>
                <p className="text-3xl font-bold text-green-400">$3,660+</p>
              </div>
            </div>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            className="text-center mt-12"
            variants={itemVariants}
          >
            <p className="text-gray-400 mb-6">And this is just from 10 unlocks, 5 analyses, and 3 options. Most successful creators do much more.</p>
            <a href="#/" className="inline-block px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-green-500/40 transition-all transform hover:scale-105">
              Start Earning Today
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPlans;
