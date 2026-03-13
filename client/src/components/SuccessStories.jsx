import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const SuccessStories = () => {
  const stories = [
    {
      type: "creator",
      name: "Sarah Chen",
      role: "Screenplay Writer, Los Angeles",
      image: "SC",
      story: "I'd been circling the industry for four years with a sci-fi spec that kept getting passed on. After uploading to Ckript, the AI-generated trailer framed it in a way I never could in a pitch deck. A producer reached out within ten days and we closed an option deal shortly after. It's now in active development.",
      metric: "Optioned within 2 weeks of upload",
      tagline: "The platform did what four years of networking couldn't"
    },
    {
      type: "producer",
      name: "Marcus Williams",
      role: "Independent Producer, New York",
      image: "MW",
      story: "My development slate was stalling because discovery was broken — I was buried in cold submissions that didn't fit what I was actually making. Ckript's matching surfaced writers whose voice and genre aligned with my body of work. I optioned three scripts in the first month alone and now have a pipeline I actually trust.",
      metric: "3 scripts optioned in the first month",
      tagline: "A development pipeline I can finally rely on"
    },
    {
      type: "investor",
      name: "Priya Kapoor",
      role: "Film & Media Investor, London",
      image: "PK",
      story: "I allocate a portion of my portfolio to early-stage content IP, but sourcing credible opportunities has always been the bottleneck. Ckript changed that — curated collections organised by genre, budget, and commercial potential mean I can evaluate projects with real context. I've committed to two projects already and I'm actively reviewing a third.",
      metric: "2 investment commitments in under 3 months",
      tagline: "Structured deal flow for a space that's never had it"
    },
    {
      type: "actor",
      name: "James Rodriguez",
      role: "Actor, Miami",
      image: "JR",
      story: "I wasn't looking for auditions in the traditional sense — I wanted to be attached to projects at the script stage, before casting even opened. Ckript lets you do exactly that. I submitted self-tapes for three projects that matched my type and one of them came back with an offer. That project is now in pre-production and I'm on it.",
      metric: "Attached to a production before casting opened",
      tagline: "The entry point I'd been waiting for"
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
