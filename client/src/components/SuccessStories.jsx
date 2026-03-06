import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const SuccessStories = () => {
  const stories = [
    {
      type: "creator",
      name: "Sarah Chen",
      role: "Screenplay Writer",
      image: "SC",
      story: "My sci-fi script was rejected 47 times until I uploaded it to Ckript. The AI trailer got 2K views, and within two weeks, a producer optioned it for $5,000. Now I'm in talks with a production company.",
      metric: "From unknown to optioned in 2 weeks",
      tagline: "The AI trailer changed everything"
    },
    {
      type: "producer",
      name: "Marcus Williams",
      role: "Independent Producer",
      image: "MW",
      story: "Before Ckript, finding scripts meant reading thousands of submissions. Now I get 5-10 hand-picked scripts weekly matched to my production style. I optioned 3 scripts in the first month.",
      metric: "5-10 perfect matches per week",
      tagline: "Stop searching. Start finding."
    },
    {
      type: "investor",
      name: "Dr. Priya Kapoor",
      role: "Film & Content Investor",
      image: "PK",
      story: "As an investor, I wanted access to pre-packaged opportunities. Ckript's Domain Packages gave me curated collections of scripts by genre and budget. I've already invested in 2 promising projects.",
      metric: "Invested in 2 projects in 3 months",
      tagline: "Opportunities don't come knocking anymore"
    },
    {
      type: "actor",
      name: "James Rodriguez",
      role: "Aspiring Actor",
      image: "JR",
      story: "Through Ckript's audition feature, I performed for 3 scripts in my genre. A producer loved my take and attached me to a project that's now in development. That's my big break.",
      metric: "From unknown to attached talent",
      tagline: "Auditions lead to careers"
    }
  ];

  return (
    <section className="py-28 px-6 bg-[#0a1221]">
      <div className="max-w-6xl mx-auto">
        {/* Header — left-aligned */}
        <motion.div
          className="max-w-2xl mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-3">Testimonials</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
            Stories of Real Success
          </h2>
          <p className="text-[#8896a7] text-base">
            See how creators, producers, and industry professionals are transforming their careers on Ckript
          </p>
        </motion.div>

        {/* Testimonial grid — 2x2 with varied card feel */}
        <div className="grid md:grid-cols-2 gap-5">
          {stories.map((story, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="bg-[#0d1520] border border-[#1c2a3a] rounded-xl p-7 hover:border-[#2a3a4e] transition-colors"
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#151f2e] flex items-center justify-center text-xs font-bold text-[#8896a7]">
                    {story.image}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white">{story.name}</h3>
                    <p className="text-xs text-[#4a5a6e]">{story.role}</p>
                  </div>
                </div>
                <Quote className="w-4 h-4 text-[#1c2a3a]" />
              </div>

              {/* Quote */}
              <p className="text-sm text-[#8896a7] leading-relaxed mb-5">
                "{story.story}"
              </p>

              {/* Metric */}
              <div className="bg-[#0a1221] border border-[#1c2a3a] rounded-lg px-4 py-3 mb-4">
                <p className="text-gray-400 font-semibold text-sm">{story.metric}</p>
              </div>

              {/* Rating + tagline */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-gray-400 text-gray-400" />
                  ))}
                </div>
                <p className="text-[#4a5a6e] italic text-xs">"{story.tagline}"</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessStories;
