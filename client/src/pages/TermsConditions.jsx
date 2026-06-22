import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, ChevronRight, PenTool, Users } from "lucide-react";
import BrandLogo from "../components/BrandLogo";

const LAST_UPDATED = "March 24, 2026";
const EFFECTIVE_DATE = "March 24, 2026";

const writerSections = [
  {
    title: "1. INTRODUCTION AND ACCEPTANCE",
    paragraphs: [
      'These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("Writer", "User", "you") and Ckript.com ("Platform", "Company", "we", "us", "our"), governing your access to and use of the Platform and its services ("Services").',
      "By accessing or registering on the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and agree to comply with all applicable laws and regulations.",
      "IF YOU DO NOT AGREE, YOU MUST NOT USE THE PLATFORM.",
    ],
  },
  {
    title: "2. DEFINITIONS",
    points: [
      '"Content" means any script, text, data, or material uploaded.',
      '"Rights" means any licensing or assignment rights related to Content.',
      '"Investor" means any user acquiring rights.',
      '"Credits" means prepaid units used for Platform services.',
      '"Transaction" means any rights-related agreement between users.',
      '"Service" means all features, including AI tools, hosting, and marketplace.',
    ],
  },
  {
    title: "3. ELIGIBILITY",
    points: [
      "You represent and warrant that you are at least 18 years old.",
      "You have full legal capacity to enter into binding agreements.",
      "You are not prohibited from using the Platform under any law.",
      "We reserve the right to refuse access at our sole discretion.",
    ],
  },
  {
    title: "4. PLATFORM ROLE (LIMITED LIABILITY POSITIONING)",
    points: [
      "4.1 The Platform operates solely as a technology provider, a discovery platform, and a facilitator of user-to-user transactions.",
      "4.2 The Platform does not own, control, or claim rights in any Content; does not verify ownership, originality, or legality; is not a party to Transactions between users; and does not act as an agent, broker, or legal representative.",
      "4.3 All Transactions are solely between users and the Platform has no responsibility for enforcement or outcomes.",
    ],
  },
  {
    title: "5. ACCOUNT REGISTRATION & SECURITY",
    points: [
      "You agree to provide accurate and complete information.",
      "You agree to maintain confidentiality of credentials.",
      "You are fully responsible for all activities under your account.",
      "You may not transfer or sell your account, or share credentials.",
      "We may suspend or terminate accounts at any time.",
    ],
  },
  {
    title: "6. SUBMITTED CONTENT (STRICT LIABILITY CLAUSE)",
    points: [
      "6.1 You are solely responsible for all Content submitted.",
      "6.2 You represent and warrant that you own or control all necessary rights, the Content does not infringe third-party rights, and the Content is lawful and not misleading.",
      "6.3 You agree not to upload plagiarized/copied, infringing, fraudulent, deceptive, obscene, offensive, or unlawful Content.",
      "6.4 The Platform does not endorse or verify Content and shall not be liable for any Content uploaded.",
    ],
  },
  {
    title: "7. NO CONFIDENTIALITY / IDEA SUBMISSION",
    points: [
      "The Platform does not guarantee confidentiality.",
      "Similar ideas may independently exist.",
      "Any Content or idea submitted shall be treated as non-confidential.",
      "The Platform shall not be liable for claims relating to idea similarity or alleged misuse.",
    ],
  },
  {
    title: "8. LICENSE TO PLATFORM",
    points: [
      "You grant the Platform a non-exclusive, worldwide, royalty-free, sublicensable license to display Content (in preview form), promote Content, and analyze Content using AI systems.",
    ],
  },
  {
    title: "9. AI PROCESSING & MODERATION",
    points: [
      "The Platform may use AI similarity detection, automated systems, and manual moderation.",
      "The Platform may flag or reject Content, request proof of ownership, and remove Content without notice.",
      "The Platform does not guarantee detection of all violations.",
    ],
  },
  {
    title: "10. CREDITS SYSTEM",
    points: [
      "Credits may be used for AI tools, evaluations, and premium features.",
      "Credits are non-refundable, have no cash value, and are non-transferable.",
      "The Platform is not liable for loss of Credits due to user error or technical failures.",
    ],
  },
  {
    title: "11. PAYMENTS & BILLING",
    points: [
      "Payments are processed via third-party providers (e.g., Razorpay).",
      "You authorize the Platform to charge your payment method and process transactions.",
      "You agree to pay all applicable fees and taxes.",
      "Failed payments may result in suspension.",
      "The Platform is not responsible for payment gateway failures, banking issues, or unauthorized transactions.",
    ],
  },
  {
    title: "12. RIGHTS & TRANSACTIONS (CORE CLAUSE)",
    points: [
      "The Platform enables rights-based transactions only.",
      "The Platform does not guarantee ownership and does not enforce agreements.",
      "Each Transaction shall define exclusivity, duration, territory, and transferability.",
    ],
  },
  {
    title: "13. EXCLUSIVITY",
    points: [
      "Where exclusive rights are granted, the Writer agrees not to transfer or license the same rights during the exclusivity period.",
      "The Platform is not responsible for enforcement.",
    ],
  },
  {
    title: "14. RESALE / SECONDARY TRANSFER",
    points: [
      "Rights may be resold only if permitted.",
      "The Platform does not monitor external transfers and shall not be liable for unauthorized resale.",
    ],
  },
  {
    title: "15. PROHIBITED ACTIVITIES",
    points: [
      "You shall not upload infringing Content, misrepresent ownership, circumvent platform controls, or engage in fraud.",
    ],
  },
  {
    title: "16. CONTENT MODERATION RIGHTS",
    points: [
      "We may remove Content, suspend accounts, and restrict access at our sole discretion.",
    ],
  },
  {
    title: "17. WARRANTY DISCLAIMER",
    points: [
      "THE PLATFORM IS PROVIDED \"AS IS\" AND \"AS AVAILABLE.\"",
      "To the maximum extent permitted by law, we disclaim all warranties, accuracy guarantees, and non-infringement.",
    ],
  },
  {
    title: "18. LIMITATION OF LIABILITY (FULLY EXPANDED)",
    points: [
      "To the maximum extent permitted under applicable law, the Platform shall not be liable for direct, indirect, incidental, consequential, or punitive damages.",
      "This includes loss of profits, data, or business; unauthorized use of Content; disputes between users; and service interruptions.",
      "Your sole remedy is to discontinue use.",
    ],
  },
  {
    title: "19. INDEMNITY",
    points: [
      "You agree to indemnify and hold harmless the Platform from claims arising from your Content, legal disputes, or breach of Terms.",
    ],
  },
  {
    title: "20. DISPUTE RESOLUTION",
    points: [
      "The Platform may suspend Content and provide records.",
      "The Platform shall not adjudicate disputes.",
      "Any disputes shall be resolved between users under Indian law.",
    ],
  },
  {
    title: "21. TERMINATION",
    points: [
      "We may terminate access for violations, legal risks, or operational reasons.",
    ],
  },
  {
    title: "22. FORCE MAJEURE",
    points: [
      "We are not liable for events beyond our control.",
    ],
  },
  {
    title: "23. GOVERNING LAW",
    points: [
      "These Terms are governed by the laws of India.",
      "Jurisdiction: Punjab, India.",
    ],
  },
  {
    title: "24. MODIFICATIONS",
    points: [
      "We may modify these Terms at any time. Continued use equals acceptance.",
    ],
  },
  {
    title: "25. CONTACT",
    points: ["Email: support@ckript.com"],
  },
  {
    title: "26. DATA VISIBILITY AND THIRD-PARTY SERVICES",
    points: [
      "By using the Platform, you acknowledge and agree that your profile details and professional information may be visible to registered Film Industry Professionals, Producers, and Investors to facilitate networking and opportunities.",
      "The Platform may integrate with or link to third-party services (such as Jitsi for video meetings). We assume no liability for the security, data handling, or privacy practices of any third-party service.",
      "You acknowledge that sharing confidential information via third-party platforms or due to user error is entirely at your own risk. The Platform shall bear no fault or liability for any data breaches, unauthorized access, or theft of information resulting from external services or user negligence."
    ],
  },
];

