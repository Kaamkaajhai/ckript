import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheck, ChevronRight, Film } from "lucide-react";
import policyData from "../data/legalText.json";

const LAST_UPDATED = "July 22, 2026";
const EFFECTIVE_DATE = "July 22, 2026";

export default function RegistrationPrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white flex flex-col">
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Film className="w-7 h-7 text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Ckript
            </span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-cyan-400 transition">
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-widest">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <span>
              <span className="text-gray-500">Effective:</span> <span className="text-gray-300">{EFFECTIVE_DATE}</span>
            </span>
            <span>
              <span className="text-gray-500">Last updated:</span> <span className="text-gray-300">{LAST_UPDATED}</span>
            </span>
          </div>
          <p className="mt-6 text-gray-400 text-base leading-relaxed border-l-2 border-cyan-400/50 pl-4">
            Ckript ("Ckript," "we," "our," or "us") is committed to handling personal
            information responsibly and transparently. This Privacy Policy describes what
            information we collect, why we collect it, how we use and disclose it, and the
            choices available to you when you use our platform.
          </p>
        </motion.div>

        <div className="space-y-8">
          {policyData.map((section) => (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35 }}
              className="rounded-xl bg-slate-900/55 border border-slate-700/50 p-6 shadow-sm"
            >
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4">{section.title}</h2>

              <div className="space-y-2">
                {section.content?.map((block, index) => {
                  if (block.type === 'paragraph') {
                    return (
                      <p key={`${section.id}-p-${index}`} className="text-sm text-gray-300 leading-relaxed">
                        {block.text}
                      </p>
                    );
                  }
                  if (block.type === 'list') {
                    return (
                      <ul key={`${section.id}-l-${index}`} className="list-disc pl-5 space-y-0.5 text-sm text-gray-300 leading-relaxed">
                        {block.items.map((item, ii) => (
                          <li key={`${section.id}-li-${ii}`}>{item.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "").trim()}</li>
                        ))}
                      </ul>
                    );
                  }
                  return null;
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </main>
    </div>
  );
}
