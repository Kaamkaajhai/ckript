import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";

const NewProject = () => {
  const { isDarkMode: dark } = useDarkMode();
  const navigate = useNavigate();

  const cards = [
    {
      key: "create",
      title: "Create Project",
      subtitle: "Write from scratch",
      description: "Use our built-in rich text editor to draft, format, and perfect your script. Bold, italicize, add colors, headings, and more. Save drafts and continue anytime.",
      features: ["Rich text editor with formatting", "Auto-save every 30 seconds", "Continue editing drafts anytime", "Export to full submission"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
      gradient: "from-blue-500 to-cyan-500",
      iconBg: dark ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: "text-blue-500",
      path: "/create-project",
      cta: "Open Editor",
    },
    {
      key: "upload",
      title: "Upload Project",
      subtitle: "Submit your finished work",
      description: "Upload your completed script as a PDF. Set metadata, choose genres, add classifications, select services, and publish to the Ckript marketplace.",
      features: ["PDF upload with text extraction", "Full metadata & genre tagging", "Smart classification system", "Hosting & evaluation services"],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
      gradient: "from-violet-500 to-purple-500",
      iconBg: dark ? "bg-violet-500/10" : "bg-violet-50",
      iconColor: "text-violet-500",
      path: "/upload",
      cta: "Upload PDF",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-4 ${
          dark ? "bg-white/[0.06] text-gray-400" : "bg-gray-100 text-gray-500"
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </div>
        <h1 className={`text-3xl font-bold tracking-tight mb-2 ${dark ? "text-gray-100" : "text-gray-900"}`}>
          How would you like to start?
        </h1>
        <p className={`text-sm max-w-md mx-auto ${dark ? "text-gray-500" : "text-gray-400"}`}>
          Write directly in our editor or upload an existing PDF. Choose the path that fits your workflow.
        </p>
      </motion.div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {cards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * (i + 1) }}
            onClick={() => navigate(
              card.path,
              card.key === "create" ? { state: { startFresh: true } } : undefined
            )}
            className={`group relative rounded-2xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
              dark
                ? "bg-[#101e30] border-[#333] hover:border-[#444] hover:shadow-2xl hover:shadow-[#020609]/30"
                : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-2xl hover:shadow-gray-200/60"
            }`}
          >
            {/* Gradient accent line */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="p-7">
              {/* Icon + Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                  {card.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-gray-600" : "text-gray-300"}`}>
                  {card.subtitle}
                </span>
              </div>

              {/* Title */}
              <h2 className={`text-xl font-bold mb-2 ${dark ? "text-gray-100" : "text-gray-900"}`}>
                {card.title}
              </h2>

              {/* Description */}
              <p className={`text-sm leading-relaxed mb-6 ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {card.description}
              </p>

              {/* Features */}
              <div className="space-y-2.5 mb-7">
                {card.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      dark ? "bg-white/[0.04]" : "bg-gray-50"
                    }`}>
                      <svg className={`w-3 h-3 ${dark ? "text-green-400" : "text-green-500"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`text-xs font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className={`flex items-center justify-between pt-5 border-t ${dark ? "border-[#333]" : "border-gray-100"}`}>
                <span className={`text-sm font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                  {card.cta}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:translate-x-1 ${
                  dark ? "bg-white/[0.06] text-gray-400 group-hover:bg-white/[0.1]" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tip */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className={`mt-8 text-center text-xs ${dark ? "text-gray-600" : "text-gray-300"}`}
      >
        <span className="font-semibold">Tip:</span> You can start a draft in the editor and later upload a PDF version too.
      </motion.div>
    </div>
  );
};

export default NewProject;
