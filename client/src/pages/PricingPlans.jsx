import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MarketingHeader from "../components/MarketingHeader";
import {
  Check,
  Film,
  ChevronDown,
  Sparkles,
  Star,
  Wand2,
  X,
} from "lucide-react";

const plans = [
  {
    name: "Free Plan",
    shortName: "Free",
    description: "A simple way to get started.",
    price: "₹0",
    ctaLabel: "Start Free",
    ctaPath: "/join",
    icon: Film,
    features: [
      "Upload 1 script",
      "Upload 5 scripts",
      "Collaborate on 3 writer’s scripts",
      "Collaborate with 10 writer’s scripts",
      "Script appears only in Search & Explore section",
    ],
  },
  {
    name: "Standard Plan",
    shortName: "Plus plan",
    description: "A balanced plan for growing creators.",
    price: "₹2,499",
    ctaLabel: "Choose Standard",
    ctaPath: "/join",
    icon: Wand2,
    features: [
      "Upload 5 scripts",
      "Collaborate with 10 writer’s scripts",
      "Scripts appear in Top Listings",
      "Generate AI trailers for 2 scripts (720p, 1 min max)",
      "AI-generated script evaluations",
      "Pitch up to 2 scripts through video",
      "Script Grammar Checker access",
    ],
  },
  {
    name: "Professional Plan",
    shortName: "Pro plan",
    description: "Built for teams who need more reach.",
    price: "₹11,999",
    ctaLabel: "Go Professional",
    ctaPath: "/join",
    icon: Star,
    isPopular: true,
    features: [
      "Upload 20 scripts",
      "Collaborate with 20 writer’s scripts",
      "Scripts appear in Top Listings",
      "Feature 5 scripts in Featured Section for 2 weeks",
      "Generate AI trailers for 8 scripts",
      "AI-generated evaluations for all uploaded scripts",
      "Professional reader evaluations for 8 scripts",
      "Pitch up to 8 scripts through video",
      "Grammar Checker access",
      "See profile/script viewers",
      "CKRIPT promotes top 5 scripts offline",
    ],
  },
  {
    name: "Enterprise Plan",
    shortName: "Enterprise",
    description: "Custom support for large-scale needs.",
    price: "₹29,999",
    ctaLabel: "Contact Sales",
    ctaPath: "/contact",
    icon: Sparkles,
    features: [
      "Unlimited script uploads",
      "Unlimited writer collaborations",
      "Top Listings access",
      "Feature 25 scripts",
      "Generate AI trailers for 20 scripts (1080p)",
      "AI-generated evaluations",
      "Professional reader evaluations for 20 scripts",
      "Pitch 25 scripts through video",
      "Grammar Checker access",
      "Viewer analytics",
      "Offline producer promotion",
      "Updates about major film/writing events",
    ],
  },
];

const FontInjection = () => null;

const freeMissingFeatures = [
  "Scripts appear in Top Listings",
  "Generate AI trailers for 2 scripts (720p, 1 min max)",
  "AI-generated script evaluations",
  "Professional reader evaluations for 8 scripts",
  "Feature 5 scripts in Featured Section for 2 weeks",
];

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  show: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, delay: index * 0.08 },
  }),
};

