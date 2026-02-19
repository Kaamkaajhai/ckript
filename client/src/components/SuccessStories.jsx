import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const SuccessStories = () => {
  const stories = [
    {
      type: "creator",
      name: "Sarah Chen",
      role: "Screenplay Writer",
      image: "👩‍💻",
      story: "My sci-fi script was rejected 47 times until I uploaded it to ScriptBridge. The AI trailer got 2K views, and within two weeks, a producer optioned it for $5,000. Now I'm in talks with a production company.",
      metric: "From unknown to optioned in 2 weeks",
      tagline: "The AI trailer changed everything"
    },
    {
      type: "producer",
      name: "Marcus Williams",
      role: "Independent Producer",
      image: "🎬",
      story: "Before ScriptBridge, finding scripts meant reading thousands of submissions. Now I get 5-10 hand-picked scripts weekly matched to my production style. I optioned 3 scripts in the first month.",
      metric: "5-10 perfect matches per week",
      tagline: "Stop searching. Start finding."
    },
    {
      type: "investor",
      name: "Dr. Priya Kapoor",
      role: "Film & Content Investor",
      image: "💼",
      story: "As an investor, I wanted access to pre-packaged opportunities. ScriptBridge's Domain Packages gave me curated collections of scripts by genre and budget. I've already invested in 2 promising projects.",
      metric: "Invested in 2 projects in 3 months",
      tagline: "Opportunities don't come knocking anymore"
    },
    {
      type: "actor",
      name: "James Rodriguez",
      role: "Aspiring Actor",
      image: "🎭",
      story: "Through ScriptBridge's audition feature, I performed for 3 scripts in my genre. A producer loved my take and attached me to a project that's now in development. That's my big break.",
      metric: "From unknown to attached talent",
      tagline: "Auditions lead to careers"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="py-20 px-6 bg-slate-800/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold mb-4">
            Stories of <span className="text-cyan-400">Real Success</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            See how creators, producers, and industry professionals are transforming their careers on ScriptBridge
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stories.map((story, index) => (
            <motion.div key={index} variants={itemVariants} className="group">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{story.image}</div>
                    <div>
                      <h3 className="font-bold text-lg text-white">{story.name}</h3>
                      <p className="text-sm text-gray-400">{story.role}</p>
                    </div>
                  </div>
                  <Quote className="w-5 h-5 text-cyan-400/30" />
                </div>

                {/* Story */}
                <p className="text-gray-300 mb-6 leading-relaxed">
                  "{story.story}"
                </p>

                {/* Metric Box */}
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mb-6">
                  <p className="text-cyan-400 font-semibold text-sm">{story.metric}</p>
                </div>

                {/* Tagline */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-400 italic text-sm">"{story.tagline}"</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {[
            { number: "$500K+", label: "Total Earnings Generated" },
            { number: "1000+", label: "Scripts Uploaded" },
            { number: "500+", label: "Deals Matched" },
            { number: "95%", label: "Creator Satisfaction" }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                {stat.number}
              </p>
              <p className="text-gray-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessStories;
