import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

/* ── Constants ─────────────────────────────────────── */
const formats = [
  { value: "feature", label: "Feature Film" },
  { value: "tv_1hour", label: "TV 1hr" },
  { value: "tv_halfhour", label: "TV 1/2hr" },
  { value: "short", label: "Short Film" },
];
const genres = [
  "Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Sci-Fi", "Fantasy",
  "Mystery", "Adventure", "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political", "Legal", "Medical",
  "Supernatural", "Psychological", "Noir", "Family", "Teen", "Satire", "Dark Comedy",
];
const toneOptions = [
  "Dark", "Quirky", "Fast-Paced", "Slow-Burn", "Feel-Good", "Gritty", "Lighthearted",
  "Noir", "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense", "Edgy",
  "Heartwarming", "Cynical", "Hopeful", "Melancholic", "Surreal", "Cerebral",
];
const themeOptions = [
  "Revenge", "Coming of Age", "AI", "Survival", "Redemption", "Love Triangle",
  "Betrayal", "Family Drama", "Social Justice", "Identity Crisis", "Power Struggle",
  "Forbidden Love", "Loss & Grief", "Ambition", "Good vs Evil", "Man vs Nature",
  "Isolation", "Corruption", "Second Chance", "Underdog Story",
];
const settingOptions = [
  "New York", "Space", "High School", "Dystopia", "Isolated", "Los Angeles", "Urban",
  "Rural", "Suburban", "Historical", "Contemporary", "Post-Apocalyptic", "Small Town",
  "Big City", "Wilderness", "Ocean/Sea", "Desert", "Medieval", "Future",
];
const SERVICE_PRICES = { hosting: 0, evaluation: 10, aiTrailer: 15 };

/* ── Format-aware page ranges (industry standards) ── */
const FORMAT_PAGE_RANGES = {
  feature: { min: 70, max: 180, typical: "90–120", label: "Feature Film", wordsPerPage: 250 },
  tv_1hour: { min: 45, max: 75, typical: "50–65", label: "TV 1-Hour", wordsPerPage: 250 },
  tv_halfhour: { min: 22, max: 45, typical: "25–35", label: "TV Half-Hour", wordsPerPage: 250 },
  short: { min: 1, max: 40, typical: "5–25", label: "Short Film", wordsPerPage: 250 },
};
const LEGAL_AGREEMENT = `SUBMISSION RELEASE AGREEMENT\n\nBy submitting your script ("Work") to Ckript ("Platform"), you agree to the following terms:\n\n1. REPRESENTATIONS AND WARRANTIES\nYou represent and warrant that:\n- You are the sole owner of the Work or have full authority to submit it\n- The Work is original and does not infringe upon any third-party rights\n\n2. LICENSE GRANT\nYou grant Ckript a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your Work on the Platform.\n\n3. PAYMENT TERMS\n- Hosting fees are charged monthly and are non-refundable\n- One-time service fees are non-refundable once processing begins\n\n4. INTELLECTUAL PROPERTY\nYou retain all ownership rights to your Work.\n\n5. TERMINATION\nYou may remove your Work from the Platform at any time.\n\nBy clicking "I Agree" you acknowledge that you have read and agree to these terms.\n\nLast Updated: ${new Date().toLocaleDateString()}`;

const COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#fbbf24", "#34d399",
  "#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#94a3b8",
];

const STEPS = [
  { num: 1, label: "Write", icon: "✍️" },
  { num: 2, label: "Details", icon: "📋" },
  { num: 3, label: "Classify", icon: "🏷️" },
  { num: 4, label: "Publish", icon: "🚀" },
];

