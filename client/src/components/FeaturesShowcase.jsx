import { motion, AnimatePresence } from "framer-motion";
import { Play, TrendingUp, Lock, Star, Mic, PenTool, BookOpen, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: Play,
    tag: "AI · Video",
    title: "Text-to-Trailer AI",
    subtitle: "30-second visual pitch from your script",
    description: "Ckript turns your written script into a captivating 30-second visual trailer. By blending stock footage with AI-generated visuals, your concept reaches producers and investors quickly, clearly, and memorably.",
    benefits: ["Auto-generate trailers in seconds", "Hook decision-makers visually", "5x your discovery rate"],
  },
  {
    icon: Lock,
    tag: "Monetisation",
    title: "Locked Ideas, Paid Unlocks",
    subtitle: "Public summaries, protected scripts",
    description: "Your full script stays safely behind a paywall. Share a curated public summary to spark interest while producers pay to unlock the full work — your IP stays yours, always.",
    benefits: ["Full script IP protection", "Earn from every unlock", "Public teasers drive demand"],
  },
  {
    icon: Star,
    tag: "AI · Discovery",
    title: "Smart Matching Engine",
    subtitle: "Data-driven, targeted discovery",
    description: "Our recommendation engine analyzes producer activity and preferences to surface the right matches. Writers get found by producers actively looking for stories in their genre.",
    benefits: ["Auto-matched by genre & style", "Effortless connections", "Real-time producer alerts"],
  },
  {
    icon: Mic,
    tag: "AI · Analysis",
    title: "Script Validation & Scoring",
    subtitle: "AI-powered story analysis",
    description: "Every script gets analyzed for structure, originality, market potential, and narrative quality. You receive a detailed score breakdown — clear insight into what's working and what needs polish, before it reaches the industry.",
    benefits: ["Detailed AI score report", "Structure & originality analysis", "Market-fit recommendations"],
  },
  {
    icon: TrendingUp,
    tag: "Business",
    title: "Option Hold Exclusivity",
    subtitle: "30-day paid holding periods",
    description: "Producers can secure temporary exclusivity by paying to reserve a script for 30 days. Creators get protection and guaranteed compensation during the evaluation window — everyone wins.",
    benefits: ["Guaranteed income per hold", "Exclusive 30-day lock-in", "Faster producer decisions"],
  },
  {
    icon: PenTool,
    tag: "AI · Writing",
    title: "AI Writing Studio",
    subtitle: "An AI co-writer at your side",
    description: "Create, edit, and refine your scripts directly on the platform with an AI writing assistant. Get live guidance on dialogue, pacing, and structure — polish your screenplay before you ever submit.",
    benefits: ["Real-time AI co-writing", "Dialogue & pacing suggestions", "In-platform draft management"],
  },
  {
    icon: BookOpen,
    tag: "Review",
    title: "Expert Reader Reviews",
    subtitle: "Curated industry professionals",
    description: "Submissions are reviewed by hand-picked expert readers who provide industry-standard coverage reports. Get the same kind of feedback decision-makers use to evaluate scripts every day.",
    benefits: ["Industry-standard coverage", "Hand-picked reviewers", "Actionable professional feedback"],
  },
];

const FeaturesShowcase = () => {
  const [active, setActive] = useState(0);
  const f = features[active];
  const Icon = f.icon;
  const activeIsAi = f.tag.includes("AI");

  return (
    <section
      id="platform-innovations"
      className="luxury-section luxury-features-section relative pt-12 pb-24 sm:pt-16 sm:pb-32 px-4 sm:px-8 bg-[#100E0C] overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          className="max-w-3xl mb-14 sm:mb-20"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="luxury-section-kicker text-xs font-semibold uppercase tracking-wider text-[#9A9590] mb-5">
            What you get
          </p>
          <h2
            className="luxury-section-title text-4xl sm:text-5xl lg:text-6xl text-[#F5F0E8] leading-[1.05] tracking-tight font-medium"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Built for writers.<br />
            <em>Loved by producers.</em>
          </h2>
          <p className="luxury-body-copy text-base sm:text-lg text-[#9A9590] mt-5 max-w-xl leading-relaxed">
            Seven tools that turn your script from a file on your laptop into a film
            people actually want to make.
          </p>
        </motion.div>

        {/* Layout */}
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">

          {/* Sidebar tabs */}
          <motion.div
            className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {features.map((feat, i) => {
              const TabIcon = feat.icon;
              const isActive = active === i;
              const isAi = feat.tag.includes("AI");
              return (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  data-active={isActive}
                  data-tone={isAi ? "ai" : "premium"}
                  className={`luxury-feature-tab group flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-200 shrink-0 ${
                    isActive
                      ? "bg-white/[0.06] border-white/20 text-[#F5F0E8] shadow-[0_8px_24px_rgba(0,0,0,0.20)]"
                      : "bg-white/[0.02] border-[#2E2A26] text-[#F5F0E8] hover:border-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`luxury-feature-tab-icon w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? "bg-white/10 text-[#F5F0E8]"
                        : "bg-white/[0.04] text-[#9A9590] group-hover:bg-white/[0.06]"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap text-inherit">
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              data-tone={activeIsAi ? "ai" : "premium"}
              className="luxury-feature-panel rounded-3xl bg-[#1C1917] p-7 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-[#2E2A26]"
            >
              {/* Header row */}
              <div className="flex items-start gap-4 mb-7">
                <div className="luxury-feature-panel-icon w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/[0.08]">
                  <Icon className="w-5 h-5 text-[#F5F0E8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`luxury-badge ${activeIsAi ? "luxury-badge--ai" : "luxury-badge--premium"} font-body text-xs font-semibold uppercase tracking-wider text-[#9A9590] px-3 py-1`}>
                    {f.tag}
                  </span>
                  <h3
                    className="luxury-section-title text-2xl sm:text-3xl text-[#F5F0E8] leading-tight font-medium mt-3"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="luxury-body-copy font-body text-sm text-[#9A9590] mt-1.5 italic">{f.subtitle}</p>
                </div>
              </div>

              {/* Description */}
              <p className="luxury-body-copy font-body text-[#9A9590] text-[15px] sm:text-base leading-relaxed mb-8">
                {f.description}
              </p>

              {/* Benefits */}
              <div className="luxury-feature-panel-divider pt-6 border-t border-[#2E2A26]">
                <p className="luxury-section-kicker font-body text-xs font-semibold uppercase tracking-wider text-[#9A9590] mb-4">
                  What you get
                </p>
                <ul className="space-y-3">
                  {f.benefits.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="luxury-check-icon w-4 h-4 mt-0.5 shrink-0 text-[#9A9590]" />
                      <span className="luxury-body-copy font-body text-sm sm:text-base text-[#9A9590] leading-relaxed">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pagination */}
              <div className="luxury-feature-panel-divider mt-8 pt-6 border-t border-[#2E2A26] flex items-center justify-between gap-4">
                <span className="luxury-body-copy font-body text-xs font-medium text-[#9A9590]">
                  {String(active + 1).padStart(2, "0")} / {String(features.length).padStart(2, "0")}
                </span>
                <div className="flex gap-1.5">
                  {features.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      aria-label={`Go to feature ${i + 1}`}
                      className={`luxury-pagination-dot h-1.5 rounded-full transition-all duration-300 ${
                        i === active
                          ? "is-active w-6 bg-[#F5F0E8]"
                          : "w-1.5 bg-[#2E2A26] hover:bg-[#9A9590]"
                      }`}
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