const FeatureList = ({ planName, features }) => {
  const isFree = planName === "Free Plan";

  return (
    <ul className="space-y-1.5 border-t border-white/8 pt-3">
      {isFree ? (
        <>
          {features.map((feature) => (
            <li key={`free-has-${feature}`} className="font-body flex items-start gap-2.5 text-[13px] leading-5 text-white/75">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-emerald-300">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span>{feature}</span>
            </li>
          ))}

          {freeMissingFeatures.map((feature) => (
            <li key={`free-miss-${feature}`} className="font-body flex items-start gap-2.5 text-[13px] leading-5 text-white/52">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-rose-300">
                <X className="h-3.5 w-3.5" />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </>
      ) : (
        features.map((feature) => (
          <li key={feature} className="font-body flex items-start gap-2.5 text-[13px] leading-5 text-white/75">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span>{feature}</span>
          </li>
        ))
      )}
    </ul>
  );
};

const PricingCard = ({ plan, index, highlighted }) => {
  const Icon = plan.icon;

  return (
    <motion.article
      custom={index}
      variants={cardMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={`hidden h-full flex-col justify-between overflow-hidden rounded-[28px] border border-t-0 p-4 transition-all duration-300 md:flex md:p-5 ${
        highlighted
          ? "border-sky-400/55 bg-[#202532] shadow-[0_30px_100px_rgba(8,15,35,0.65)] ring-1 ring-sky-400/30"
          : "border-white/8 bg-[#141824] shadow-[0_22px_70px_rgba(0,0,0,0.42)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/8" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${highlighted ? "border-white/15 bg-white/10" : "border-white/10 bg-white/5"}`}>
              <Icon className="h-5 w-5 text-white/90" />
            </span>
            <div>
              <h3 className="font-display text-[1.25rem] font-semibold tracking-tight text-white">{plan.shortName || plan.name}</h3>
              <p className="font-body mt-0.5 text-[13px] leading-5 text-white/38">{plan.description}</p>
            </div>
          </div>

        </div>

        <div className="mt-3">
          <p className="font-display text-5xl font-semibold leading-none text-white sm:text-6xl">
            {plan.price}
          </p>
          <p className="mt-2 max-w-xs text-[13px] leading-5 text-white/40">
            A clean, focused plan for teams that want the right balance of tools and scale.
          </p>
        </div>

        <div className="mt-3">
          <Link
            to={plan.ctaPath}
            className={`font-body inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
              highlighted
                ? "bg-white text-[#111827] shadow-[0_8px_30px_rgba(255,255,255,0.1)] hover:bg-slate-100"
                : "bg-[#454c5c] text-white/95 hover:bg-[#535b6d]"
            }`}
          >
            {plan.ctaLabel}
          </Link>
        </div>

        <FeatureList planName={plan.name} features={plan.features} />
      </div>
    </motion.article>
  );
};

const MobilePricingCard = ({ plan, index, highlighted, isOpen, onToggle }) => {
  const Icon = plan.icon;

  return (
    <motion.article
      custom={index}
      variants={cardMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={`overflow-hidden rounded-[26px] border border-t-0 transition-all duration-300 md:hidden ${
        highlighted
          ? "border-sky-400/55 bg-[#202532] shadow-[0_24px_80px_rgba(8,15,35,0.6)] ring-1 ring-sky-400/25"
          : "border-white/8 bg-[#141824] shadow-[0_18px_50px_rgba(0,0,0,0.38)]"
      }`}
    >
      <div className="relative z-10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${highlighted ? "border-white/15 bg-white/10" : "border-white/10 bg-white/5"}`}>
              <Icon className="h-4.5 w-4.5 text-white/90" />
            </span>
            <div>
              <h3 className="font-display text-[1.15rem] font-semibold tracking-tight text-white">{plan.shortName || plan.name}</h3>
              <p className="font-body mt-0.5 text-[12px] leading-5 text-white/38">{plan.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={`${plan.name}-mobile-details`}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
              isOpen ? "border-sky-400/40 bg-sky-500/15 text-white" : "border-white/10 bg-white/5 text-white/80"
            }`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`} />
          </button>
        </div>

        <button type="button" onClick={onToggle} className="mt-5 text-left">
          <p className="font-display text-4xl font-semibold leading-none text-white">
            {plan.price}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-white/40">
            Tap to see full plan details.
          </p>
        </button>

        {isOpen && (
          <motion.div
            id={`${plan.name}-mobile-details`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[12px] leading-5 text-white/40">
                A clean, focused plan for teams that want the right balance of tools and scale.
              </p>

              <div className="mt-4">
                <Link
                  to={plan.ctaPath}
                  className={`font-body inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    highlighted
                      ? "bg-white text-[#111827] shadow-[0_8px_30px_rgba(255,255,255,0.1)] hover:bg-slate-100"
                      : "bg-[#454c5c] text-white/95 hover:bg-[#535b6d]"
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              </div>

              <div className="mt-4 border-t border-white/8 pt-3">
                <FeatureList planName={plan.name} features={plan.features} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.article>
  );
};

const PricingPlans = () => {
  const [openMobilePlan, setOpenMobilePlan] = useState("Free Plan");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0b0d12] text-white">
      <MarketingHeader />
      <FontInjection />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(75,85,99,0.14),transparent_30%),radial-gradient(circle_at_50%_20%,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(15,23,42,0.55),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%)]" />

      <section className="relative z-10 px-4 pb-8 pt-24 sm:px-8 sm:pb-12 sm:pt-28">
        <div className="mx-auto max-w-7xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mx-auto max-w-3xl"
          >
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Choose the Right CKRIPT Plan
            </h1>
            <p className="font-body mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">
              Explore pricing built for writers, filmmakers, and creators using CKRIPT.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 px-4 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-4 md:hidden">
            {plans.map((plan, index) => (
              <MobilePricingCard
                key={plan.name}
                plan={plan}
                index={index}
                highlighted={index === 1}
                isOpen={openMobilePlan === plan.name}
                onToggle={() => setOpenMobilePlan((current) => (current === plan.name ? "" : plan.name))}
              />
            ))}
          </div>

          <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 xl:grid-cols-4 items-stretch">
            {plans.map((plan, index) => (
              <PricingCard key={plan.name} plan={plan} index={index} highlighted={index === 1} />
            ))}
          </div>
        </div>
      </section>


    </div>
  );
};

export default PricingPlans;