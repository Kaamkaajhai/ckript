import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheck, ChevronRight } from "lucide-react";
import BrandLogo from "../components/BrandLogo";

const LAST_UPDATED = "March 12, 2026";
const EFFECTIVE_DATE = "March 12, 2026";

const sections = [
  {
    id: "scope",
    title: "1. Scope of This Privacy Policy",
    text: "This Privacy Policy explains how Ckript collects, uses, stores, shares, and protects personal information when you access or use our website, applications, products, and related services. It applies to visitors, registered users, writers, producers, investors, creative professionals, and any other person who interacts with the platform. By using the platform, you acknowledge that you have read this Privacy Policy and understand how your information is handled.",
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    content: [
      {
        subtitle: "Information You Provide",
        text: "We collect information you provide directly to us, including your name, email address, login credentials, profile details, portfolio information, social or professional links, scripts, loglines, images, trailers, messages, support requests, and any other content you submit through the platform.",
      },
      {
        subtitle: "Transaction and Payment Information",
        text: "If you purchase a subscription, credits, or other paid services, payment processing is handled by third-party payment providers such as Razorpay. We may receive billing-related details such as payment status, transaction identifiers, partial card metadata, plan type, invoices, and refund status, but we do not store full card numbers or CVV data on our servers.",
      },
      {
        subtitle: "Usage and Device Information",
        text: "We automatically collect technical and usage information such as IP address, browser type, operating system, device identifiers, approximate location inferred from IP address, access times, referring URLs, pages viewed, actions taken within the platform, crash data, and performance diagnostics.",
      },
      {
        subtitle: "Communications and Support Data",
        text: "When you contact us by email, contact form, chat, or other channels, we collect the information contained in those communications and any related follow-up records for support, compliance, and service improvement purposes.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    bullets: [
      "To create, verify, administer, and secure user accounts",
      "To provide marketplace, discovery, messaging, matching, and script-related services",
      "To process subscriptions, credits, purchases, payouts, invoices, and related records",
      "To operate AI-assisted tools, recommendations, rankings, summaries, and related product features",
      "To communicate with you about your account, transactions, service updates, and support requests",
      "To personalize content, improve usability, troubleshoot issues, and monitor platform performance",
      "To detect, prevent, investigate, and respond to fraud, abuse, unauthorized access, and other security incidents",
      "To enforce our Terms of Service, other platform policies, and contractual rights",
      "To comply with legal, regulatory, tax, accounting, and law enforcement obligations",
      "To send marketing or promotional communications where permitted by law and subject to your preferences",
    ],
  },
  {
    id: "legal-bases",
    title: "4. Legal Bases for Processing",
    text: "Where applicable law requires a legal basis for processing personal data, we generally rely on one or more of the following: performance of a contract with you, our legitimate interests in operating and improving the platform, compliance with legal obligations, protection of vital interests, and your consent where consent is required. If we rely on consent, you may withdraw it at any time, although prior processing remains lawful.",
  },
  {
    id: "sharing",
    title: "5. How We Share Information",
    content: [
      {
        subtitle: "With Other Users and Business Counterparties",
        text: "Profile information, scripts, project materials, and related metadata that you choose to publish or share may be visible to other users, potential buyers, collaborators, or industry professionals through the platform according to your settings, activity, and transaction choices.",
      },
      {
        subtitle: "With Service Providers",
        text: "We share information with vendors and service providers that perform services on our behalf, including hosting, infrastructure, analytics, payment processing providers such as Razorpay, customer support, email delivery, authentication, storage, and security services. These providers are permitted to process information only as necessary to provide services to us or as otherwise required by law.",
      },
      {
        subtitle: "For Legal, Safety, and Compliance Reasons",
        text: "We may disclose information where required by law, subpoena, court order, regulatory request, or governmental authority, or where we believe in good faith that disclosure is reasonably necessary to protect rights, safety, property, users, the public, or the integrity of the platform.",
      },
      {
        subtitle: "Business Transfers",
        text: "We may share or transfer information as part of an actual or proposed merger, acquisition, financing, asset sale, bankruptcy, reorganization, or similar corporate transaction, subject to customary confidentiality and legal protections.",
      },
    ],
  },
  {
    id: "cookies",
    title: "6. Cookies and Similar Technologies",
    text: "We use cookies, local storage, pixels, session tokens, and similar technologies to authenticate users, remember preferences, measure engagement, prevent fraud, and improve the platform. You may control certain cookies through your browser or device settings, but disabling essential technologies may affect functionality, security, or access to parts of the service.",
  },
  {
    id: "third-party-services",
    title: "7. Third-Party Services and Links",
    text: "The platform may integrate with or link to third-party services, websites, plug-ins, payment processors such as Razorpay, social platforms, analytics tools, and embedded content. We do not control those third parties and are not responsible for their privacy practices. Your interactions with third-party services are governed by their own terms and privacy notices.",
  },
  {
    id: "data-retention",
    title: "8. Data Retention",
    text: "We retain personal information for as long as reasonably necessary to provide the platform, maintain business and financial records, resolve disputes, enforce agreements, comply with legal obligations, and protect our legitimate interests. Retention periods may vary depending on the type of information, the nature of the relationship, the sensitivity of the data, legal requirements, and whether the information is needed for security or evidentiary purposes. When information is no longer required, we will delete it, anonymize it, or securely archive it where deletion is not immediately feasible.",
  },
  {
    id: "security",
    title: "9. Data Security",
    text: "We use reasonable technical, administrative, and organizational safeguards designed to protect personal information, including encryption in transit, password protection, access restrictions, monitoring, and security review processes. However, no storage system or method of transmission over the internet is completely secure, and we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your credentials and notifying us promptly of suspected unauthorized access.",
  },
  {
    id: "international-transfers",
    title: "10. International Data Transfers",
    text: "Your information may be processed or stored in countries other than the country in which you reside, including countries where data protection laws may differ. Where required by law, we take steps designed to provide appropriate safeguards for cross-border transfers, including contractual protections or other lawful transfer mechanisms.",
  },
  {
    id: "your-rights",
    title: "11. Your Rights and Choices",
    bullets: [
      "Access information we hold about you, subject to lawful limitations and verification requirements",
      "Request correction of inaccurate or incomplete personal information",
      "Request deletion of personal information where applicable law provides that right",
      "Request a portable copy of certain information in a commonly used format where required by law",
      "Object to or request restriction of certain processing activities, including some direct marketing uses",
      "Withdraw consent where processing is based on consent",
      "Manage some account details, communication preferences, and visibility settings directly through your profile or account controls",
    ],
    footer: "To exercise available privacy rights, contact us at info.ckript@gmail.com. We may need to verify your identity before responding, and we may decline requests where permitted by law.",
  },
  {
    id: "marketing",
    title: "12. Marketing Communications",
    text: "We may send newsletters, promotional messages, product updates, event announcements, and other marketing communications where permitted by law. You can opt out of non-essential marketing communications at any time by using the unsubscribe link in the message or by contacting us. Even if you opt out of marketing, we may still send service-related, transactional, or legal notices.",
  },
  {
    id: "children",
    title: "13. Children's Privacy",
    text: "The platform is intended for adults and is not directed to children. We do not knowingly collect personal information from anyone under the age of 18. If you believe that a minor has provided personal information to us in violation of this policy, contact us and we will take appropriate steps to investigate and, where appropriate, delete the information.",
  },
  {
    id: "changes",
    title: "14. Changes to This Privacy Policy",
    text: "We may update this Privacy Policy from time to time to reflect changes in our services, operations, legal obligations, or privacy practices. When we make material changes, we will revise the effective date and may provide notice through the platform, by email, or through other reasonable means. Your continued use of the platform after the updated policy becomes effective indicates your acceptance of the revised policy to the extent permitted by law.",
  },
  {
    id: "contact",
    title: "15. Contact Us",
    text: null,
    contactBlock: true,
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo className="h-9 w-auto" />
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
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              Legal
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
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
          <p className="mt-6 text-gray-400 text-base leading-relaxed border-l-2 border-cyan-500/30 pl-4">
            Ckript ("Ckript," "we," "our," or "us") is committed to handling personal
            information responsibly and transparently. This Privacy Policy describes what
            information we collect, why we collect it, how we use and disclose it, and the
            choices available to you when you use our platform at{" "}
            <a href="https://ckript.com" className="text-cyan-400 hover:underline">
              ckript.com
            </a>
            . It should be read together with our Terms of Service and any additional notices
            presented at the point of collection.
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
                  className="text-sm text-gray-400 hover:text-cyan-400 transition flex items-center gap-1.5"
                >
                  <ChevronRight className="w-3 h-3 text-cyan-500/50" />
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, i) => (
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

              {section.content?.map((block, bi) => (
                <div key={bi} className="mb-4">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-1.5">{block.subtitle}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{block.text}</p>
                </div>
              ))}

              {section.text && (
                <p className="text-gray-400 text-sm leading-relaxed">{section.text}</p>
              )}

              {section.bullets && (
                <ul className="space-y-2 mb-4">
                  {section.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500/60 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {section.footer && (
                <p className="mt-4 text-sm text-gray-400 italic">{section.footer}</p>
              )}

              {section.contactBlock && (
                <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-6 text-sm text-gray-400 space-y-2">
                  <p>
                    If you have any questions, concerns, or requests regarding this Privacy Policy
                    or how we handle your data, please contact us:
                  </p>
                  <p>
                    <span className="text-gray-500">Email: </span>
                    <a href="mailto:info.ckript@gmail.com" className="text-cyan-400 hover:underline">
                      info.ckript@gmail.com
                    </a>
                  </p>
                  <p>
                    <span className="text-gray-500">LinkedIn: </span>
                    <a
                      href="https://www.linkedin.com/company/ckript/?viewAsMember=true"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
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
            <Link to="/terms-of-service" className="hover:text-cyan-400 transition">
              Terms of Service
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
