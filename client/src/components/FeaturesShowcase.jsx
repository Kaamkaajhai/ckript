import { motion } from "framer-motion";
import { Play, Zap, Users, TrendingUp } from "lucide-react";
import { useState } from "react";

const FeaturesShowcase = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: <Play className="w-12 h-12" />,
      title: "AI Video Pre-Visualization",
      subtitle: "Text-to-Trailer Generator",
      description: "Producers are visual people. They hate reading 10-page scripts. Our AI instantly transforms your script into a captivating 30-second video trailer using stock footage and AI-generated video.",
      benefits: ["Auto-generate trailers", "Hook decision-makers visually", "Increase discovery rate by 5x"],
      color: "from-blue-600 to-cyan-500"
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: "Smart Match Algorithm",
      subtitle: "Tinder for Scripts",
      description: "Stop searching. The algorithm tracks producer history and automatically sends notifications about matching scripts. Writers discover producers actively seeking their genre instantly.",
      benefits: ["Auto-match by genre", "Track producer history", "Real-time notifications"],
      color: "from-purple-600 to-pink-500"
    },
    {
      icon: <Users className="w-12 h-12" />,
      title: "Talent Attachment",
      subtitle: "Virtual Packaging",
      description: "A script alone is hard to sell. A script + actor + director is a 'package' worth millions. Tag your ideal actors, and aspiring talent auditions with 1-minute performances.",
      benefits: ["Pre-auditioned talent", "Virtual packaging", "Dream teams in seconds"],
      color: "from-green-600 to-emerald-500"
    },
    {
      icon: <TrendingUp className="w-12 h-12" />,
      title: "Revenue Diversification",
      subtitle: "Script Scoring & Options",
      description: "Earn through multiple channels: unlock fees, Pro Analysis Reports, and 30-day option holds. Every interaction creates revenue. Producers pay to hold scripts while deciding.",
      benefits: ["Unlock fees share", "Pro analysis income", "Option holding fees"],
      color: "from-orange-600 to-red-500"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl font-bold mb-4">
            Revolutionary Features That <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Change Everything</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Four game-changing innovations that transform how stories are discovered and monetized
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Feature List */}
          <motion.div
            className="md:col-span-1 space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.button
                key={index}
                variants={itemVariants}
                onClick={() => setActiveFeature(index)}
                className={`w-full text-left p-6 rounded-xl transition-all duration-300 border-2 ${
                  activeFeature === index
                    ? `border-cyan-500 bg-slate-800/80 ring-2 ring-cyan-500/50`
                    : "border-slate-700/50 bg-slate-900/50 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`text-${activeFeature === index ? "cyan" : "gray"}-400 flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.subtitle}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>

          {/* Feature Details */}
          <motion.div
            className="md:col-span-2"
            key={activeFeature}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={`bg-gradient-to-br ${features[activeFeature].color} rounded-2xl p-1`}>
              <div className="bg-slate-900 rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-cyan-400">{features[activeFeature].icon}</div>
                  <div>
                    <h3 className="text-3xl font-bold">{features[activeFeature].title}</h3>
                    <p className="text-blue-400 text-sm font-semibold">{features[activeFeature].subtitle}</p>
                  </div>
                </div>

                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  {features[activeFeature].description}
                </p>

                <div className="mb-8">
                  <h4 className="font-bold text-cyan-400 mb-4">Key Benefits:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {features[activeFeature].benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />
                        <span className="text-gray-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Stats */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <span className="text-cyan-400 font-bold">Impact:</span> Creators using this feature see
                    {activeFeature === 0 ? " 5x higher engagement rates" : activeFeature === 1 ? " 10x faster matches" : activeFeature === 2 ? " 3x higher deal success" : " 2x revenue increase"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesShowcase;