/* ── Toolbar Button ────────────────────────────────── */
const TBtn = ({ active, onClick, title, children, dark }) => (
  <button type="button" onClick={onClick} title={title}
    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 ${active
      ? "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/25"
      : dark ? "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
  >{children}</button>
);

/* ── Toolbar ───────────────────────────────────────── */
const EditorToolbar = ({ editor, dark }) => {
  const [showCP, setShowCP] = useState(false);
  if (!editor) return null;
  const D = () => <div className={`w-px h-6 mx-1 ${dark ? "bg-white/[0.08]" : "bg-gray-200"}`} />;
  return (
    <div className={`flex flex-wrap items-center gap-0.5 px-3 py-2 border-b ${dark ? "border-[#182840] bg-[#0d1520]" : "border-gray-200 bg-gray-50/80"}`}>
      <TBtn dark={dark} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1">H1</TBtn>
      <TBtn dark={dark} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2">H2</TBtn>
      <TBtn dark={dark} active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3">H3</TBtn>
      <D />
      <TBtn dark={dark} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" /></svg>
      </TBtn>
      <TBtn dark={dark} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" /></svg>
      </TBtn>
      <TBtn dark={dark} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" /></svg>
      </TBtn>
      <D />
      <TBtn dark={dark} active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Left">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" /></svg>
      </TBtn>
      <TBtn dark={dark} active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" /></svg>
      </TBtn>
      <D />
      <TBtn dark={dark} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullets">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" /></svg>
      </TBtn>
      <TBtn dark={dark} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbers">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" /></svg>
      </TBtn>
      <D />
      <TBtn dark={dark} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>
      </TBtn>
      <TBtn dark={dark} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="HR">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 11h18v2H3z" /></svg>
      </TBtn>
      <D />
      <div className="relative">
        <TBtn dark={dark} active={showCP} onClick={() => setShowCP(!showCP)} title="Color">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z" /></svg>
        </TBtn>
        {showCP && (
          <div className={`absolute top-full left-0 mt-2 p-2 rounded-xl border shadow-xl z-50 grid grid-cols-5 gap-1 ${dark ? "bg-[#101e30] border-[#1d3350]" : "bg-white border-gray-200"}`}>
            {COLORS.map(c => (
              <button key={c} onClick={() => { editor.chain().focus().setColor(c).run(); setShowCP(false); }}
                className="w-5 h-5 rounded-md border border-white/20 hover:scale-125 transition-transform" style={{ backgroundColor: c }} />
            ))}
            <button onClick={() => { editor.chain().focus().unsetColor().run(); setShowCP(false); }}
              className={`col-span-5 mt-1 text-[10px] py-1 rounded-md ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}>Reset</button>
          </div>
        )}
      </div>
      <D />
      <TBtn dark={dark} onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" /></svg>
      </TBtn>
      <TBtn dark={dark} onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" /></svg>
      </TBtn>
    </div>
  );
};

/* ── Draft Card ────────────────────────────────────── */
const DraftCard = ({ draft, onClick, onDelete, dark, isActive }) => {
  const wc = draft.textContent ? draft.textContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length : 0;
  const updated = new Date(draft.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${isActive
        ? dark ? "bg-[#1e3a5f]/20 border-[#1e3a5f]/60 ring-1 ring-[#1e3a5f]/30" : "bg-blue-50 border-blue-200 ring-1 ring-blue-100"
        : dark ? "bg-[#0d1520] border-[#182840] hover:border-[#1d3350]" : "bg-white border-gray-100 hover:border-gray-200"
        }`} onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className={`font-semibold text-sm truncate ${dark ? "text-gray-100" : "text-gray-900"}`}>{draft.title || "Untitled"}</h4>
          <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{wc} words · {updated}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(draft._id); }}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition ${dark ? "hover:bg-red-500/10 text-gray-600 hover:text-red-400" : "hover:bg-red-50 text-gray-300 hover:text-red-500"}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════
   CREATE PROJECT — 4-Step Wizard
   ═══════════════════════════════════════════════════════ */
const CreateProject = () => {
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { draftId } = useParams();
  const agreementRef = useRef(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [scriptId, setScriptId] = useState(draftId || null);
  const [drafts, setDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [showDrafts, setShowDrafts] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 2: Details
  const [formData, setFormData] = useState({ format: "feature", primaryGenre: "", logline: "", description: "" });

  // Auto-calculated page count from word count + format
  const formatInfo = FORMAT_PAGE_RANGES[formData.format] || FORMAT_PAGE_RANGES.feature;
  const estimatedPages = Math.max(1, Math.round(wordCount / formatInfo.wordsPerPage));
  const pageStatus = estimatedPages < formatInfo.min ? "short" : estimatedPages > formatInfo.max ? "long" : "good";
  const [tagsInput, setTagsInput] = useState("");

  // Step 3: Classification
  const [classification, setClassification] = useState({ tones: [], themes: [], settings: [] });

  // Step 4: Services & Legal
  const [services, setServices] = useState({ hosting: true, evaluation: false, aiTrailer: false });
  const [legal, setLegal] = useState({ agreedToTerms: false });
  const [creditsBalance, setCreditsBalance] = useState(0);

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      TextStyle, Color,
      Placeholder.configure({ placeholder: "Start writing your script...\n\nINT. LIVING ROOM - DAY\n\nA dimly lit room. The curtains sway gently..." }),
    ],
    editorProps: { attributes: { class: `prose max-w-none focus:outline-none min-h-[420px] px-8 py-6 ${dark ? "prose-invert" : ""}` } },
    onUpdate: ({ editor }) => {
      const t = editor.getText();
      setWordCount(t.split(/\s+/).filter(Boolean).length);
      setCharCount(t.length);
      setSaved(false);
    },
  });

  // Fetch credits
  useEffect(() => {
    if (user) api.get("/credits/balance").then(({ data }) => setCreditsBalance(data.balance || 0)).catch(() => { });
  }, [user]);

  // Load drafts
  const fetchDrafts = useCallback(async () => {
    try { setLoadingDrafts(true); const { data } = await api.get("/scripts/my-drafts"); setDrafts(Array.isArray(data) ? data : []); }
    catch { setDrafts([]); } finally { setLoadingDrafts(false); }
  }, []);
  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  // Load specific draft
  const loadDraft = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/scripts/${id}`);
      setTitle(data.title || ""); setScriptId(data._id);
      if (editor && data.textContent) editor.commands.setContent(data.textContent);
      if (data.format) setFormData(f => ({ ...f, format: data.format }));
      if (data.pageCount) setFormData(f => ({ ...f, pageCount: String(data.pageCount) }));
      if (data.classification?.primaryGenre || data.genre) setFormData(f => ({ ...f, primaryGenre: data.classification?.primaryGenre || data.genre || "" }));
      if (data.logline) setFormData(f => ({ ...f, logline: data.logline }));
      if (data.description) setFormData(f => ({ ...f, description: data.description }));
      if (data.tags?.length) setTagsInput(data.tags.join(", "));
      if (data.classification) setClassification({ tones: data.classification.tones || [], themes: data.classification.themes || [], settings: data.classification.settings || [] });
      setShowDrafts(false);
    } catch { }
  }, [editor]);
  useEffect(() => { if (draftId && editor) loadDraft(draftId); }, [draftId, editor, loadDraft]);

  // Auto-save every 30s
  useEffect(() => {
    if (!editor) return;
    const iv = setInterval(() => { if (!saved && editor.getHTML().length > 15) handleSave(true); }, 30000);
    return () => clearInterval(iv);
  }, [editor, saved]);

  // Save draft
  const handleSave = async (auto = false) => {
    if (!editor) return; setSaving(true);
    try {
      const body = { title: title || "Untitled Draft", textContent: editor.getHTML(), ...(scriptId ? { scriptId } : {}) };
      const { data } = await api.post("/scripts/draft", body);
      setScriptId(data._id); setSaved(true); setLastSaved(new Date());
      if (!auto) fetchDrafts();
    } catch (err) { console.error("Save failed:", err); } finally { setSaving(false); }
  };

  // Delete draft
  const handleDeleteDraft = async (id) => {
    try {
      await api.delete(`/scripts/${id}`); setDrafts(p => p.filter(d => d._id !== id));
      if (scriptId === id) { setScriptId(null); setTitle(""); editor?.commands.clearContent(); }
    } catch { }
  };

  // Form handlers
  const handleChange = e => { const { name, value } = e.target; setFormData(f => ({ ...f, [name]: value })); };
  const toggleChip = (cat, val) => {
    setClassification(prev => {
      const arr = prev[cat]; return { ...prev, [cat]: arr.includes(val) ? arr.filter(v => v !== val) : arr.length < 3 ? [...arr, val] : arr };
    });
  };
  const calculateTotal = () => (services.evaluation ? SERVICE_PRICES.evaluation : 0) + (services.aiTrailer ? SERVICE_PRICES.aiTrailer : 0);

  // Validation
  const validateStep = (s) => {
    setError("");
    if (s === 1) {
      if (!title.trim()) { setError("Title is required."); return false; }
      if (!editor || editor.getText().trim().length < 10) { setError("Please write at least a few lines of content."); return false; }
      return true;
    }
    if (s === 2) {
      if (!formData.format) { setError("Format is required."); return false; }
      if (!formData.primaryGenre) { setError("Primary genre is required."); return false; }
      if (!formData.logline || formData.logline.length > 300) { setError("Logline is required (max 300 chars)."); return false; }
      return true;
    }
    if (s === 3) return true;
    if (s === 4) {
      if (!legal.agreedToTerms) { setError("You must agree to the terms."); return false; }
      return true;
    }
    return true;
  };
  const handleNext = () => { if (validateStep(step) && step < 4) { setStep(step + 1); setError(""); } };
  const handleBack = () => { if (step > 1) { setStep(step - 1); setError(""); } };

  // Publish
  const handlePublish = async () => {
    if (!validateStep(4)) return;
    const creditsNeeded = calculateTotal();
    if (creditsNeeded > creditsBalance) { setError(`Insufficient credits. Need ${creditsNeeded} but have ${creditsBalance}.`); return; }
    setLoading(true); setError("");
    try {
      const tagsArr = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const payload = {
        title, logline: formData.logline, description: formData.description || formData.logline,
        synopsis: formData.description || formData.logline, format: formData.format,
        pageCount: estimatedPages, textContent: editor.getHTML(), tags: tagsArr,
        classification: { primaryGenre: formData.primaryGenre, secondaryGenre: null, tones: classification.tones, themes: classification.themes, settings: classification.settings },
        services: { hosting: services.hosting, evaluation: services.evaluation, aiTrailer: services.aiTrailer },
        legal: { agreedToTerms: legal.agreedToTerms, timestamp: new Date().toISOString() },
        ...(scriptId ? { scriptId } : {}),
      };
      await api.post("/scripts/upload", payload);
      if (scriptId) { try { await api.delete(`/scripts/${scriptId}`); } catch { } }
      navigate("/dashboard");
    } catch (err) { setError(err.response?.data?.message || "Failed to publish."); } finally { setLoading(false); }
  };

  // Styling helpers
  const cardCls = `rounded-2xl border backdrop-blur-sm ${dark ? "bg-[#0d1520]/80 border-[#182840]" : "bg-white/90 border-gray-200 shadow-sm"}`;
  const inputCls = `w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none ${dark
    ? "bg-white/[0.04] border border-[#1d3350] text-gray-100 placeholder:text-gray-600 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/30"
    : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"}`;
  const chipCls = (sel) => `px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${sel
    ? dark ? "bg-[#1e3a5f] text-white shadow-md shadow-[#1e3a5f]/20" : "bg-blue-500 text-white shadow-md shadow-blue-200"
    : dark ? "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08] border border-[#1d3350]" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* ── Header ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className={`p-2 rounded-xl transition ${dark ? "hover:bg-white/[0.06] text-gray-400" : "hover:bg-gray-100 text-gray-400"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${dark ? "text-gray-100" : "text-gray-900"}`}>Create Project</h1>
              <p className={`text-xs mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>Write, classify, and publish your script — all in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDrafts(!showDrafts)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${dark
                ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              Drafts {drafts.length > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${dark ? "bg-white/[0.08]" : "bg-gray-100"}`}>{drafts.length}</span>}
            </button>
            {/* Save indicator */}
            {saving && <span className={`flex items-center gap-1.5 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Saving...</span>}
            {saved && !saving && <span className="flex items-center gap-1 text-xs text-green-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Saved{lastSaved && ` ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </span>}
          </div>
        </div>

        {/* ── Gradient accent line ── */}
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[#1e3a5f]/40 to-transparent" />

        {/* ── Step Indicator ── */}
        <div className="mt-5 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button onClick={() => s.num < step && setStep(s.num)} disabled={s.num > step}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${step === s.num
                  ? dark ? "bg-[#1e3a5f]/20 border border-[#1e3a5f]/40 text-white shadow-lg shadow-[#1e3a5f]/10" : "bg-blue-50 border border-blue-200 text-blue-700 shadow-lg shadow-blue-100/40"
                  : step > s.num
                    ? dark ? "text-green-400 hover:bg-white/[0.04]" : "text-green-600 hover:bg-green-50"
                    : dark ? "text-gray-600" : "text-gray-300"
                  } ${s.num < step ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s.num
                  ? dark ? "bg-[#1e3a5f] text-white" : "bg-blue-500 text-white"
                  : step > s.num
                    ? dark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"
                    : dark ? "bg-white/[0.06] text-gray-600" : "bg-gray-100 text-gray-400"
                  }`}>
                  {step > s.num ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> : s.num}
                </span>
                <span className="text-xs font-semibold hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`w-8 h-px mx-1 ${step > s.num ? dark ? "bg-green-500/30" : "bg-green-200" : dark ? "bg-white/[0.06]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Drafts Drawer ── */}
      <AnimatePresence>
        {showDrafts && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className={`${cardCls} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>My Drafts</h3>
                <button onClick={() => { setScriptId(null); setTitle(""); editor?.commands.clearContent(); setShowDrafts(false); setStep(1); }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${dark ? "text-gray-400 hover:bg-white/[0.06]" : "text-gray-500 hover:bg-gray-100"}`}>+ New Draft</button>
              </div>
              {loadingDrafts ? <div className="flex gap-3">{[1, 2, 3].map(i => <div key={i} className={`h-16 flex-1 rounded-xl animate-pulse ${dark ? "bg-[#182840]" : "bg-gray-100"}`} />)}</div>
                : drafts.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{drafts.map(d => (
                  <DraftCard key={d._id} draft={d} dark={dark} isActive={scriptId === d._id} onClick={() => loadDraft(d._id)} onDelete={handleDeleteDraft} />
                ))}</div>
                  : <p className={`text-center py-4 text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>No drafts yet. Start writing!</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Step Content ─────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ── STEP 1: Write ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={cardCls}>
              {/* Title */}
              <div className={`px-6 py-4 border-b ${dark ? "border-[#182840]" : "border-gray-100"}`}>
                <input type="text" value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} placeholder="Your Project Title"
                  className={`w-full text-xl font-bold bg-transparent outline-none ${dark ? "text-gray-100 placeholder:text-gray-600" : "text-gray-900 placeholder:text-gray-300"}`} />
              </div>
              {/* Toolbar */}
              <EditorToolbar editor={editor} dark={dark} />
              {/* Editor */}
              <div className={`${dark
                ? "[&_.tiptap]:text-gray-200 [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-600 [&_.tiptap_h1]:text-white [&_.tiptap_h2]:text-gray-100 [&_.tiptap_blockquote]:border-[#1d3350] [&_.tiptap_blockquote]:text-gray-400 [&_.tiptap_code]:bg-white/[0.06] [&_.tiptap_pre]:bg-[#0f1e30] [&_.tiptap_hr]:border-[#182840]"
                : "[&_.tiptap_code]:bg-gray-100 [&_.tiptap_pre]:bg-gray-50 [&_.tiptap_blockquote]:border-gray-300 [&_.tiptap_hr]:border-gray-200"}`}>
                <EditorContent editor={editor} />
              </div>
              {/* Status */}
              <div className={`flex items-center justify-between px-4 py-2.5 border-t text-xs ${dark ? "border-[#182840] text-gray-500" : "border-gray-100 text-gray-400"}`}>
                <div className="flex gap-4"><span>{wordCount} words</span><span>{charCount} chars</span></div>
                <button onClick={() => handleSave(false)} disabled={saving}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${dark ? "hover:bg-white/[0.06] text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
                  {saving ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-5`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Project Details</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Tell us about your script so we can categorize it properly.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Format *</label>
                  <select name="format" value={formData.format} onChange={handleChange} className={inputCls}>
                    {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Estimated Pages</label>
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${dark ? "bg-white/[0.04] border border-[#1d3350]" : "bg-gray-50 border border-gray-200"}`}>
                    <span className={`text-2xl font-bold ${pageStatus === "good" ? dark ? "text-green-400" : "text-green-600" : pageStatus === "short" ? dark ? "text-amber-400" : "text-amber-600" : dark ? "text-blue-400" : "text-blue-600"}`}>{estimatedPages}</span>
                    <div>
                      <p className={`text-xs font-medium ${dark ? "text-gray-300" : "text-gray-600"}`}>pages</p>
                      <p className={`text-[10px] ${dark ? "text-gray-500" : "text-gray-400"}`}>Auto-calculated from {wordCount} words</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Format-aware page hint */}
              <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs ${pageStatus === "good"
                ? dark ? "bg-green-500/5 border border-green-500/10 text-green-400" : "bg-green-50 border border-green-100 text-green-700"
                : pageStatus === "short"
                  ? dark ? "bg-amber-500/5 border border-amber-500/10 text-amber-400" : "bg-amber-50 border border-amber-100 text-amber-700"
                  : dark ? "bg-blue-500/5 border border-blue-500/10 text-blue-400" : "bg-blue-50 border border-blue-100 text-blue-700"
                }`}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                <div>
                  <p className="font-medium">{formatInfo.label}: typical range is {formatInfo.typical} pages</p>
                  <p className={`mt-0.5 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                    {pageStatus === "good" ? "Your script length looks good for this format!"
                      : pageStatus === "short" ? `Your script is shorter than typical. That's okay for early drafts — keep writing!`
                        : `Your script exceeds the typical range. Consider trimming or changing the format.`}
                  </p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Primary Genre *</label>
                <select name="primaryGenre" value={formData.primaryGenre} onChange={handleChange} className={inputCls}>
                  <option value="">Select genre...</option>
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Logline * <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>({formData.logline.length}/300)</span></label>
                <textarea name="logline" value={formData.logline} onChange={handleChange} rows={3} maxLength={300} placeholder="A one-sentence summary of your story..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Synopsis <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(optional)</span></label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="A longer description of your script..."
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Tags <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>(comma separated)</span></label>
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. heist, ensemble, twist ending" className={inputCls} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Classification ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Deep Classification</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Select up to 3 in each category. This helps readers discover your script.</p>
              </div>
              {[{ label: "Tones", key: "tones", opts: toneOptions }, { label: "Themes", key: "themes", opts: themeOptions }, { label: "Settings", key: "settings", opts: settingOptions }].map(({ label, key, opts }) => (
                <div key={key}>
                  <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>{label} <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>({classification[key].length}/3)</span></h3>
                  <div className="flex flex-wrap gap-2">
                    {opts.map(v => <button key={v} type="button" onClick={() => toggleChip(key, v)} className={chipCls(classification[key].includes(v))}>{v}</button>)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: Review & Publish ── */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Review & Publish</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Choose optional services and agree to our terms.</p>
              </div>

              {/* Services */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "hosting", icon: "🌐", name: "Hosting & Discovery", price: "FREE", desc: "Your script listed on the marketplace" },
                  { key: "evaluation", icon: "⭐", name: "Professional Evaluation", price: `${SERVICE_PRICES.evaluation} credits`, desc: "Scorecard & feedback from a vetted reader" },
                  { key: "aiTrailer", icon: "🎬", name: "AI Concept Trailer", price: `${SERVICE_PRICES.aiTrailer} credits`, desc: "60-second cinematic teaser", badge: "BETA" },
                ].map(s => (
                  <div key={s.key} onClick={() => s.key !== "hosting" && setServices(sv => ({ ...sv, [s.key]: !sv[s.key] }))}
                    className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${services[s.key]
                      ? dark ? "border-[#1e3a5f] bg-[#1e3a5f]/10" : "border-blue-400 bg-blue-50"
                      : dark ? "border-[#182840] hover:border-[#1d3350]" : "border-gray-200 hover:border-gray-300"
                      } ${s.key === "hosting" ? "cursor-default opacity-80" : ""}`}>
                    {s.badge && <span className="float-right text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white">{s.badge}</span>}
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <h4 className={`text-sm font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}>{s.name}</h4>
                    <p className={`text-lg font-bold mt-1 ${dark ? "text-white" : "text-gray-900"}`}>{s.price}</p>
                    <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{s.desc}</p>
                    {s.key !== "hosting" && <div className="mt-2 flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${services[s.key] ? dark ? "border-[#1e3a5f] bg-[#1e3a5f]" : "border-blue-500 bg-blue-500" : dark ? "border-gray-600" : "border-gray-300"}`}>
                        {services[s.key] && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-[11px] ${dark ? "text-gray-400" : "text-gray-500"}`}>{services[s.key] ? "Selected" : "Optional"}</span>
                    </div>}
                  </div>
                ))}
              </div>

              {/* Credits */}
              <div className={`rounded-xl p-4 flex items-center justify-between ${dark ? "bg-[#1e3a5f]/10 border border-[#1e3a5f]/20" : "bg-blue-50 border border-blue-100"}`}>
                <div>
                  <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Your Balance</p>
                  <p className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>{creditsBalance} credits</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>Total Cost</p>
                  <p className={`text-lg font-bold ${calculateTotal() > creditsBalance ? "text-red-400" : dark ? "text-green-400" : "text-green-600"}`}>{calculateTotal()} credits</p>
                </div>
              </div>

              {/* Legal */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>Submission Agreement</label>
                <div ref={agreementRef} className={`rounded-xl p-4 h-48 overflow-y-auto text-xs leading-relaxed border ${dark ? "border-[#182840] text-gray-400" : "border-gray-200 text-gray-500"}`}>
                  <pre className="whitespace-pre-wrap font-sans">{LEGAL_AGREEMENT}</pre>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={legal.agreedToTerms} onChange={e => setLegal({ agreedToTerms: e.target.checked })}
                  className="w-5 h-5 rounded mt-0.5 accent-[#1e3a5f]" />
                <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>I have read and agree to the Submission Release Agreement</span>
              </label>

              {/* Publish Button */}
              <button onClick={handlePublish} disabled={loading || !legal.agreedToTerms}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${dark
                  ? "bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white hover:shadow-lg hover:shadow-[#1e3a5f]/30"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:shadow-blue-200"}`}>
                {loading ? "Publishing..." : "✨ Publish Project"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation Buttons ── */}
      {step > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between mt-5">
          <button onClick={handleBack} disabled={step === 1}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-30 ${dark
              ? "border-[#1d3350] text-gray-400 hover:bg-white/[0.06]" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
            ← Back
          </button>
          {step < 4 && (
            <button onClick={handleNext}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${dark
                ? "bg-[#1e3a5f] text-white hover:bg-[#2a4a70] shadow-lg shadow-[#1e3a5f]/20"
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200"}`}>
              Next →
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default CreateProject;
