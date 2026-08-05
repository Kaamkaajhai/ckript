import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FileText, ChevronRight } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { COMPANY } from "../constants/company";

const LAST_UPDATED = "March 24, 2026";
const EFFECTIVE_DATE = "March 24, 2026";

const sections = [
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
    points: [`Email: ${COMPANY.email}`],
  },
];

export default function InvestorTermsConditions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo className="h-9 w-auto" />
          <Link to="/investor-onboarding" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Investor Onboarding
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
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Investor Registration Terms and Conditions</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <span>
              <span className="text-gray-500">Effective:</span> <span className="text-gray-300">{EFFECTIVE_DATE}</span>
            </span>
            <span>
              <span className="text-gray-500">Last updated:</span> <span className="text-gray-300">{LAST_UPDATED}</span>
            </span>
          </div>
        </motion.div>

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
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3">{section.title}</h2>

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
      </main>
    </div>
  );
}
