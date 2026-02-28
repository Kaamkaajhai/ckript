import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, ShieldCheck, ChevronRight } from "lucide-react";

const LAST_UPDATED = "February 24, 2026";
const EFFECTIVE_DATE = "February 24, 2026";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: [
      {
        subtitle: "Information You Provide Directly",
        text: "When you register, complete onboarding, or contact us, we collect information such as your name, email address, password (stored in encrypted form), professional background, portfolio content (scripts, loglines, cover art), and payment information (processed securely by Stripe — we never store raw card details).",
      },
      {
        subtitle: "Content You Upload",
        text: "Scripts, trailers, images, and other creative materials you submit to the platform are stored securely. You retain full ownership of all content you upload (see Section 7).",
      },
      {
        subtitle: "Usage Data",
        text: "We automatically collect certain technical data when you use Ckript, including your IP address, browser type and version, pages visited, time spent on pages, referring URLs, and device identifiers. This helps us improve platform performance and user experience.",
      },
      {
        subtitle: "Communications",
        text: "If you contact us via email or our contact form, we retain those communications to respond to your enquiry and improve our support processes.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "2. How We Use Your Information",
    bullets: [
      "To create and manage your account and deliver platform services",
      "To match writers, creators, and industry professionals using our AI-powered matching engine",
      "To process subscription payments and unlock transactions through Stripe",
      "To send you transactional emails (account verification, payment receipts, important notices)",
      "To send optional platform updates and newsletters — you may unsubscribe at any time",
      "To moderate content and enforce our community guidelines",
      "To analyse platform usage and improve features",
      "To comply with applicable legal obligations",
    ],
  },
  {
    id: "sharing",
    title: "3. Sharing of Information",
    content: [
      {
        subtitle: "With Other Users",
        text: "Your public profile, portfolio content, and scripts marked as visible are accessible to verified industry professionals on the platform. You control visibility settings for each piece of content from your dashboard.",
      },
      {
        subtitle: "With Service Providers",
        text: "We share limited data with trusted third-party providers who help us operate the platform — including Stripe (payments), cloud hosting providers, and email delivery services. These providers are bound by data processing agreements and may not use your data for their own purposes.",
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose your information if required to do so by law, court order, or governmental authority, or if we reasonably believe disclosure is necessary to protect the rights, property, or safety of Ckript, our users, or others.",
      },
      {
        subtitle: "Business Transfers",
        text: "In the event of a merger, acquisition, or sale of all or substantially all of our assets, your information may be transferred. We will notify you of any such change in ownership or control.",
      },
    ],
  },
  {
    id: "cookies",
    title: "4. Cookies & Tracking Technologies",
    text: "We use cookies and similar tracking technologies to maintain your session, remember preferences, and gather analytics data. You can control cookies through your browser settings; however, disabling certain cookies may affect platform functionality. We use analytics tools to understand aggregate usage patterns — this data is anonymised and not linked to individual identities.",
  },
  {
    id: "data-retention",
    title: "5. Data Retention",
    text: "We retain your personal data for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain it for legal, regulatory, or legitimate business reasons (such as transaction records required for tax compliance). Uploaded content (scripts, trailers) will be removed upon account deletion unless another user holds an active option on that content.",
  },
  {
    id: "security",
    title: "6. Data Security",
    text: "We implement industry-standard security measures to protect your information, including TLS encryption for data in transit, bcrypt hashing for passwords, and access controls limiting who within Ckript can access personal data. While we take all reasonable precautions, no method of transmission over the internet or electronic storage is 100% secure. We encourage you to use a strong, unique password and enable any additional security features we offer.",
  },
  {
    id: "your-rights",
    title: "7. Your Rights & Choices",
    bullets: [
      "Access: You may request a copy of the personal data we hold about you",
      "Correction: You may update incorrect or incomplete information via your profile settings",
      "Deletion: You may request deletion of your account and associated personal data",
      "Portability: You may request an export of your data in a commonly used format",
      "Objection: You may object to certain types of processing, including direct marketing",
      "Withdrawal of Consent: Where processing is based on consent, you may withdraw consent at any time without affecting prior processing",
    ],
    footer: "To exercise any of these rights, contact us at info.ckript@gmail.com. We will respond within 30 days.",
  },
  {
    id: "content-ownership",
    title: "8. Content Ownership",
    text: "You retain full copyright and ownership of all scripts, loglines, trailers, and other creative materials you submit to Ckript. By uploading content, you grant Ckript a limited, non-exclusive, royalty-free licence to display, distribute, and promote your content within the platform and in marketing materials. This licence terminates when you remove your content or close your account.",
  },
  {
    id: "children",
    title: "9. Children's Privacy",
    text: "Ckript is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has provided us with personal information, we will take steps to delete such information promptly. If you believe a minor has registered on our platform, please contact us immediately.",
  },
  {
    id: "changes",
    title: "10. Changes to This Policy",
    text: "We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice on the platform at least 14 days before the changes take effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.",
  },
  {
    id: "contact",
    title: "11. Contact Us",
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
            Ckript ("we", "our", or "us") is committed to protecting your privacy. This policy
            explains how we collect, use, disclose, and safeguard your personal information when
            you use our platform at{" "}
            <a href="https://ckript.com" className="text-cyan-400 hover:underline">
              ckript.com
            </a>
            . Please read it carefully.
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