const investorSections = [
  {
    title: "1. INTRODUCTION AND ACCEPTANCE",
    paragraphs: [
      'These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("Investor", "User", "you") and Ckript.com ("Platform", "Company", "we", "us", "our").',
      "These Terms govern your access to and use of the Platform and its services.",
      "By registering or using the Platform, you acknowledge that you have read and understood these Terms and agree to be bound by them.",
      "IF YOU DO NOT AGREE, YOU MUST NOT USE THE PLATFORM.",
    ],
  },
  {
    title: "2. DEFINITIONS",
    points: [
      '"Content" means scripts or materials uploaded by Writers.',
      '"Rights" means licensing or assignment rights in Content.',
      '"Writer" means a user uploading Content.',
      '"Transaction" means any agreement between users.',
      '"Credits" means prepaid digital units.',
      '"Services" means all features of the Platform.',
    ],
  },
  {
    title: "3. ELIGIBILITY",
    points: [
      "You are at least 18 years old.",
      "You are legally capable of entering into contracts.",
      "You are authorized to make investments or commercial decisions.",
      "We reserve the right to deny access at our discretion.",
    ],
  },
  {
    title: "4. PLATFORM ROLE (CRITICAL)",
    points: [
      "4.1 The Platform acts solely as a technology intermediary and a discovery/transaction facilitator.",
      "4.2 The Platform does not own any Content, does not verify ownership or originality, is not a party to Transactions, and does not guarantee rights validity.",
      "4.3 All Transactions are entered into at your own risk and are solely between you and the Writer.",
    ],
  },
  {
    title: "5. ACCOUNT REGISTRATION & SECURITY",
    points: [
      "Provide accurate information.",
      "Maintain confidentiality of credentials.",
      "Be responsible for all activity under your account.",
      "Accounts cannot be transferred or shared.",
      "Accounts may be suspended or terminated at our discretion.",
    ],
  },
  {
    title: "6. NATURE OF SERVICES",
    points: [
      "6.1 The Platform provides script discovery, AI-based insights, and rights transaction facilitation.",
      "6.2 The Platform does not act as a broker or agent, provide legal or investment advice, or guarantee outcomes.",
    ],
  },
  {
    title: "7. UNDERSTANDING OF RIGHTS (VERY IMPORTANT)",
    points: [
      "7.1 You acknowledge you are purchasing rights, not ownership of Content, unless explicitly stated.",
      "7.1 Rights are limited to the scope defined in each Transaction.",
      "7.2 Rights may include exclusive or non-exclusive usage, time-bound rights, and territory-based rights.",
    ],
  },
  {
    title: "8. NO WARRANTY OF CONTENT",
    points: [
      "The Platform does not verify Content originality.",
      "Content may be similar to other works.",
      "The Platform does not guarantee uniqueness.",
    ],
  },
  {
    title: "9. DUE DILIGENCE",
    points: [
      "You are solely responsible for conducting independent due diligence before entering into any Transaction.",
      "This includes verifying ownership, legal rights, and commercial viability.",
    ],
  },
  {
    title: "10. TRANSACTIONS AND PAYMENTS",
    points: [
      "10.1 Transactions are conducted via third-party payment providers (e.g., Razorpay).",
      "10.2 You agree to pay all applicable fees, commissions, and taxes, and authorize payment processing.",
      "10.3 The Platform is not responsible for payment failures, banking errors, or unauthorized transactions.",
    ],
  },
  {
    title: "11. COMMISSION AND FEES",
    points: [
      "The Platform may charge transaction commissions and service fees.",
      "These fees are non-refundable unless otherwise specified.",
    ],
  },
  {
    title: "12. CREDITS SYSTEM",
    points: [
      "Credits may be used for AI tools and premium features.",
      "Credits are non-refundable, have no monetary value, and are non-transferable.",
    ],
  },
  {
    title: "13. RESALE AND TRANSFER OF RIGHTS",
    points: [
      "13.1 You may transfer or resell rights only if permitted under the original agreement and conducted through the Platform.",
      "13.2 The Platform does not monitor external transfers and is not liable for unauthorized resale.",
    ],
  },
  {
    title: "14. CONTENT ACCESS AND CONFIDENTIALITY",
    points: [
      "Full scripts may not be publicly accessible and may be shared in preview form.",
      "You agree not to copy, misuse, or distribute Content without authorization.",
    ],
  },
  {
    title: "15. PROHIBITED ACTIVITIES",
    points: [
      "You shall not engage in fraud or misrepresentation, misuse Content, circumvent Platform systems, or violate intellectual property rights.",
    ],
  },
  {
    title: "16. MODERATION RIGHTS",
    points: [
      "The Platform may restrict access, remove Content, and suspend accounts at its sole discretion.",
    ],
  },
  {
    title: "17. NO WARRANTY",
    points: [
      "THE PLATFORM IS PROVIDED \"AS IS\" AND \"AS AVAILABLE.\"",
      "To the maximum extent permitted by law, the Platform disclaims all warranties, including ownership guarantees, non-infringement, and accuracy.",
    ],
  },
  {
    title: "18. LIMITATION OF LIABILITY",
    points: [
      "To the maximum extent permitted under applicable law, the Platform shall not be liable for direct, indirect, incidental, consequential, or punitive damages.",
      "This includes loss of profits, investments, or opportunities; disputes between users; and unauthorized use or transfer of rights.",
      "Your sole remedy is to discontinue use.",
    ],
  },
  {
    title: "19. INDEMNITY",
    points: [
      "You agree to indemnify and hold harmless the Platform from claims arising from Transactions, misuse of Content, or breach of these Terms.",
    ],
  },
  {
    title: "20. DISPUTES",
    points: [
      "20.1 The Platform may provide transaction records and suspend Content.",
      "20.2 The Platform shall not adjudicate disputes.",
      "All disputes shall be resolved between users.",
    ],
  },
  {
    title: "21. TERMINATION",
    points: [
      "We may suspend or terminate access if you violate these Terms or engage in unlawful activity.",
    ],
  },
  {
    title: "22. FORCE MAJEURE",
    points: ["The Platform shall not be liable for events beyond its control."],
  },
  {
    title: "23. GOVERNING LAW",
    points: [
      "These Terms shall be governed by the laws of India.",
      "Jurisdiction: Punjab, India.",
    ],
  },
  {
    title: "24. MODIFICATIONS",
    points: ["We may update these Terms at any time. Continued use constitutes acceptance."],
  },
  {
    title: "25. CONTACT",
    points: ["Email: support@ckript.com"],
  },
  {
    title: "26. DATA VISIBILITY AND THIRD-PARTY SERVICES",
    points: [
      "The Platform facilitates connections between users, and certain professional details of Writers and Industry Professionals may be mutually visible to facilitate opportunities.",
      "The Platform may utilize or integrate with third-party communication tools (such as Jitsi). We assume no liability for the security, data handling, or privacy practices of these third-party tools.",
      "Any exchange of confidential data during meetings or via third-party services is at your own risk. The Platform shall not be held liable for any data leaks, unauthorized access, or loss of information resulting from user error or third-party vulnerabilities."
    ],
  },
];

