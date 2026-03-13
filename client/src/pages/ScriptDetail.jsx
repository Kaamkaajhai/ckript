import { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import { Film } from "lucide-react";
import RazorpayScriptPayment from "../components/RazorpayScriptPayment";

const ScriptDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coverError, setCoverError] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paymentType, setPaymentType] = useState("purchase"); // "purchase" or "hold"
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]); // for creator view on this script
  const [pendingReqLoading, setPendingReqLoading] = useState(false);
  const [pendingReqActionId, setPendingReqActionId] = useState(null);
  const [rejectNoteModal, setRejectNoteModal] = useState(null); // { id, investorName }
  const [rejectNoteText, setRejectNoteText] = useState("");

  /* ── Handlers ─────────────────────────────────────────── */

  const handleDeleteScript = async () => {
    try {
      setDeleteLoading(true);
      await api.delete(`/scripts/${id}`);
      window.dispatchEvent(new CustomEvent("scriptDeleted", { detail: { id } }));
      setShowDeleteModal(false);
      navigate(`/profile/${user._id}`);
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteLoading(false);
    }
  };

  const resolveImage = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:5001${url}`;
  };

  const handlePrint = () => {
    const raw = script?.textContent || "";
    const isHtml = raw.startsWith("<");
    const bodyContent = isHtml
      ? raw
      : raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${script?.title || "Script"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #000; font-family: 'Courier Prime', 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.7; padding: 60px 80px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .meta { text-align: center; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ccc; }
    .content { white-space: pre-wrap; }
    @media print { body { padding: 40px 60px; } }
  </style>
</head>
<body>
  <h1>${script?.title || ""}</h1>
  <div class="meta">${script?.format || ""}</div>
  <div class="content">${isHtml ? bodyContent : `<p class="content">${bodyContent}</p>`}</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  const handleDownload = () => {
    const raw = script?.textContent || "";
    const plain = raw.replace(/<[^>]*>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const blob = new Blob([`${script?.title || "Script"}\n${'='.repeat((script?.title || '').length)}\n\n${plain}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(script?.title || "script").replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchScript();
    setCoverError(false);
  }, [id]);

  useEffect(() => {
    if (script?.isCreator) {
      fetchPendingRequestsForScript();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script?._id, script?.isCreator]);

  const fetchScript = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/scripts/${id}`);
      setScript(data);
    } catch {
      /* demo fallback */
      setScript({
        _id: id,
        title: "The Last Detective",
        logline:
          "A retired detective is drawn back into one final case that will challenge everything he believes.",
        description:
          "A gripping thriller about a retired detective drawn back into one final case.",
        synopsis:
          "When a serial killer resurfaces after 20 years, retired detective Marcus Cole is the only one who can stop them.",
        genre: "Thriller",
        primaryGenre: "Thriller",
        contentType: "feature_film",
        format: "feature",
        pageCount: 110,
        classification: {
          primaryGenre: "Thriller",
          secondaryGenre: "Crime",
          tones: ["Dark", "Suspenseful", "Gritty"],
          themes: ["Revenge", "Redemption", "Justice"],
          settings: ["Urban", "Contemporary", "New York"],
        },
        contentIndicators: {
          bechdelTest: true,
          basedOnTrueStory: false,
          adaptation: false,
        },
        creator: { _id: "demo", name: "Sarah Mitchell", profileImage: "" },
        price: 149.99,
        premium: true,
        trailerUrl: "",
        trailerStatus: "none",
        scriptScore: {
          overall: 87,
          plot: 90,
          characters: 85,
          dialogue: 88,
          pacing: 82,
          marketability: 92,
          feedback:
            "Strong commercial potential with a compelling protagonist and tight plot structure.",
          scoredAt: new Date().toISOString(),
        },
        roles: [
          {
            _id: "r1",
            characterName: "Det. Marcus Cole",
            type: "Rough, older, like Liam Neeson",
            description: "Retired detective, haunted by his past",
            ageRange: { min: 45, max: 65 },
            gender: "Male",
          },
          {
            _id: "r2",
            characterName: "Agent Williams",
            type: "Professional, sharp",
            description: "FBI agent assigned to the case",
            ageRange: { min: 30, max: 50 },
            gender: "Female",
          },
        ],
        holdStatus: "available",
        holdFee: 200,
        views: 342,
        tags: ["thriller", "detective", "serial-killer"],
        budget: "medium",
        createdAt: new Date().toISOString(),
        auditionCount: 13,
        services: { hosting: true, evaluation: true, aiTrailer: false },
        rating: 4.2,
        reviewCount: 8,
        readsCount: 56,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHold = async () => {
    setPaymentType("hold");
    setShowHoldModal(true);
  };

  const handlePurchase = async () => {
    setPaymentType("purchase");
    setShowPurchaseModal(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    // Refresh script data after successful payment
    await fetchScript();

    // Show success message
    if (paymentType === "purchase") {
      alert(`Script purchased successfully! ${paymentData.message || ""}`);
    } else {
      alert(`Hold placed successfully! ${paymentData.message || ""}`);
    }

    // Close modal
    setShowHoldModal(false);
    setShowPurchaseModal(false);
  };

  const handleGenerateTrailer = async () => {
    setTrailerLoading(true);
    try {
      await api.post("/ai/generate-trailer", { scriptId: script._id });
      await fetchScript();
      alert("✅ Trailer request received! Your AI trailer will be ready in approximately 2 business days. We\'ll notify you once it\'s live.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate trailer");
    } finally {
      setTrailerLoading(false);
    }
  };

  const handleGenerateScore = async () => {
    setScoreLoading(true);
    try {
      await api.post("/ai/script-score", { scriptId: script._id });
      await fetchScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate score");
    } finally {
      setScoreLoading(false);
    }
  };

  const handleUnlockSynopsis = async () => {
    setUnlockLoading(true);
    try {
      await api.post("/scripts/unlock", { scriptId: script._id });
      await fetchScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unlock synopsis");
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleRequestPurchase = async () => {
    setRequestLoading(true);
    try {
      await api.post("/scripts/purchase-request", { scriptId: script._id });
      setShowRequestModal(false);
      await fetchScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit purchase request");
    } finally {
      setRequestLoading(false);
    }
  };

  const fetchPendingRequestsForScript = async () => {
    if (!script?.isCreator) return;
    setPendingReqLoading(true);
    try {
      const { data } = await api.get("/scripts/purchase-requests/mine");
      setPendingRequests(data.filter((r) => r.script?._id === script._id && r.status === "pending"));
    } catch {
      // silent
    } finally {
      setPendingReqLoading(false);
    }
  };

  const handleApproveRequest = async (reqId) => {
    setPendingReqActionId(reqId);
    try {
      await api.put(`/scripts/purchase-request/${reqId}/approve`);
      await fetchScript();
      await fetchPendingRequestsForScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve request");
    } finally {
      setPendingReqActionId(null);
    }
  };

  const handleRejectRequestSubmit = async () => {
    if (!rejectNoteModal) return;
    setPendingReqActionId(rejectNoteModal.id);
    try {
      await api.put(`/scripts/purchase-request/${rejectNoteModal.id}/reject`, { note: rejectNoteText });
      setRejectNoteModal(null);
      setRejectNoteText("");
      await fetchScript();
      await fetchPendingRequestsForScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject request");
    } finally {
      setPendingReqActionId(null);
    }
  };

  /* ── Formatters ───────────────────────────────────────── */

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "N/A";

  const fmtFormat = (f) => {
    const map = {
      feature: "Feature Film",
      tv_1hr: "TV (1 Hour)",
      tv_halfhr: "TV (Half Hour)",
      short: "Short Film",
      feature_film: "Feature Film",
      tv_1hour: "TV (1 Hour)",
      tv_pilot_1hour: "TV Pilot (1 Hour)",
      tv_halfhour: "TV (Half Hour)",
      tv_pilot_halfhour: "TV Pilot (Half Hour)",
      short_film: "Short Film",
      web_series: "Web Series",
      play: "Play",
    };
    return (
      map[f] ||
      f?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "\u2014"
    );
  };

  const fmtBudget = (b) => {
    const map = {
      micro: "Micro (<$100K)",
      low: "Low ($100K\u2013$1M)",
      medium: "Medium ($1M\u2013$15M)",
      high: "High ($15M\u2013$75M)",
      blockbuster: "Blockbuster ($75M+)",
    };
    return map[b] || b?.charAt(0).toUpperCase() + b?.slice(1) || "\u2014";
  };

  const scoreColor = (v = 0) =>
    v >= 80 ? "text-emerald-500" : v >= 60 ? "text-amber-500" : "text-rose-500";

  const scoreBg = (v = 0) =>
    v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-rose-500";

  /* ── Theme helpers ─────────────────────────────────────── */
  const t = {
    page: isDarkMode ? "bg-[#070e1a]" : "bg-gray-50",
    card: isDarkMode ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200",
    cardHov: isDarkMode ? "hover:border-white/[0.12]" : "hover:border-gray-300",
    tabs: isDarkMode ? "bg-[#0a1220] border-white/[0.04]" : "bg-gray-100/80 border-gray-200",
    tabAct: isDarkMode ? "bg-[#1e3a5f] text-white shadow-md shadow-[#0a1520]/60"
      : "bg-white text-[#1e3a5f] shadow-sm shadow-gray-200",
    tabInact: isDarkMode ? "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]"
      : "text-gray-400 hover:text-gray-700 hover:bg-white/60",
    title: isDarkMode ? "text-white" : "text-gray-900",
    sub: isDarkMode ? "text-neutral-400" : "text-gray-600",
    muted: isDarkMode ? "text-neutral-500" : "text-gray-400",
    label: isDarkMode ? "text-neutral-500" : "text-gray-400",
    chip: isDarkMode ? "bg-white/[0.06] border-white/[0.08] text-white/80"
      : "bg-gray-100 border-gray-200 text-gray-700",
    chipBlue: isDarkMode ? "bg-[#1e3a5f]/40 border-[#1e3a5f]/60 text-blue-300"
      : "bg-blue-50 border-blue-200 text-blue-700",
    row: isDarkMode ? "border-white/[0.04]" : "border-gray-100",
    divider: isDarkMode ? "border-white/[0.06]" : "border-gray-100",
    inset: isDarkMode ? "bg-white/[0.03] border-white/[0.05]"
      : "bg-gray-50 border-gray-200",
    btnPrim: isDarkMode ? "bg-[#1e3a5f] hover:bg-[#254a75] text-white"
      : "bg-[#1e3a5f] hover:bg-[#254a75] text-white",
    btnSec: isDarkMode ? "bg-white/[0.06] border-white/[0.08] text-white hover:bg-white/[0.1]"
      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
    btnGhost: isDarkMode ? "bg-[#1a3050] border-white/[0.06] text-white hover:bg-[#213d64]"
      : "bg-blue-50 border-blue-200 text-[#1e3a5f] hover:bg-blue-100",
    btnDel: isDarkMode ? "bg-red-500/8 border-red-500/15 text-red-400 hover:bg-red-500/15 hover:text-red-300"
      : "bg-red-50 border-red-200 text-red-500 hover:bg-red-100",
    logline: isDarkMode ? "from-white/[0.03] border-l-[#1e3a5f]"
      : "from-blue-50 border-l-[#1e3a5f]",
    tag: isDarkMode ? "bg-white/[0.04] text-neutral-500 ring-white/[0.06] hover:ring-white/[0.12]"
      : "bg-gray-100 text-gray-500 ring-gray-200 hover:ring-gray-300",
    priceSub: isDarkMode ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-gray-50 border-gray-200",
    dot: isDarkMode ? "bg-[#2a4060]" : "bg-gray-300",
  };

  /* ── Loading / Error ──────────────────────────────────── */

  if (loading)
    return (
      <div className={`flex justify-center items-center h-[60vh] ${t.page}`}>
        <div className={`w-10 h-10 border-2 rounded-full animate-spin ${isDarkMode ? "border-white/10 border-t-white/60" : "border-gray-200 border-t-gray-500"}`} />
      </div>
    );

  if (!script)
    return (
      <div className={`text-center py-20 ${t.page}`}>
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 border ${t.card}`}>
          <Film size={28} strokeWidth={1.5} className={t.muted} />
        </div>
        <h2 className={`text-lg font-bold mb-1 ${t.title}`}>Script not found</h2>
        <Link to="/search" className="text-[#1e3a5f] hover:underline text-sm font-semibold">
          Browse scripts
        </Link>
      </div>
    );

  /* ── Computed values ──────────────────────────────────── */

  const score = script.scriptScore || {};
  const isOwner = script.creator?._id === user?._id;
  const isPro = ["investor", "producer", "director"].includes(user?.role);
  const heroImage = script.trailerThumbnail || script.coverImage;
  const showCoverPlaceholder = !heroImage || coverError;
  const cl = script.classification || {};
  const ci = script.contentIndicators || {};

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "classification", label: "Classification" },
    { id: "evaluation", label: "Evaluation" },
    { id: "roles", label: "Roles" },
    { id: "synopsis", label: "Synopsis" },
    ...((isOwner || script.isUnlocked) && script.textContent
      ? [{ id: "content", label: isOwner ? "My Script" : "Full Script" }]
      : []),
  ];

  const stats = [
    { label: "Views", value: script.views || 0, g: isDarkMode ? "from-blue-500/10 to-blue-500/5" : "from-blue-50 to-white", c: "text-blue-500", b: isDarkMode ? "border-white/[0.06]" : "border-blue-100" },
    { label: "Reviews", value: script.reviewCount || 0, g: isDarkMode ? "from-emerald-500/10 to-emerald-500/5" : "from-emerald-50 to-white", c: "text-emerald-600", b: isDarkMode ? "border-white/[0.06]" : "border-emerald-100" },
  ];

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* ── Back ──────────────────────────────────────── */}
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-1.5 text-sm mb-5 transition font-medium group ${t.muted} hover:${isDarkMode ? "text-white" : "text-gray-800"}`}
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* ══════════════  HERO CARD  ══════════════════════ */}
          <div className={`rounded-2xl border overflow-hidden mb-6 ${t.card}`}>

            {/* Cover / Trailer */}
            <div className={`relative h-52 sm:h-72 ${isDarkMode ? "bg-gradient-to-br from-[#060c17] via-[#0c1a2d] to-[#0f2035]" : "bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200"}`}>
              {showCoverPlaceholder ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border mb-4 ${isDarkMode ? "border-white/[0.08] bg-white/[0.03]" : "border-gray-200 bg-white/60"}`}>
                    <Film size={28} strokeWidth={1.5} className={isDarkMode ? "text-white/30" : "text-gray-400"} />
                  </div>
                  <p className={`text-lg font-semibold ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>{script.title}</p>
                  {script.genre && (
                    <p className={`text-xs font-medium mt-1 uppercase tracking-[0.2em] ${isDarkMode ? "text-white/20" : "text-gray-400"}`}>{script.genre}</p>
                  )}
                </div>
              ) : (
                <img
                  src={resolveImage(heroImage)}
                  alt={script.title}
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}

              {/* Play overlay */}
              {(script.trailerUrl || script.uploadedTrailerUrl) && (
                <button onClick={() => setShowTrailer(true)} className="absolute inset-0 flex items-center justify-center group">
                  <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl ring-1 ring-white/10">
                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {script.premium && (
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-[11px] font-bold shadow-lg shadow-amber-500/20">
                    &#9733; Premium
                  </span>
                )}
                {script.holdStatus === "held" && (
                  <span className="px-3 py-1 bg-red-500/90 text-white rounded-lg text-[11px] font-bold">Held</span>
                )}
                {script.isFeatured && (
                  <span className="px-3 py-1 bg-purple-500/90 text-white rounded-lg text-[11px] font-bold">Featured</span>
                )}
              </div>

              {/* Bottom overlay chips */}
              <div className={`absolute bottom-0 left-0 right-0 pt-12 pb-4 px-5 bg-gradient-to-t ${isDarkMode ? "from-[#0d1829] via-[#0d1829]/80" : "from-white/95 via-white/70"} to-transparent`}>
                <div className="flex items-end justify-between">
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold border ${t.chip}`}>
                      {fmtFormat(script.format)}
                    </span>
                    {(script.primaryGenre || script.genre) && (
                      <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold border ${t.chip}`}>
                        {script.primaryGenre || script.genre}
                      </span>
                    )}
                    {cl.secondaryGenre && (
                      <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold border ${t.chip}`}>
                        {cl.secondaryGenre}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${isDarkMode ? "bg-black/30 text-white/80" : "bg-white/80 text-gray-600 border border-gray-200"}`}>
                      {script.views || 0} views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Script Info Area ──────────────────────────── */}
            <div className="p-5 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">

                {/* Left column */}
                <div className="flex-1 min-w-0">
                  <h1 className={`text-2xl sm:text-3xl font-bold mb-2 tracking-tight leading-tight ${t.title}`}>
                    {script.title}
                  </h1>

                  {/* Author */}
                  <Link to={`/profile/${script.creator?._id}`} className="inline-flex items-center gap-2.5 mb-5 group">
                    {script.creator?.profileImage && !coverError ? (
                      <img
                        src={resolveImage(script.creator.profileImage)}
                        alt=""
                        className={`w-7 h-7 rounded-full object-cover ring-2 ${isDarkMode ? "ring-white/10" : "ring-gray-200"}`}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ${isDarkMode ? "bg-gradient-to-br from-[#1e3a5f] to-[#2a5080] ring-white/10" : "bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] ring-gray-200"}`}>
                        {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span className={`text-sm font-semibold transition group-hover:text-[#1e3a5f] ${t.sub}`}>
                      {script.creator?.name}
                    </span>
                  </Link>

                  {/* Logline */}
                  {script.logline && (
                    <div className={`bg-gradient-to-r rounded-xl p-4 mb-5 border-l-2 ${t.logline}`}>
                      <p className={`text-[13px] leading-relaxed italic ${t.sub}`}>
                        &ldquo;{script.logline}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {script.description && (
                    <p className={`text-sm leading-relaxed mb-5 ${t.muted}`}>{script.description}</p>
                  )}

                  {/* Synopsis preview */}
                  {script.synopsis && (
                    <div className={`rounded-xl p-4 mb-5 border ${t.inset}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${t.label}`}>Synopsis</p>
                      <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${t.sub}`}>{script.synopsis}</p>
                      {script.isSynopsisLocked && (
                        <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-xs ${t.divider} ${t.muted}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                          <span className="font-semibold">Full synopsis locked &mdash; teaser shown</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content indicators */}
                  {(ci.bechdelTest || ci.basedOnTrueStory || ci.adaptation) && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {ci.bechdelTest && (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[11px] font-bold border border-emerald-500/20">
                          &#10003; Bechdel Test
                        </span>
                      )}
                      {ci.basedOnTrueStory && (
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-lg text-[11px] font-bold border border-blue-500/20">
                          Based on True Story
                        </span>
                      )}
                      {ci.adaptation && (
                        <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 rounded-lg text-[11px] font-bold border border-purple-500/20">
                          Adaptation{ci.adaptationSource ? `: ${ci.adaptationSource}` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {script.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {script.tags.map((tag) => (
                        <span key={tag} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ring-1 transition ${t.tag}`}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Right Sidebar ─────────────────────────── */}
                <div className="lg:w-64 space-y-3 flex-shrink-0">

                  {/* Price card */}
                  <div className={`rounded-xl p-5 border ${t.priceSub}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${t.label}`}>Price</p>
                    <p className={`text-3xl font-extrabold mb-3 ${t.title}`}>
                      ${script.price}
                      <span className={`text-sm font-medium ml-1 ${t.muted}`}>USD</span>
                    </p>
                    <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${t.divider}`}>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>Pages</p>
                        <p className={`text-lg font-extrabold tabular-nums ${t.title}`}>{script.pageCount || "\u2014"}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>Budget</p>
                        <p className={`text-[13px] font-bold capitalize ${t.title}`}>{script.budget || "\u2014"}</p>
                      </div>

                      {script.rating > 0 && (
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>Rating</p>
                          <p className="text-lg font-extrabold text-amber-500 tabular-nums">&#9733; {script.rating.toFixed(1)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {isOwner && (
                      <button
                        onClick={() => navigate(`/upload?edit=${script._id}`)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${t.btnSec}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit &amp; Republish
                      </button>
                    )}

                    {/* Purchase / Request Button for non-owners */}
                    {!isOwner && script.canPurchase && !script.isUnlocked && (
                      script.myPendingRequest ? (
                        <div className="w-full px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
                          <div className="flex items-center justify-center gap-2 text-amber-700 text-sm font-bold">
                            <svg className="w-4 h-4 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Awaiting Writer Approval
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowRequestModal(true)}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition shadow-lg ${t.btnPrim}`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {script.price > 0 ? `Request to Purchase — $${script.price}` : "Request Access"}
                          </div>
                        </button>
                      )
                    )}

                    {/* Already Purchased Badge + Message Writer CTA */}
                    {!isOwner && script.isUnlocked && (
                      <>
                        <div className="w-full px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold text-center border border-emerald-200 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Purchased
                        </div>
                        {user?.role === "investor" && script.creator?._id && (
                          <button
                            onClick={() =>
                              navigate(
                                `/messages?recipientId=${script.creator._id}&recipientName=${encodeURIComponent(script.creator.name || "Writer")}`
                              )
                            }
                            className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 border ${t.btnSec}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Message Writer
                          </button>
                        )}
                      </>
                    )}

                    {!isOwner && isPro && script.holdStatus === "available" && (
                      <button
                        onClick={handleHold}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition shadow-sm ${t.btnGhost}`}
                      >
                        Place Hold &mdash; ₹{script.holdFee || 200}
                      </button>
                    )}

                    {script.holdStatus === "held" && (
                      <div className="w-full px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold text-center border border-red-200">
                        Currently Held
                      </div>
                    )}

                    {isOwner && !script.trailerUrl && !script.uploadedTrailerUrl && script.trailerStatus !== "generating" && script.trailerStatus !== "ready" && (
                      <button
                        onClick={handleGenerateTrailer}
                        disabled={trailerLoading}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 border ${t.btnGhost}`}
                      >
                        <Film size={14} />
                        {trailerLoading ? "Submitting request..." : "Generate AI Trailer — 15 credits"}
                      </button>
                    )}

                    {script.trailerStatus === "generating" && (
                      <div className={`w-full px-4 py-3 rounded-xl text-xs font-bold text-center border flex flex-col items-center justify-center gap-1.5 ${t.inset}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 border-2 rounded-full animate-spin ${isDarkMode ? "border-neutral-600 border-t-amber-400" : "border-gray-300 border-t-amber-500"}`} />
                          <span className={isDarkMode ? "text-amber-400" : "text-amber-600"}>Trailer Requested</span>
                        </div>
                        <span className={`text-[10px] font-medium ${isDarkMode ? "text-neutral-500" : "text-gray-400"}`}>Ready in approximately 2 business days</span>
                      </div>
                    )}

                    {isOwner && !score?.overall && (
                      <button
                        onClick={handleGenerateScore}
                        disabled={scoreLoading}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 border ${t.btnGhost}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M18 20V10M12 20V4M6 20v-6" />
                        </svg>
                        {scoreLoading ? "Scoring..." : "Get Script Score \u2014 10 credits"}
                      </button>
                    )}

                    {isOwner && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border mt-1 ${t.btnDel}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Delete Project
                      </button>
                    )}
                  </div>

                  {/* Services */}
                  {script.services && (
                    <div className={`rounded-xl p-4 border ${t.priceSub}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${t.label}`}>Active Services</p>
                      <div className="space-y-1.5">
                        {script.services.hosting && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className={`font-medium ${t.sub}`}>Hosted &amp; Searchable</span>
                          </div>
                        )}
                        {script.services.evaluation && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className={`font-medium ${t.sub}`}>Professional Evaluation</span>
                          </div>
                        )}
                        {script.services.aiTrailer && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className={`font-medium ${t.sub}`}>AI Trailer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className={`text-[11px] font-medium text-center ${t.muted}`}>
                    Uploaded {formatDate(script.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════  TABS BAR  ═════════════════════════ */}
          <div className={`flex gap-1 mb-6 rounded-xl p-1 overflow-x-auto border ${t.tabs}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === tab.id ? t.tabAct : t.tabInact}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════  TAB CONTENT  ═════════════════════ */}
          <AnimatePresence mode="wait">

            {/* ── Overview ─────────────────────────────────── */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stats.map((s) => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.g} rounded-xl border ${s.b} p-4 ${t.cardHov} transition group`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${t.label}`}>{s.label}</p>
                      <p className={`text-2xl font-extrabold tabular-nums ${s.c}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Details table */}
                <div className={`rounded-xl border p-6 ${t.card}`}>
                  <h3 className={`text-[13px] font-bold mb-4 flex items-center gap-2 ${t.title}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                      <svg className={`w-3.5 h-3.5 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    Project Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {[
                      { label: "Format", value: fmtFormat(script.format) },
                      { label: "Primary Genre", value: cl.primaryGenre || script.primaryGenre || script.genre },
                      { label: "Secondary Genre", value: cl.secondaryGenre },
                      { label: "Page Count", value: script.pageCount },
                      { label: "Budget Level", value: fmtBudget(script.budget) },
                      { label: "Hold Fee", value: script.holdFee ? `$${script.holdFee}` : null },
                      { label: "Hold Status", value: script.holdStatus?.charAt(0).toUpperCase() + script.holdStatus?.slice(1) },
                      { label: "Uploaded", value: formatDate(script.createdAt) },
                    ]
                      .filter((i) => i.value && i.value !== "\u2014")
                      .map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-center py-2.5 border-b last:border-0 ${t.row}`}>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${t.label}`}>{item.label}</span>
                          <span className={`text-sm font-semibold ${t.sub}`}>{item.value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Classification ───────────────────────────── */}
            {activeTab === "classification" && (
              <motion.div key="classification" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {[
                  { label: "Tones", items: cl.tones, color: isDarkMode ? "bg-white/[0.06] text-white/80 border border-white/[0.08]" : "bg-gray-100 text-gray-700 border border-gray-200" },
                  { label: "Themes", items: cl.themes, color: isDarkMode ? "bg-blue-500/10 text-blue-300 border border-blue-500/15" : "bg-blue-50 text-blue-700 border border-blue-200" },
                  { label: "Settings", items: cl.settings, color: isDarkMode ? "bg-white/[0.04] text-neutral-300 border border-white/[0.06]" : "bg-slate-50 text-slate-700 border border-slate-200" },
                ]
                  .filter((c) => c.items?.length > 0)
                  .map((cat) => (
                    <div key={cat.label} className={`rounded-xl border p-6 ${t.card}`}>
                      <h3 className={`text-[13px] font-bold mb-3 ${t.title}`}>{cat.label}</h3>
                      <div className="flex flex-wrap gap-2">
                        {cat.items.map((item, i) => (
                          <span key={i} className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold ${cat.color}`}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}

                {!cl.tones?.length && !cl.themes?.length && !cl.settings?.length && (
                  <div className={`text-center py-12 rounded-xl border ${t.card}`}>
                    <h3 className={`text-base font-bold mb-1 ${t.title}`}>No Classification Data</h3>
                    <p className={`text-sm ${t.muted}`}>
                      {isOwner ? "Add tones, themes, and settings when editing your script" : "Classification data hasn't been added yet"}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Evaluation ─────────────────────── */}
            {activeTab === "evaluation" && (() => {
              const dk = isDarkMode;

              /* Dimension definitions — each has a distinct semantic color */
              const dims = [
                { key: "plot", label: "Plot", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: dk ? "#818cf8" : "#4f46e5" },
                { key: "characters", label: "Characters", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", color: dk ? "#a78bfa" : "#7c3aed" },
                { key: "dialogue", label: "Dialogue", icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z", color: dk ? "#34d399" : "#059669" },
                { key: "pacing", label: "Pacing", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: dk ? "#fbbf24" : "#d97706" },
                { key: "marketability", label: "Marketability", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", color: dk ? "#fb923c" : "#ea580c" },
              ];

              /* Score → grade helpers */
              const gradeLabel = (v) => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : "F";
              const gradeColor = (v) =>
                v >= 90 ? (dk ? "#c084fc" : "#9333ea") :
                  v >= 80 ? (dk ? "#34d399" : "#059669") :
                    v >= 70 ? (dk ? "#60a5fa" : "#2563eb") :
                      v >= 60 ? (dk ? "#fbbf24" : "#d97706") :
                        (dk ? "#f87171" : "#dc2626");
              const gradeText = (v) => v >= 90 ? "Exceptional" : v >= 80 ? "Excellent" : v >= 70 ? "Strong" : v >= 60 ? "Promising" : v >= 50 ? "Developing" : "Needs Work";
              const gradeBand = (v) =>
                v >= 90 ? (dk ? "bg-purple-400/10 border-purple-400/20 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-700") :
                  v >= 80 ? (dk ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700") :
                    v >= 70 ? (dk ? "bg-blue-400/10 border-blue-400/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700") :
                      v >= 60 ? (dk ? "bg-amber-400/10 border-amber-400/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700") :
                        (dk ? "bg-red-400/10 border-red-400/20 text-red-300" : "bg-red-50 border-red-200 text-red-700");

              /* Radar geometry */
              const cx = 110, cy = 110, rr = 80;
              const angleStep = (2 * Math.PI) / dims.length;
              const radarPts = dims.map((d, i) => {
                const v = (score[d.key] || 0) / 100;
                const a = angleStep * i - Math.PI / 2;
                return { x: cx + rr * v * Math.cos(a), y: cy + rr * v * Math.sin(a) };
              });
              const gridLevels = [0.25, 0.5, 0.75, 1];
              const overallColor = gradeColor(score.overall || 0);

              return (
                <motion.div key="evaluation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  {score?.overall ? (
                    <>
                      {/* ── 1. Score Hero ── */}
                      <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                        <div className="flex flex-col sm:flex-row items-center gap-0 divide-y sm:divide-y-0 sm:divide-x"
                          style={{ divideColor: dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>

                          {/* Overall gauge */}
                          <div className="flex flex-col items-center justify-center gap-3 px-8 py-7 sm:w-56 shrink-0">
                            <div className="relative w-28 h-28">
                              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="42" fill="none"
                                  stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="7" />
                                <circle cx="50" cy="50" r="42" fill="none"
                                  stroke={overallColor} strokeWidth="7" strokeLinecap="round"
                                  strokeDasharray={`${(score.overall / 100) * 263.9} 263.9`}
                                  style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-black tabular-nums leading-none ${dk ? "text-white" : "text-gray-900"}`}>{score.overall}</span>
                                <span className={`text-[9px] font-semibold uppercase tracking-widest mt-1 ${dk ? "text-white/30" : "text-gray-400"}`}>score</span>
                              </div>
                            </div>
                            {/* Grade badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${gradeBand(score.overall)}`}>
                              <span className="text-base font-black leading-none">{gradeLabel(score.overall)}</span>
                              <span>{gradeText(score.overall)}</span>
                            </div>
                          </div>

                          {/* Dimension pills grid */}
                          <div className="flex-1 px-6 py-6">
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>
                              Dimension Scores{score.scoredAt ? ` · ${formatDate(score.scoredAt)}` : ""}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {dims.map(d => {
                                const val = score[d.key] || 0;
                                return (
                                  <div key={d.key}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${dk ? "bg-white/[0.03] border-white/[0.07]" : "bg-gray-50/80 border-gray-200/60"}`}>
                                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                                      style={{ backgroundColor: `${d.color}${dk ? "18" : "10"}` }}>
                                      <svg className="w-4 h-4" style={{ color: d.color }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={d.icon} />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <p className={`text-[10px] font-medium truncate ${dk ? "text-white/35" : "text-gray-400"}`}>{d.label}</p>
                                      <p className="text-sm font-black tabular-nums leading-tight" style={{ color: d.color }}>{val}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── 2. Radar + Breakdown ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                        {/* Radar */}
                        <div className={`rounded-2xl border p-5 ${t.card}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>Performance Radar</p>
                          <svg viewBox="0 0 220 220" className="w-full max-w-xs mx-auto">
                            <defs>
                              <radialGradient id="evalRadarFill" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor={overallColor} stopOpacity={dk ? "0.22" : "0.16"} />
                                <stop offset="100%" stopColor={overallColor} stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            {/* Grid rings */}
                            {gridLevels.map((lv, gi) => {
                              const pts = dims.map((_, j) => {
                                const a = angleStep * j - Math.PI / 2;
                                return `${cx + rr * lv * Math.cos(a)},${cy + rr * lv * Math.sin(a)}`;
                              }).join(" ");
                              return <polygon key={gi} points={pts} fill="none"
                                stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="1" />;
                            })}
                            {/* Axis spokes */}
                            {dims.map((_, i) => {
                              const a = angleStep * i - Math.PI / 2;
                              return <line key={i} x1={cx} y1={cy} x2={cx + rr * Math.cos(a)} y2={cy + rr * Math.sin(a)}
                                stroke={dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="1" />;
                            })}
                            {/* Data shape */}
                            <polygon points={radarPts.map(p => `${p.x},${p.y}`).join(" ")}
                              fill="url(#evalRadarFill)" stroke={overallColor} strokeWidth="2" strokeLinejoin="round" />
                            {/* Dimension dots + labels */}
                            {radarPts.map((p, i) => {
                              const a = angleStep * i - Math.PI / 2;
                              const lx = cx + (rr + 22) * Math.cos(a);
                              const ly = cy + (rr + 22) * Math.sin(a);
                              return (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="4" fill={dims[i].color}
                                    stroke={dk ? "#0d1829" : "#ffffff"} strokeWidth="2" />
                                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                                    style={{ fontSize: 8.5, fontWeight: 700, fill: dk ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                                    {dims[i].label}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* Bar Chart */}
                        <div className={`rounded-2xl border p-5 ${t.card}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>Score Overview</p>
                          {(() => {
                            const barH = 180;
                            const bars = [{ key: "overall", label: "Overall", color: overallColor }, ...dims];
                            const gridLines = [0, 25, 50, 75, 100];
                            const gridColor = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                            const labelColor = dk ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
                            const slotW = 220 / bars.length;
                            const barW = Math.min(slotW * 0.58, 28);
                            return (
                              <svg viewBox={`0 0 240 ${barH + 44}`} className="w-full">
                                {gridLines.map(v => {
                                  const y = barH - (v / 100) * barH + 4;
                                  return (
                                    <g key={v}>
                                      <line x1="24" y1={y} x2="238" y2={y} stroke={gridColor} strokeWidth={v === 0 ? "1.5" : "1"} strokeDasharray={v === 0 ? "" : "3,3"} />
                                      <text x="18" y={y + 3.5} textAnchor="end" style={{ fontSize: 7.5, fontWeight: 600, fill: labelColor }}>{v}</text>
                                    </g>
                                  );
                                })}
                                {bars.map((d, i) => {
                                  const val = score[d.key] || 0;
                                  const filledH = (val / 100) * barH;
                                  const x = 24 + i * slotW + (slotW - barW) / 2;
                                  const y = barH - filledH + 4;
                                  return (
                                    <g key={d.key}>
                                      <rect x={x} y={4} width={barW} height={barH} rx="4"
                                        fill={dk ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"} />
                                      <rect x={x} y={y} width={barW} height={filledH} rx="4" fill={d.color}>
                                        <animate attributeName="height" from="0" to={filledH} dur="0.75s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                        <animate attributeName="y" from={barH + 4} to={y} dur="0.75s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                      </rect>
                                      <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                                        style={{ fontSize: 8, fontWeight: 800, fill: dk ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}>{val}</text>
                                      <text x={x + barW / 2} y={barH + 18} textAnchor="middle"
                                        style={{ fontSize: 7, fontWeight: 700, fill: d.color }}>{d.label}</text>
                                    </g>
                                  );
                                })}
                              </svg>
                            );
                          })()}
                        </div>
                      </div>

                      {/* ── 3. Platform Score (Admin) ── */}
                      {script.platformScore?.overall > 0 && (() => {
                        const ps = script.platformScore;
                        const psDims = [
                          { key: "content", label: "Main Content", color: "#6366f1", track: dk ? "rgba(99,102,241,0.15)" : "#ede9fe" },
                          { key: "trailer", label: "Trailer", color: "#8b5cf6", track: dk ? "rgba(139,92,246,0.15)" : "#ede9fe" },
                          { key: "title", label: "Title", color: "#f59e0b", track: dk ? "rgba(245,158,11,0.15)" : "#fef3c7" },
                          { key: "synopsis", label: "Synopsis", color: "#10b981", track: dk ? "rgba(16,185,129,0.15)" : "#d1fae5" },
                          { key: "tags", label: "Tag & Meta", color: "#f97316", track: dk ? "rgba(249,115,22,0.15)" : "#ffedd5" },
                        ];
                        const ov = ps.overall ?? 0;
                        const gc = ov >= 85 ? "#8b5cf6" : ov >= 70 ? "#10b981" : ov >= 55 ? "#3b82f6" : ov >= 40 ? "#f59e0b" : "#ef4444";
                        const gl = ov >= 85 ? "S" : ov >= 70 ? "A" : ov >= 55 ? "B" : ov >= 40 ? "C" : "D";
                        return (
                          <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${dk ? "bg-[#0d1b2e]/60 border-white/[0.06]" : "bg-gray-50/80 border-gray-100"}`}>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${dk ? "text-white/25" : "text-gray-400"}`}>Platform Score</span>
                                </div>
                                <h4 className={`text-[14px] font-bold truncate ${dk ? "text-gray-100" : "text-gray-900"}`}>{script.title}</h4>
                                {ps.scoredAt && (
                                  <p className={`text-[11px] mt-0.5 ${dk ? "text-gray-500" : "text-gray-400"}`}>
                                    Reviewed {new Date(ps.scoredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ color: gc, backgroundColor: gc + "22" }}>Grade {gl}</span>
                                <div className="text-right">
                                  <span className="text-[28px] font-black tabular-nums leading-none" style={{ color: gc }}>{ov}</span>
                                  <span className={`text-[10px] block font-semibold ${dk ? "text-gray-500" : "text-gray-400"}`}>/ 100</span>
                                </div>
                              </div>
                            </div>
                            {/* Score bars */}
                            <div className={`px-5 py-5 space-y-3.5 ${dk ? "bg-[#0a1628]/40" : "bg-white"}`}>
                              {psDims.map(d => {
                                const val = ps[d.key] ?? 0;
                                const pct = Math.min(100, Math.max(0, val));
                                return (
                                  <div key={d.key} className="flex items-center gap-3">
                                    <span className={`text-[12px] font-semibold shrink-0 w-[100px] ${dk ? "text-gray-400" : "text-gray-500"}`}>{d.label}</span>
                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: d.track }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: d.color }}
                                      />
                                    </div>
                                    <span className="text-[13px] font-black tabular-nums w-16 text-right" style={{ color: d.color }}>
                                      {val}<span className={`text-[10px] font-normal ${dk ? "text-gray-600" : "text-gray-300"}`}>/100</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Admin feedback */}
                            {ps.feedback && (
                              <div className={`px-5 py-3.5 border-t text-[12px] leading-relaxed ${dk ? "border-white/[0.06] bg-[#0a1628]/60 text-gray-400" : "border-gray-100 bg-gray-50/60 text-gray-500"}`}>
                                <span className={`font-semibold mr-1.5 ${dk ? "text-gray-300" : "text-gray-700"}`}>Feedback:</span>
                                {ps.feedback}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── 4. AI Analysis ── */}
                      {score.feedback && (
                        <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                          {/* Header */}
                          <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${dk ? "border-white/[0.06]" : "border-gray-100"}`}>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${dk ? "bg-violet-400/10 border-violet-400/20 text-violet-300" : "bg-violet-50 border-violet-200 text-violet-700"}`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                              </svg>
                              AI Analysis
                            </span>
                            <span className={`ml-auto text-[10px] font-medium ${dk ? "text-white/20" : "text-gray-300"}`}>Powered by Gemini AI</span>
                          </div>

                          {/* Main Feedback */}
                          <div className="px-5 pt-4 pb-2">
                            <p className={`text-sm leading-relaxed ${dk ? "text-white/70" : "text-gray-600"}`}>{score.feedback}</p>
                          </div>

                          {/* Strengths */}
                          {Array.isArray(score.strengths) && score.strengths.length > 0 && (
                            <div className={`mx-5 mb-3 rounded-xl border p-4 ${dk ? "bg-emerald-400/[0.05] border-emerald-400/15" : "bg-emerald-50 border-emerald-100"}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${dk ? "text-emerald-400" : "text-emerald-600"}`}>Strengths</p>
                              <ul className="space-y-1.5">
                                {score.strengths.map((s, i) => (
                                  <li key={i} className={`flex items-start gap-2 text-sm ${dk ? "text-white/65" : "text-gray-600"}`}>
                                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${dk ? "bg-emerald-400/20" : "bg-emerald-100"}`}>
                                      <svg className={`w-2.5 h-2.5 ${dk ? "text-emerald-300" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    </span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Weaknesses */}
                          {Array.isArray(score.weaknesses) && score.weaknesses.length > 0 && (
                            <div className={`mx-5 mb-3 rounded-xl border p-4 ${dk ? "bg-amber-400/[0.05] border-amber-400/15" : "bg-amber-50 border-amber-100"}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${dk ? "text-amber-400" : "text-amber-600"}`}>Areas for Improvement</p>
                              <ul className="space-y-1.5">
                                {score.weaknesses.map((w, i) => (
                                  <li key={i} className={`flex items-start gap-2 text-sm ${dk ? "text-white/65" : "text-gray-600"}`}>
                                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${dk ? "bg-amber-400/20" : "bg-amber-100"}`}>
                                      <svg className={`w-2.5 h-2.5 ${dk ? "text-amber-300" : "text-amber-600"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                                      </svg>
                                    </span>
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recommendations */}
                          {Array.isArray(score.improvements) && score.improvements.length > 0 && (
                            <div className={`mx-5 mb-3 rounded-xl border p-4 ${dk ? "bg-blue-400/[0.05] border-blue-400/15" : "bg-blue-50 border-blue-100"}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${dk ? "text-blue-400" : "text-blue-600"}`}>Recommendations</p>
                              <ul className="space-y-1.5">
                                {score.improvements.map((imp, i) => (
                                  <li key={i} className={`flex items-start gap-2 text-sm ${dk ? "text-white/65" : "text-gray-600"}`}>
                                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${dk ? "bg-blue-400/20" : "bg-blue-100"}`}>
                                      <span className={`text-[9px] font-bold ${dk ? "text-blue-300" : "text-blue-600"}`}>{i + 1}</span>
                                    </span>
                                    {imp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Audience Fit + Comparables */}
                          {(score.audienceFit || score.comparables) && (
                            <div className={`mx-5 mb-4 grid gap-3 ${score.audienceFit && score.comparables ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                              {score.audienceFit && (
                                <div className={`rounded-xl border p-3.5 ${dk ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-100 bg-gray-50"}`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? "text-white/30" : "text-gray-400"}`}>Audience &amp; Market</p>
                                  <p className={`text-xs leading-relaxed ${dk ? "text-white/60" : "text-gray-600"}`}>{score.audienceFit}</p>
                                </div>
                              )}
                              {score.comparables && (
                                <div className={`rounded-xl border p-3.5 ${dk ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-100 bg-gray-50"}`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? "text-white/30" : "text-gray-400"}`}>Comparable Titles</p>
                                  <p className={`text-xs leading-relaxed ${dk ? "text-white/60" : "text-gray-600"}`}>{score.comparables}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── 4. Platform Editorial Sections ── */}
                      {(() => {
                        const ps = script.platformScore || {};
                        const sections = [
                          { key: "strengths", label: "Strengths", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", band: dk ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
                          { key: "weaknesses", label: "Weaknesses", icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z", band: dk ? "bg-red-400/10 border-red-400/20 text-red-300" : "bg-red-50 border-red-200 text-red-700" },
                          { key: "prospects", label: "Prospects", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", band: dk ? "bg-indigo-400/10 border-indigo-400/20 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700" },
                        ];
                        return (
                          <div className="space-y-3">
                            {sections.map(s => (
                              <div key={s.key} className={`rounded-2xl border overflow-hidden ${t.card}`}>
                                <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${dk ? "border-white/[0.06]" : "border-gray-100"}`}>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.band}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                                    </svg>
                                    {s.label}
                                  </span>
                                  <span className={`ml-auto text-[10px] font-medium ${dk ? "text-white/20" : "text-gray-300"}`}>Platform Editorial</span>
                                </div>
                                <div className="px-5 py-4">
                                  {ps[s.key] ? (
                                    <p className={`text-sm leading-relaxed whitespace-pre-line ${dk ? "text-white/65" : "text-gray-600"}`}>{ps[s.key]}</p>
                                  ) : (
                                    <p className={`text-sm italic ${dk ? "text-white/20" : "text-gray-300"}`}>Not yet reviewed by the platform.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className={`text-center py-16 rounded-2xl border ${t.card}`}>
                      <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${dk ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                        <svg className={`w-6 h-6 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                      </div>
                      <h3 className={`text-base font-bold mb-1.5 ${t.title}`}>No Evaluation Yet</h3>
                      <p className={`text-sm mb-5 max-w-xs mx-auto ${t.muted}`}>
                        {isOwner ? "Get an AI-powered score across 5 dimensions with detailed feedback." : "This project hasn't been evaluated yet."}
                      </p>
                      {isOwner && (
                        <button onClick={handleGenerateScore} disabled={scoreLoading}
                          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 inline-flex items-center gap-2 ${t.btnPrim}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          {scoreLoading ? "Evaluating…" : "Get Evaluation — 10 credits"}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })()}

            {/* ── Roles ────────────────────────────────────── */}
            {activeTab === "roles" && (
              <motion.div key="roles" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                {script.roles?.length > 0 ? (
                  script.roles.map((role) => (
                    <div key={role._id} className={`rounded-xl border p-5 transition ${t.card} ${t.cardHov}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`text-base font-bold tracking-tight ${t.title}`}>{role.characterName}</h3>
                        {role.gender && (
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${isDarkMode ? "bg-white/[0.04] text-neutral-500 border-white/[0.06]" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {role.gender}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-semibold mb-1.5 ${t.sub}`}>{role.type}</p>
                      {role.description && <p className={`text-sm leading-relaxed mb-3 ${t.muted}`}>{role.description}</p>}
                      {role.ageRange && <span className={`text-xs font-medium ${t.muted}`}>Age: {role.ageRange.min}&ndash;{role.ageRange.max}</span>}
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-16 rounded-xl border ${t.card}`}>
                    <h3 className={`text-base font-bold mb-1 ${t.title}`}>No Roles Defined</h3>
                    <p className={`text-sm ${t.muted}`}>{isOwner ? "Add character roles to attract talent" : "No roles have been added yet"}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Full Script (owner or purchased) ────────── */}
            {activeTab === "content" && (isOwner || script.isUnlocked) && (
              <motion.div key="content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className={`flex items-center justify-between mb-4 rounded-xl border px-5 py-3 ${t.card}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white/[0.05]" : "bg-gray-100"}`}>
                      <Film size={16} className={t.muted} />
                    </div>
                    <div>
                      <p className={`text-[13px] font-bold ${t.title}`}>{script.title}</p>
                      <p className={`text-[11px] ${t.muted}`}>
                        {(() => {
                          const raw = script.textContent || "";
                          const plain = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                          const words = plain.split(" ").filter(Boolean).length;
                          const pages = script.pageCount || Math.ceil(words / 250);
                          return `${words.toLocaleString()} words \u00B7 ~${pages} pages`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const raw = script.textContent || "";
                        const plain = raw.replace(/<[^>]*>/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
                        navigator.clipboard.writeText(plain);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? "bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={handlePrint}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? "bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print
                    </button>
                    <button
                      onClick={handleDownload}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? "bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>

                <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                  <div className="max-w-2xl mx-auto px-8 py-10 sm:px-16">
                    <div className={`text-center mb-10 pb-8 border-b ${t.divider}`}>
                      <h2 className={`text-2xl font-bold tracking-tight mb-1 ${t.title}`}>{script.title}</h2>
                      {script.format && <p className={`text-[11px] font-bold uppercase tracking-widest ${t.muted}`}>{fmtFormat(script.format)}</p>}
                    </div>
                    {(script.textContent || "").startsWith("<") ? (
                      <div className="script-content" dangerouslySetInnerHTML={{ __html: script.textContent }} />
                    ) : (
                      <pre className={`whitespace-pre-wrap text-[14px] leading-relaxed ${t.sub}`}
                        style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}>
                        {script.textContent}
                      </pre>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div className={`mt-3 flex items-center justify-center gap-2 text-[11px] ${t.muted}`}>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    This content is private and only visible to you as the creator
                  </div>
                )}
                {!isOwner && script.isUnlocked && (
                  <div className="mt-4 space-y-2">
                    <div className={`flex items-center justify-center gap-2 text-[11px] text-emerald-500`}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Full script unlocked — purchased on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    {user?.role === "investor" && script.creator?._id && (
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            navigate(
                              `/messages?recipientId=${script.creator._id}&recipientName=${encodeURIComponent(script.creator.name || "Writer")}`
                            )
                          }
                          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border transition ${t.btnSec}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Message Writer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Synopsis ─────────────────────────────────── */}
            {activeTab === "synopsis" && (
              <motion.div key="synopsis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`rounded-xl border p-6 ${t.card}`}>
                {script.synopsis ? (
                  <>
                    <h3 className={`text-lg font-extrabold mb-4 tracking-tight ${t.title}`}>Synopsis</h3>
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap mb-6 ${t.sub}`}>{script.synopsis}</p>
                    {script.isSynopsisLocked && (
                      <div className={`pt-5 border-t ${t.divider}`}>
                        <div className={`rounded-xl p-6 text-center border ${t.inset}`}>
                          <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 ${isDarkMode ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                            <svg className={`w-5 h-5 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          </div>
                          <h4 className={`text-base font-bold mb-2 ${t.title}`}>Full Synopsis Locked</h4>
                          {script.isWriter ? (
                            <p className={`text-sm ${t.muted}`}>Writers cannot purchase synopsis access. Only industry professionals can unlock full scripts.</p>
                          ) : script.canPurchase ? (
                            <div>
                              <p className={`text-sm mb-4 ${t.muted}`}>Submit a purchase request to the writer. Once approved, you'll get full access to this script.</p>
                              {script.isUnlocked ? (
                                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Access Granted
                                </div>
                              ) : script.myPendingRequest ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-sm font-semibold">
                                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Request Pending — Awaiting Writer Approval
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowRequestModal(true)}
                                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${t.btnPrim}`}
                                >
                                  {script.price > 0 ? `Request to Purchase — $${script.price}` : "Request Access"}
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className={`text-sm ${t.muted}`}>Sign in as a producer or director to unlock.</p>
                          )}
                        </div>
                      </div>
                    )}
                    {!script.isSynopsisLocked && !script.isCreator && (
                      <div className="mt-4 flex items-center gap-2 text-emerald-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold">Full synopsis unlocked</span>
                      </div>
                    )}
                    {/* Creator: pending purchase requests for this script */}
                    {script.isCreator && script.pendingRequestsCount > 0 && (
                      <div className={`mt-5 pt-5 border-t ${t.divider}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`text-sm font-bold ${t.title}`}>
                            Purchase Requests
                            <span className="ml-2 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full w-5 h-5 font-bold">
                              {script.pendingRequestsCount}
                            </span>
                          </h4>
                        </div>
                        {pendingReqLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                            Loading requests...
                          </div>
                        ) : pendingRequests.length === 0 ? (
                          <p className={`text-xs ${t.muted}`}>No pending requests.</p>
                        ) : (
                          <div className="space-y-3">
                            {pendingRequests.map((pr) => (
                              <div key={pr._id} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${t.inset}`}>
                                {pr.investor?.profileImage ? (
                                  <img src={pr.investor.profileImage} alt={pr.investor.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">{pr.investor?.name?.charAt(0)?.toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${t.title}`}>{pr.investor?.name}</p>
                                  <p className={`text-xs ${t.muted}`}>
                                    {pr.amount > 0 ? `$${pr.amount} offered` : "Free access request"}
                                    {" · "}
                                    {new Date(pr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleApproveRequest(pr._id)}
                                    disabled={pendingReqActionId === pr._id}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                                  >
                                    {pendingReqActionId === pr._id ? "..." : "Approve"}
                                  </button>
                                  <button
                                    onClick={() => setRejectNoteModal({ id: pr._id, investorName: pr.investor?.name })}
                                    disabled={pendingReqActionId === pr._id}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold transition disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <h3 className={`text-base font-bold mb-1 ${t.title}`}>No Synopsis Available</h3>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ══════════════  MODALS  ═════════════════════════════ */}

      {/* Purchase Request confirmation modal */}
      {showRequestModal && script && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !requestLoading && setShowRequestModal(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${t.card}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className={`text-lg font-extrabold text-center mb-1 ${t.title}`}>Request to Purchase</h2>
            <p className={`text-sm text-center mb-4 ${t.muted}`}>
              You are requesting to purchase{" "}
              <span className={`font-semibold ${t.sub}`}>"{script.title}"</span>.
              {script.price > 0
                ? ` You will be contacted to complete payment of $${script.price} once the writer approves.`
                : " The writer will be notified and can approve your access."}
            </p>
            <div className={`rounded-xl border px-4 py-3 mb-4 text-center ${t.inset}`}>
              <p className={`text-xs ${t.muted}`}>Amount</p>
              <p className={`text-2xl font-bold mt-1 ${t.title}`}>{script.price > 0 ? `$${script.price}` : "Free"}</p>
              {script.price > 0 && <p className={`text-xs ${t.muted} mt-0.5`}>Payment collected after writer approves</p>}
            </div>
            <button
              onClick={handleRequestPurchase}
              disabled={requestLoading}
              className={`w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 ${t.btnPrim}`}
            >
              {requestLoading ? "Submitting..." : "Submit Request"}
            </button>
            <button
              onClick={() => setShowRequestModal(false)}
              disabled={requestLoading}
              className={`w-full mt-2 py-2.5 rounded-xl text-sm font-medium border ${t.divider} ${t.muted} hover:opacity-70 transition`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Decline request modal (for creator on this script) */}
      {rejectNoteModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPendingReqActionId(null) || setRejectNoteModal(null)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${t.card}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-base font-bold mb-1 ${t.title}`}>Decline Purchase Request</h3>
            <p className={`text-sm mb-4 ${t.muted}`}>
              Declining <strong>{rejectNoteModal.investorName}</strong>'s request. Their reserved funds will be returned.
            </p>
            <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Reason (optional)</label>
            <textarea
              rows={3}
              className={`w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${t.inset} ${t.sub}`}
              placeholder="Let the investor know why you're declining..."
              value={rejectNoteText}
              onChange={(e) => setRejectNoteText(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectNoteModal(null); setRejectNoteText(""); }}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${t.muted} ${t.divider} hover:opacity-70 transition`}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequestSubmit}
                disabled={pendingReqActionId === rejectNoteModal.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {pendingReqActionId === rejectNoteModal.id ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trailer modal */}
      {showTrailer && (script.trailerUrl || script.uploadedTrailerUrl) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTrailer(false)}>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowTrailer(false)} className="w-8 h-8 rounded-lg bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition">
                &#10005;
              </button>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl">
              <video
                src={script.trailerSource === "uploaded" ? script.uploadedTrailerUrl : script.trailerUrl}
                poster={script.trailerThumbnail ? resolveImage(script.trailerThumbnail) : undefined}
                controls
                autoPlay
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !deleteLoading && setShowDeleteModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${t.card}`}>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <h2 className={`text-lg font-extrabold mb-1 tracking-tight text-center ${t.title}`}>Delete Project?</h2>
              <p className={`text-sm mb-1 text-center ${t.muted}`}>
                &ldquo;<span className={`font-semibold ${t.sub}`}>{script.title}</span>&rdquo; will be removed from your profile and all listings.
              </p>
              <p className={`text-xs text-center mb-6 ${t.label}`}>Uploaded files are kept in storage. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 border ${t.btnSec}`}>
                  Cancel
                </button>
                <button onClick={handleDeleteScript} disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Deleting...</>
                  ) : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold modal */}
      <RazorpayScriptPayment
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        script={script}
        type="hold"
        onSuccess={handlePaymentSuccess}
      />

      {/* Purchase modal */}
      <RazorpayScriptPayment
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        script={script}
        type="purchase"
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default ScriptDetail;
