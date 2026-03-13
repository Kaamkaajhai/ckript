import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, FileText, ChevronRight } from "lucide-react";

const LAST_UPDATED = "March 12, 2026";
const EFFECTIVE_DATE = "March 12, 2026";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    text: "These Terms of Service govern your access to and use of the Ckript website, applications, tools, content, paid services, AI-enabled features, marketplace functionality, and any related products or services we make available. By accessing or using the platform, you represent that you are legally capable of entering into a binding agreement, are at least 18 years old, and agree to be bound by these Terms and all incorporated policies. If you do not agree, you must not access or use the platform.",
  },
  {
    id: "eligibility",
    title: "2. Eligibility and Business Use",
    text: "The platform is intended for professional or aspiring professional use in the creative and entertainment industries. You may use the platform only if doing so is lawful in your jurisdiction and consistent with these Terms. If you access the platform on behalf of a company, studio, production house, agency, or other legal entity, you represent that you have authority to bind that entity to these Terms.",
  },
  {
    id: "account",
    title: "3. Account Registration and Security",
    bullets: [
      "You must provide accurate, current, and complete information during registration",
      "You are responsible for maintaining the confidentiality of your account credentials",
      "You must notify us immediately at info.ckript@gmail.com if you suspect unauthorized access to your account",
      "You may not create accounts on behalf of others without their explicit consent",
      "One person may not maintain more than one active account without prior written permission from Ckript",
      "We may suspend, restrict, or terminate accounts that violate these Terms or create risk for the platform or other users",
    ],
  },
  {
    id: "platform-use",
    title: "4. Platform Use and Acceptable Conduct",
    content: [
      {
        subtitle: "Permitted Use",
        text: "Subject to these Terms, you may use the platform to create an account, publish or review eligible creative materials, communicate with other users, evaluate opportunities, purchase services, and access tools intended to support discovery, collaboration, and business activity in the entertainment industry.",
      },
      {
        subtitle: "Prohibited Conduct",
        text: "You must not: upload content you do not own or control; infringe intellectual property or privacy rights; misrepresent your identity, authority, or affiliations; scrape or harvest data without permission; reverse engineer or probe the platform; bypass access, payment, or security controls; transmit malware or harmful code; engage in harassment, deception, spam, or unlawful activity; or use the platform in a way that could damage, disable, overburden, or impair the service or other users.",
      },
      {
        subtitle: "Content Standards",
        text: "You are solely responsible for content you upload, share, submit, license, or otherwise make available through the platform. Content must be lawful, accurate in all material respects, and must not be defamatory, fraudulent, obscene, threatening, exploitative, or otherwise objectionable. We may remove or restrict content at our discretion where we believe it violates these Terms, applicable law, or the safety and integrity of the platform.",
      },
    ],
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual Property and Content Rights",
    content: [
      {
        subtitle: "Your Content",
        text: "You retain ownership of the scripts, treatments, loglines, synopses, trailers, images, and other materials you submit, subject to any rights you grant through transactions or separate agreements. By uploading or submitting content, you grant Ckript a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, distribute, format, and otherwise use that content as reasonably necessary to operate, improve, secure, market, and provide the platform and related services. This license continues only for so long as reasonably necessary for those purposes, subject to applicable retention obligations and active transactions.",
      },
      {
        subtitle: "Ckript Platform",
        text: "The platform, including its software, code, design, branding, interfaces, workflows, databases, AI configuration, logos, trademarks, and non-user content, is owned by or licensed to Ckript and is protected by intellectual property and other applicable laws. Except for the limited rights expressly granted in these Terms, no rights are transferred to you.",
      },
      {
        subtitle: "Infringement Notices",
        text: "If you believe content on the platform infringes your copyright or other intellectual property rights, send a notice to info.ckript@gmail.com with sufficient detail for us to identify the work, the allegedly infringing material, the basis of your claim, and your contact details. We may investigate and act as we consider appropriate.",
      },
    ],
  },
  {
    id: "transactions",
    title: "6. Marketplace Transactions and Independent Dealings",
    text: "Ckript may provide tools that help users discover scripts, request access, negotiate opportunities, place option holds, purchase credits, unlock content, or otherwise interact for commercial purposes. Unless expressly stated otherwise in a separate written agreement, Ckript is not a party to negotiations, option arrangements, licensing agreements, production agreements, employment relationships, or other contracts formed between users. Users are solely responsible for conducting due diligence, obtaining legal advice, and documenting their own transactions.",
  },
  {
    id: "payments",
    title: "7. Pricing, Payments, Credits, and Taxes",
    content: [
      {
        subtitle: "Fees and Billing",
        text: "Certain features of the platform may require payment, including subscriptions, credits, unlocks, evaluations, promotional services, AI-assisted services, or other paid offerings. Unless otherwise stated, fees are quoted in the currency displayed at checkout and are due in advance. Recurring plans renew automatically until canceled in accordance with the applicable billing terms.",
      },
      {
        subtitle: "Credits, Unlocks, and Platform Economics",
        text: "Credits, unlocks, access fees, creator allocations, payout mechanics, commissions, and service charges may be governed by pricing pages, onboarding materials, transaction flows, or separate product terms published on the platform. We may revise pricing, features, and allocation structures prospectively, subject to applicable law.",
      },
      {
        subtitle: "Refund Policy",
        text: "Except where required by law or expressly stated otherwise, fees are non-refundable once billed or once processing of the purchased service has begun. If you believe you were charged in error, contact info.ckript@gmail.com promptly with supporting details. Any goodwill refund, credit, or reversal will be at our discretion unless otherwise required by law.",
      },
      {
        subtitle: "Payment Processing",
        text: "Payments may be processed by third-party payment providers such as Razorpay. By providing a payment method, you authorize the applicable provider and Ckript, as relevant, to charge the applicable fees, taxes, adjustments, and any authorized recurring amounts. You are responsible for applicable taxes, duties, levies, and similar governmental charges unless expressly stated otherwise.",
      },
    ],
  },
  {
    id: "option-hold",
    title: "8. Option Holds and Exclusivity Tools",
    text: "If the platform offers option hold, reservation, exclusivity, or similar workflow tools, those tools are intended to support user-managed commercial activity. The commercial terms, duration, exclusivity obligations, compensation, due diligence, and enforceability of any deal remain the responsibility of the participating users unless Ckript expressly agrees otherwise in writing. Ckript does not guarantee that any listing, hold, or transaction will result in a completed deal or enforceable contract.",
  },
  {
    id: "ai-features",
    title: "9. AI-Powered Features",
    text: "The platform may provide AI-generated analysis, recommendations, summaries, scores, edits, trailers, matching signals, search assistance, or other automated outputs. These outputs are probabilistic, may be incomplete or inaccurate, and are provided for informational and workflow assistance purposes only. You are responsible for reviewing all AI-generated output before relying on, publishing, sharing, or acting on it. AI output does not constitute legal, financial, investment, employment, production, or other professional advice, and we make no guarantee of specific business or creative outcomes.",
  },
  {
    id: "privacy",
    title: "10. Privacy",
    text: "Our collection and use of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Platform, you consent to the data practices described in our Privacy Policy.",
  },
  {
    id: "third-party-services",
    title: "11. Third-Party Services",
    text: "The platform may rely on or integrate with third-party services, including payment processors such as Razorpay, hosting providers, analytics vendors, communication tools, social networks, and external websites. We do not control third-party services and are not responsible for their availability, functionality, security, or policies. Your use of third-party services is governed by the terms and policies of those third parties.",
  },
  {
    id: "termination",
    title: "12. Suspension and Termination",
    content: [
      {
        subtitle: "Termination by You",
        text: "You may stop using the platform at any time. If account deletion or subscription cancellation functionality is available, you may use those tools subject to any active obligations, pending transactions, billing commitments, or legal retention requirements. Cancellation of a recurring plan prevents future renewal charges but does not automatically entitle you to a refund for the current billing period unless required by law.",
      },
      {
        subtitle: "Termination by Ckript",
        text: "We may suspend, restrict, disable, remove content from, or terminate your access to the platform if we believe you have violated these Terms, created legal exposure, failed to pay applicable fees, infringed rights, harmed other users, interfered with operations, or created security, fraud, reputational, or compliance risk. We may act with or without prior notice where the situation reasonably requires it.",
      },
    ],
  },
  {
    id: "disclaimers",
    title: "13. Disclaimers and Limitation of Liability",
    content: [
      {
        subtitle: "Platform Availability",
        text: "The platform is provided on an \"as is\" and \"as available\" basis. To the fullest extent permitted by law, we disclaim all warranties, whether express, implied, statutory, or otherwise, including implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, and any warranties arising from course of dealing or usage of trade. We do not warrant uninterrupted availability, security, error-free operation, or that defects will always be corrected.",
      },
      {
        subtitle: "No Guarantee of Deals or Success",
        text: "Ckript facilitates visibility, workflow, and industry interaction, but does not guarantee exposure, responses, script options, sales, funding, production, employment, investments, meetings, collaborations, or any other result. Outcomes depend on factors beyond our control, including user conduct, market conditions, and third-party decisions.",
      },
      {
        subtitle: "Limitation of Liability",
        text: "To the fullest extent permitted by law, Ckript and its affiliates, officers, directors, employees, contractors, licensors, and agents will not be liable for any indirect, incidental, consequential, special, exemplary, punitive, or loss-of-profit damages, or for any loss of data, goodwill, opportunity, business, or revenue arising out of or related to the platform, user conduct, transactions between users, or these Terms, even if advised of the possibility of such damages. To the fullest extent permitted by law, our total aggregate liability for all claims arising out of or relating to the platform or these Terms will not exceed the greater of the amount you paid to Ckript in the 12 months before the event giving rise to the claim or USD 100.",
      },
    ],
  },
  {
    id: "indemnification",
    title: "14. Indemnification",
    text: "You agree to defend, indemnify, and hold harmless Ckript and its affiliates, officers, directors, employees, contractors, licensors, and agents from and against any claims, actions, liabilities, damages, judgments, losses, costs, and expenses, including reasonable legal fees, arising out of or related to your content, your use of the platform, your transactions or dealings with other users, your violation of these Terms, or your violation of any applicable law or third-party right.",
  },
  {
    id: "governing-law",
    title: "15. Governing Law and Dispute Resolution",
    text: "These Terms and any dispute arising out of or relating to the platform or these Terms will be governed by the laws applicable to the contracting Ckript entity and the jurisdiction specified in any mandatory legal notice or separate agreement, without regard to conflict of law rules. Before starting formal proceedings, the parties agree to attempt to resolve disputes through good-faith discussions. To the fullest extent permitted by law, any claim must be brought in an individual capacity and not as part of a class, collective, representative, or private attorney general action.",
  },
  {
    id: "general",
    title: "16. General Terms",
    bullets: [
      "We may modify, suspend, or discontinue any part of the platform at any time, with or without notice",
      "Our failure to enforce a provision of these Terms is not a waiver of that provision",
      "If any provision is found unenforceable, the remaining provisions will remain in effect to the fullest extent permitted by law",
      "You may not assign or transfer your rights or obligations under these Terms without our prior written consent",
      "We may assign these Terms as part of a merger, acquisition, reorganization, or sale of assets",
      "These Terms, together with incorporated policies and any additional written terms for specific services, form the entire agreement between you and Ckript regarding the platform",
    ],
  },
  {
    id: "changes",
    title: "17. Changes to These Terms",
    text: "We may revise these Terms from time to time to reflect changes to the platform, applicable law, business practices, or risk allocation. When changes are material, we may provide notice through the platform, by email, or by other reasonable means and will update the effective date at the top of this page. Your continued use of the platform after the updated Terms become effective constitutes your acceptance of the revised Terms to the extent permitted by law.",
  },
  {
    id: "contact",
    title: "18. Contact Us",
    contactBlock: true,
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Film className="w-7 h-7 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Ckript
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 transition"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
              Legal
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <span>
              <span className="text-gray-500">Effective:</span>{" "}
              <span className="text-gray-300">{EFFECTIVE_DATE}</span>
            </span>
            <span>
              <span className="text-gray-500">Last updated:</span>{" "}
              <span className="text-gray-300">{LAST_UPDATED}</span>
            </span>
          </div>
          <p className="mt-6 text-gray-400 text-base leading-relaxed border-l-2 border-blue-500/30 pl-4">
            These Terms of Service set out the legal rules that apply to your access to and use
            of the Ckript platform, including user accounts, paid features, marketplace tools,
            communications, and AI-enabled services. Please read them carefully before using the
            platform because they affect your legal rights and responsibilities.
          </p>
        </motion.div>

        {/* Quick Nav */}
        <motion.nav
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-12 p-5 rounded-xl bg-slate-900/60 border border-slate-700/50"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
            Contents
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-gray-400 hover:text-blue-400 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-blue-500/50" />
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section) => (
            <motion.section
              key={section.id}
              id={section.id}
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
            >
              <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-slate-700/50">
                {section.title}
              </h2>

              {section.text && (
                <p className="text-gray-400 text-sm leading-relaxed">{section.text}</p>
              )}

              {section.content?.map((block, bi) => (
                <div key={bi} className="mb-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-1.5">{block.subtitle}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{block.text}</p>
                </div>
              ))}

              {section.bullets && (
                <ul className="space-y-2">
                  {section.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {section.contactBlock && (
                <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-6 text-sm text-gray-400 space-y-2">
                  <p>
                    If you have any questions about these Terms or your legal rights, please
                    reach out:
                  </p>
                  <p>
                    <span className="text-gray-500">Email: </span>
                    <a href="mailto:info.ckript@gmail.com" className="text-blue-400 hover:underline">
                      info.ckript@gmail.com
                    </a>
                  </p>
                  <p>
                    <span className="text-gray-500">LinkedIn: </span>
                    <a
                      href="https://www.linkedin.com/company/ckript/?viewAsMember=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      linkedin.com/company/ckript
                    </a>
                  </p>
                </div>
              )}
            </motion.section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-4 text-sm text-gray-500">
          <span>&copy; 2026 Ckript. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-cyan-400 transition">
              Privacy Policy
            </Link>
            <Link to="/" className="hover:text-cyan-400 transition">
              Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
