import { motion, AnimatePresence } from "framer-motion";
import { Play, TrendingUp, Lock, Star, Mic, PenTool, BookOpen, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Play,
    tag: "AI · Video",
    title: "Text-to-Trailer AI",
    subtitle: "30-sec visual pitch from scripts",
    description: "Ckript uses AI to transform written scripts into a captivating 30-second visual trailer. By combining stock footage and AI-generated visuals, your concept is communicated quickly, clearly, and memorably to producers and investors.",
    benefits: ["Auto-generate trailers in seconds", "Hook decision-makers visually", "Increase discovery rate by 5x"],
  },
  {
    icon: Lock,
    tag: "Monetisation",
    title: "Locked Ideas + Paid Unlocks",
    subtitle: "Summaries public, full ideas protected",
    description: "Your complete script remains securely protected behind a paywall. Share a curated public summary to generate interest, while producers can purchase access to unlock the full work — ensuring your intellectual property remains safeguarded.",
    benefits: ["Full script IP protection", "Earn from every unlock", "Public teasers drive demand"],
  },
  {
    icon: Star,
    tag: "AI · Discovery",
    title: "AI Smart Matching Engine",
    subtitle: "data-driven + targeted discovery",
    description: "Our recommendation system analyzes producer activity and preferences to surface highly relevant matches. Writers are discovered by producers actively seeking content within their specific genres.",
    benefits: ["Auto-match by genre & style", "Effortless Connections", "Real-time producer notifications"],
  },
  {
    icon: Mic,
    tag: "AI · Analysis",
    title: "Script Validation & Scoring",
    subtitle: "AI-based story analysis",
    description: "Each script is analyzed by our AI for structure, originality, market potential, and narrative quality. Creators receive a detailed score breakdown, providing clear insight into the script's strengths and areas for improvement before it reaches industry professionals.",
    benefits: ["Detailed AI score report", "Structure & originality analysis", "Market-fit recommendations"],
  },
  {
    icon: TrendingUp,
    tag: "Business",
    title: "Option Hold Exclusivity",
    subtitle: "30-day paid holding periods",
    description: "Producers can secure temporary exclusivity by paying to reserve a script for 30 days while creators receive protection and guaranteed compensation during the evaluation period.",
    benefits: ["Guaranteed income per hold", "Exclusive 30-day lock-in", "Drives faster producer decisions"],
  },
  {
    icon: PenTool,
    tag: "AI · Writing",
    title: "AI Writing Studio",
    subtitle: "AI-assisted text editor",
    description: "Create, edit, and refine your scripts directly on the platform with an AI writing assistant. The system offers live guidance on dialogue, pacing, and structural flow, helping creators produce a polished screenplay before submission.",
    benefits: ["Real-time AI co-writing", "Dialogue & pacing suggestions", "In-platform draft management"],
  },
  {
    icon: BookOpen,
    tag: "Review",
    title: "Expert Reader Reviews",
    subtitle: "Platform-curated professionals",
    description: "Submissions are reviewed by curated expert readers who provide comprehensive coverage reports. Receive industry-standard feedback that reflects how decision-makers are likely to assess your work.",
    benefits: ["Industry-standard coverage", "Curated expert reviewers", "Actionable professional feedback"],
  },
];

const FeaturesShowcase = () => {
  const [active, setActive] = useState(0);
  const f = features[active];
  const Icon = f.icon;

  return (
    <section id="platform-innovations" className="py-28 px-6 bg-[#080e18]">
      <div className="max-w-6xl mx-auto">

        {/* Header — left aligned */}
        <motion.div
          className="max-w-2xl mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-3">Platform Innovations</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
            Revolutionary Features That Change Everything
          </h2>
        </motion.div>

        {/* Layout: sidebar tabs + detail panel */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-5">

          {/* Feature list — vertical on desktop, horizontal scroll on mobile */}
          <motion.div
            className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            {features.map((feat, i) => {
              const TabIcon = feat.icon;
              const isActive = active === i;
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors duration-150 shrink-0 ${
                    isActive
                      ? "bg-gray-400/8 border-gray-400/20 text-white"
                      : "border-transparent bg-transparent text-[#4a5a6e] hover:text-[#8896a7] hover:bg-[#0d1520]"
                  }`}
                >
                  <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-gray-400" : ""}`} />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {feat.title}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border border-[#1c2a3a] bg-[#0d1520] p-7 sm:p-9"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-11 h-11 rounded-lg bg-[#151f2e] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5a6e]">{f.tag}</span>
                  <h3 className="text-xl font-bold text-white leading-tight">{f.title}</h3>
                  <p className="text-sm text-[#8896a7] mt-0.5">{f.subtitle}</p>
                </div>
              </div>

              <p className="text-[#8896a7] text-[15px] leading-relaxed mb-7">
                {f.description}
              </p>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5a6e] mb-3">Key Benefits</p>
                <ul className="space-y-2.5">
                  {f.benefits.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-gray-400/60" />
                      <span className="text-sm text-[#8896a7] leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pagination dots */}
              <div className="mt-8 flex items-center gap-3">
                <span className="text-xs text-[#4a5a6e]">
                  {active + 1} / {features.length}
                </span>
                <div className="flex gap-1">
                  {features.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`h-1 rounded-full transition-all duration-200 ${i === active ? "w-5 bg-gray-400" : "w-1.5 bg-[#1c2a3a] hover:bg-[#2a3a4e]"}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};

export default FeaturesShowcase;