const TABS = [
  { key: "writer", label: "Writer Terms", icon: PenTool },
  { key: "investor", label: "Investor / Producer Terms", icon: Users },
];

export default function TermsConditions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam === "investor" ? "investor" : "writer"
  );

  useEffect(() => {
    if (tabParam === "investor" || tabParam === "writer") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const sections = activeTab === "writer" ? writerSections : investorSections;
  const pageTitle =
    activeTab === "writer"
      ? "Writer Onboard Terms and Conditions"
      : "Investor / Producer Terms and Conditions";
  const backRoute =
    activeTab === "writer" ? "/writer-onboarding" : "/producer-director-onboarding";
  const backLabel =
    activeTab === "writer" ? "Back to Writer Onboarding" : "Back to Producer Onboarding";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo className="h-9 w-auto" />
          <Link to={backRoute} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
            {backLabel}
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
              Legal
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Terms and Conditions</h1>
          <p className="text-gray-400 text-sm mb-6">
            Select the terms applicable to your role on the platform.
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-gray-400 mb-8">
            <span>
              <span className="text-gray-500">Effective:</span> <span className="text-gray-300">{EFFECTIVE_DATE}</span>
            </span>
            <span>
              <span className="text-gray-500">Last updated:</span> <span className="text-gray-300">{LAST_UPDATED}</span>
            </span>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 p-1.5 rounded-xl bg-slate-800/70 border border-slate-700/50 w-fit">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === key
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                    : "text-gray-400 hover:text-gray-200 hover:bg-slate-700/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">{pageTitle}</h2>
            <div className="space-y-8">
              {sections.map((section) => (
                <motion.section
                  key={section.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35 }}
                  className="rounded-xl bg-slate-900/55 border border-slate-700/50 p-5"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-3">{section.title}</h3>

                  {section.paragraphs?.map((paragraph, index) => (
                    <p key={`${section.title}-p-${index}`} className="text-sm text-gray-300 leading-relaxed mb-2">
                      {paragraph}
                    </p>
                  ))}

                  {section.points?.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-300 leading-relaxed">
                      {section.points.map((point, index) => (
                        <li key={`${section.title}-pt-${index}`}>{point}</li>
                      ))}
                    </ul>
                  )}
                </motion.section>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
