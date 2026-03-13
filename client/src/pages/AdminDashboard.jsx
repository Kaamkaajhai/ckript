import { useState, useEffect } from "react";
import { useDarkMode } from "../context/DarkModeContext";
import axios from "axios";
import BrandLogo from "../components/BrandLogo";

// Admin-specific API — uses admin token from sessionStorage, separate from user session
const adminApi = axios.create({ baseURL: "http://localhost:5001/api" });
adminApi.interceptors.request.use((config) => {
    const adminSession = sessionStorage.getItem("admin-session");
    if (adminSession) {
        try {
            const { token } = JSON.parse(adminSession);
            if (token) config.headers.Authorization = `Bearer ${token}`;
        } catch { }
    }
    return config;
});

const TABS = [
    { key: "overview", label: "Overview", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
    { key: "investors", label: "Investors", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { key: "writers", label: "Writers", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" },
    { key: "readers", label: "Readers", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" },
    { key: "projects", label: "Projects", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
    { key: "ai-usage", label: "AI Usage", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" },
    { key: "evaluations", label: "Evaluations", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
    { key: "investor-purchases", label: "Purchases", icon: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" },
    { key: "payments", label: "Payments", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" },
    { key: "scores", label: "Scores", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" },
    { key: "approvals", label: "Approvals", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { key: "trailers", label: "AI Trailers", icon: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375V5.625A1.125 1.125 0 016 4.5h12a1.125 1.125 0 011.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125h1.5" },
    { key: "pending-investors", label: "Investor Requests", icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" },
    { key: "queries", label: "Queries", icon: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" },
];

const Icon = ({ d, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

// ─── Stat Card ───
const StatCard = ({ label, value, icon, color, isDark }) => (
    <div className={`rounded-2xl p-5 border transition-all hover:scale-[1.02] ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon d={icon} className="w-5 h-5" />
            </div>
        </div>
        <p className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
        <p className={`text-sm font-medium mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
    </div>
);

// ─── User Table ───
const UserTable = ({ users, isDark, onLoginAs, roleLabel }) => (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>User</th>
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Email</th>
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Role</th>
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Joined</th>
                        {onLoginAs && <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Actions</th>}
                    </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                    {users.map((u) => (
                        <tr key={u._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    {u.profileImage ? (
                                        <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-[#1e3a5f]/10 text-[#1e3a5f]"}`}>
                                            {u.name?.charAt(0)?.toUpperCase() || "?"}
                                        </div>
                                    )}
                                    <span className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{u.name}</span>
                                </div>
                            </td>
                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{u.email}</td>
                            <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${u.role === "investor" ? "bg-emerald-100 text-emerald-700" :
                                    u.role === "writer" || u.role === "creator" ? "bg-blue-100 text-blue-700" :
                                        "bg-purple-100 text-purple-700"
                                    }`}>{u.role}</span>
                            </td>
                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(u.createdAt).toLocaleDateString()}</td>
                            {onLoginAs && (
                                <td className="px-5 py-3.5">
                                    <button onClick={() => onLoginAs(u._id)} className="text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-500/10">Login As</button>
                                </td>
                            )}
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr><td colSpan={5} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No users found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── Script Table ───
const ScriptTable = ({ scripts, isDark, actions, showScore, showCreator = true }) => (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Title</th>
                        {showCreator && <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Creator</th>}
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Genre</th>
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Status</th>
                        {showScore && <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Score</th>}
                        <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Date</th>
                        {actions && <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>Actions</th>}
                    </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                    {scripts.map((s) => (
                        <tr key={s._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                            <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{s.title}</td>
                            {showCreator && (
                                <td className="px-5 py-3.5">
                                    <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{s.creator?.name || "—"}</span>
                                </td>
                            )}
                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{s.genre || s.primaryGenre || "—"}</td>
                            <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.status === "published" ? "bg-emerald-100 text-emerald-700" :
                                    s.status === "pending_approval" ? "bg-amber-100 text-amber-700" :
                                        s.status === "rejected" ? "bg-red-100 text-red-700" :
                                            "bg-gray-100 text-gray-600"
                                    }`}>{s.status?.replace("_", " ") || "draft"}</span>
                            </td>
                            {showScore && (
                                <td className={`px-5 py-3.5 text-sm font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                                    {s.scriptScore?.overall || s.platformScore?.overall || s.rating || "—"}
                                </td>
                            )}
                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(s.createdAt).toLocaleDateString()}</td>
                            {actions && <td className="px-5 py-3.5">{actions(s)}</td>}
                        </tr>
                    ))}
                    {scripts.length === 0 && (
                        <tr><td colSpan={7} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No scripts found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── Transaction Table ───
const TransactionTable = ({ transactions, isDark }) => (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                        {["User", "Type", "Amount", "Status", "Description", "Date"].map((h) => (
                            <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                    {transactions.map((t) => (
                        <tr key={t._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                            <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{t.user?.name || "—"}</td>
                            <td className="px-5 py-3.5"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${t.type === "credit" || t.type === "payment" ? "bg-emerald-100 text-emerald-700" : t.type === "debit" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{t.type}</span></td>
                            <td className={`px-5 py-3.5 text-sm font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>${t.amount?.toFixed(2)}</td>
                            <td className="px-5 py-3.5"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${t.status === "completed" ? "bg-emerald-100 text-emerald-700" : t.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{t.status}</span></td>
                            <td className={`px-5 py-3.5 text-sm max-w-[200px] truncate ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t.description}</td>
                            <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr><td colSpan={6} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No transactions found</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── Score Modal ───
const ScoreModal = ({ script, isDark, onClose, onSave }) => {
    const [scores, setScores] = useState({ content: 0, trailer: 0, title: 0, synopsis: 0, tags: 0, feedback: "", strengths: "", weaknesses: "", prospects: "" });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(script._id, scores);
        setSaving(false);
        onClose();
    };

    const dims = [
        { key: "content", label: "Main Content", color: "from-blue-500 to-cyan-500" },
        { key: "trailer", label: "Trailer", color: "from-purple-500 to-pink-500" },
        { key: "title", label: "Title", color: "from-amber-500 to-orange-500" },
        { key: "synopsis", label: "Synopsis", color: "from-emerald-500 to-teal-500" },
        { key: "tags", label: "Tags & Meta", color: "from-rose-500 to-red-500" },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className={`w-full max-w-lg mx-4 rounded-2xl p-6 max-h-[90vh] overflow-y-auto ${isDark ? "bg-[#0f1d35] border border-[#1a3050]" : "bg-white shadow-2xl"}`} onClick={(e) => e.stopPropagation()}>
                <h3 className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Score: {script?.title}</h3>
                <p className={`text-sm mb-5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>Rate each dimension from 0 to 100</p>
                <div className="space-y-4">
                    {dims.map((d) => (
                        <div key={d.key}>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{d.label}</label>
                                <span className={`text-sm font-bold ${isDark ? "text-blue-400" : "text-blue-600"}`}>{scores[d.key]}</span>
                            </div>
                            <input type="range" min="0" max="100" value={scores[d.key]}
                                onChange={(e) => setScores((p) => ({ ...p, [d.key]: Number(e.target.value) }))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-500"
                                style={{ background: `linear-gradient(to right, #3b82f6 ${scores[d.key]}%, ${isDark ? "#1a3050" : "#e5e7eb"} ${scores[d.key]}%)` }}
                            />
                        </div>
                    ))}
                    <div>
                        <label className={`text-sm font-semibold block mb-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Feedback</label>
                        <textarea rows={3} value={scores.feedback} onChange={(e) => setScores((p) => ({ ...p, feedback: e.target.value }))}
                            className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none border ${isDark ? "bg-[#0b1426] border-[#1a3050] text-gray-200 focus:border-blue-500/50" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-400"}`}
                            placeholder="Write your feedback..."
                        />
                    </div>
                    {[{ key: "strengths", label: "Strengths", placeholder: "What are the script's strongest elements?" }, { key: "weaknesses", label: "Weaknesses", placeholder: "What areas need improvement?" }, { key: "prospects", label: "Prospects", placeholder: "Commercial potential, market fit, next steps..." }].map(({ key, label, placeholder }) => (
                        <div key={key}>
                            <label className={`text-sm font-semibold block mb-1.5 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{label}</label>
                            <textarea rows={4} value={scores[key]} onChange={(e) => setScores((p) => ({ ...p, [key]: e.target.value }))}
                                className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none border ${isDark ? "bg-[#0b1426] border-[#1a3050] text-gray-200 focus:border-blue-500/50" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-400"}`}
                                placeholder={placeholder}
                            />
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-end gap-3 mt-5">
                    <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:bg-[#1a3050]" : "text-gray-500 hover:bg-gray-100"}`}>Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50">
                        {saving ? "Saving..." : "Save Score"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Search Bar ───
const SearchBar = ({ value, onChange, placeholder, isDark }) => (
    <div className={`flex items-center rounded-xl overflow-hidden border ${isDark ? "bg-[#0b1426] border-[#1a3050]" : "bg-gray-50 border-gray-200"}`}>
        <div className="pl-3.5">
            <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" className={`w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
        </div>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Search..."} className={`flex-1 px-3 py-2.5 text-sm font-medium outline-none bg-transparent ${isDark ? "text-gray-200 placeholder-gray-500" : "text-gray-800 placeholder-gray-400"}`} />
    </div>
);

// ─── Pagination ───
const Pagination = ({ page, totalPages, onPageChange, isDark }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-30 ${isDark ? "text-gray-400 hover:bg-[#1a3050]" : "text-gray-500 hover:bg-gray-100"}`}>Prev</button>
            <span className={`text-sm font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{page} / {totalPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-30 ${isDark ? "text-gray-400 hover:bg-[#1a3050]" : "text-gray-500 hover:bg-gray-100"}`}>Next</button>
        </div>
    );
};

// ═══════════════════════════════════════════════
// Main Admin Dashboard
// ═══════════════════════════════════════════════
const ADMIN_CODE = "24062004";

const AdminDashboard = () => {
    const { isDarkMode: isDark } = useDarkMode();
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(false);

    // ─── Code Gate — always prompt on every visit ───
    const [authorized, setAuthorized] = useState(false);
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState("");
    const [codeLoading, setCodeLoading] = useState(false);

    // ─── Data state ───
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [scripts, setScripts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [scoreModal, setScoreModal] = useState(null);
    const [scoreSubTab, setScoreSubTab] = useState("ai");
    const [total, setTotal] = useState(0);
    const [pendingInvestors, setPendingInvestors] = useState([]);
    const [rejectModal, setRejectModal] = useState(null); // investor object
    const [contacts, setContacts] = useState([]);

    // ─── Toast notification system ───
    const [toast, setToast] = useState(null);
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ─── Fetch data function ───
    const fetchData = async () => {
        if (!authorized) return;
        setLoading(true);
        try {
            switch (activeTab) {
                case "overview": {
                    const { data } = await adminApi.get("/admin/stats");
                    setStats(data);
                    break;
                }
                case "investors": {
                    const { data } = await adminApi.get(`/admin/users?role=investor&page=${page}&search=${search}`);
                    setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "writers": {
                    const { data } = await adminApi.get(`/admin/users?role=writer&page=${page}&search=${search}`);
                    const { data: data2 } = await adminApi.get(`/admin/users?role=creator&page=${page}&search=${search}`);
                    setUsers([...data.users, ...data2.users]); setTotalPages(Math.max(data.totalPages, data2.totalPages)); setTotal(data.total + data2.total);
                    break;
                }
                case "readers": {
                    const { data } = await adminApi.get(`/admin/users?role=reader&page=${page}&search=${search}`);
                    setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "projects": {
                    const { data } = await adminApi.get(`/admin/scripts?page=${page}&search=${search}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "ai-usage": {
                    const { data } = await adminApi.get(`/admin/scripts/ai-usage?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "evaluations": {
                    const { data } = await adminApi.get(`/admin/scripts/evaluation-purchases?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "investor-purchases": {
                    const { data } = await adminApi.get(`/admin/scripts/investor-purchases?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "payments": {
                    const { data } = await adminApi.get(`/admin/payments?page=${page}`);
                    setTransactions(data.transactions); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "scores": {
                    const endpoint = scoreSubTab === "ai" ? "/admin/scores/ai" : scoreSubTab === "platform" ? "/admin/scores/platform" : "/admin/scores/reader";
                    const { data } = await adminApi.get(`${endpoint}?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "approvals": {
                    const { data } = await adminApi.get(`/admin/scripts/pending?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "trailers": {
                    const { data } = await adminApi.get(`/admin/scripts/trailer-requests?page=${page}`);
                    setScripts(data.scripts); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "pending-investors": {
                    const { data } = await adminApi.get(`/admin/investors/pending?page=${page}`);
                    setPendingInvestors(data.investors); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
                case "queries": {
                    const { data } = await adminApi.get(`/admin/queries?page=${page}`);
                    setContacts(data.submissions); setTotalPages(data.totalPages); setTotal(data.total);
                    break;
                }
            }
        } catch (err) {
            console.error("Admin fetch error:", err);
            if (err.response?.status === 401) {
                sessionStorage.removeItem("admin-session");
                setAuthorized(false);
                showToast("Session expired. Please re-enter the access code.", "error");
            }
        }
        setLoading(false);
    };

    // ─── Effects ───
    useEffect(() => { if (authorized) { setPage(1); setSearch(""); } }, [activeTab, authorized]);
    useEffect(() => { if (authorized) fetchData(); }, [activeTab, page, scoreSubTab, authorized]);
    useEffect(() => {
        if (!authorized) return;
        const t = setTimeout(() => { if (search !== undefined) { setPage(1); fetchData(); } }, 400);
        return () => clearTimeout(t);
    }, [search, authorized]);

    // ─── Action handlers (all use adminApi) ───
    const handleApprove = async (id) => {
        try {
            await adminApi.put(`/admin/scripts/${id}/approve`);
            showToast("Script approved and published successfully");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to approve script", "error");
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt("Rejection reason (optional — the writer will see this):");
        if (reason === null) return; // cancelled
        try {
            await adminApi.put(`/admin/scripts/${id}/reject`, { reason: reason.trim() || undefined });
            showToast("Script rejected");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to reject script", "error");
        }
    };

    const handleScore = async (id, scores) => {
        try {
            await adminApi.put(`/admin/scripts/${id}/score`, scores);
            showToast("Platform score saved successfully");
            setScoreModal(null);
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to save score", "error");
        }
    };

    const handleTrailerApprove = async (id) => {
        try {
            await adminApi.put(`/admin/scripts/${id}/trailer-approve`);
            showToast("Trailer approved and published");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to approve trailer", "error");
        }
    };

    const handleApproveInvestor = async (id) => {
        try {
            await adminApi.put(`/admin/investors/${id}/approve`);
            showToast("Investor approved — they can now log in");
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to approve investor", "error");
        }
    };

    const handleRejectInvestor = async (id, note) => {
        try {
            await adminApi.put(`/admin/investors/${id}/reject`, { note });
            showToast("Investor rejected");
            setRejectModal(null);
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to reject investor", "error");
        }
    };

    const handleLoginAs = async (userId) => {
        try {
            const { data } = await adminApi.post(`/admin/login-as/${userId}`);
            const encoded = encodeURIComponent(JSON.stringify(data));
            window.open(`/dashboard?adminLogin=${encoded}`, "_blank");
            showToast(`Opened session as ${data.name || data.email}`);
        } catch (err) {
            console.error(err);
            showToast("Failed to login as user", "error");
        }
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setCodeError("");
        if (codeInput !== ADMIN_CODE) {
            setCodeError("Invalid access code");
            return;
        }
        setCodeLoading(true);
        try {
            // Login as admin — store token ONLY in sessionStorage (does NOT affect user's localStorage session)
            const { data } = await axios.post("http://localhost:5001/api/auth/login", { email: "admin@ckript.com", password: "admin123" });
            sessionStorage.setItem("admin-session", JSON.stringify(data));
            setAuthorized(true);
        } catch {
            setCodeError("Admin login failed. Make sure admin account exists (run: node seedAdmin.js).");
        }
        setCodeLoading(false);
    };

    const handleLogout = () => {
        sessionStorage.removeItem("admin-session");
        setAuthorized(false);
    };

    // ═══════════════════════════════════════════════
    // If not authorized, show code entry screen
    // ═══════════════════════════════════════════════
    if (!authorized) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#050d1a] via-[#0b1a30] to-[#0a1628]">
                <div className="w-full max-w-md mx-4 rounded-2xl p-8 border bg-[#0f1d35]/80 border-[#1a3050] backdrop-blur-xl shadow-2xl">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white">Admin Panel</h1>
                        <p className="text-sm mt-1 text-gray-500">Enter access code to continue</p>
                    </div>
                    <form onSubmit={handleCodeSubmit}>
                        <input
                            type="password"
                            value={codeInput}
                            onChange={(e) => { setCodeInput(e.target.value); setCodeError(""); }}
                            placeholder="Access Code"
                            autoFocus
                            className="w-full px-4 py-3.5 rounded-xl text-center text-lg font-bold tracking-[0.3em] outline-none border bg-[#0b1426] border-[#1a3050] text-white placeholder-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        {codeError && (
                            <p className="text-red-400 text-sm font-semibold mt-2 text-center">{codeError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={codeLoading || !codeInput}
                            className="w-full mt-4 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:shadow-blue-500/20"
                        >
                            {codeLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Verifying...
                                </span>
                            ) : "Access Admin Panel"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ─── Render Content ───
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
            );
        }

        switch (activeTab) {
            case "overview":
                if (!stats) return null;
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Platform Overview</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard isDark={isDark} label="Total Users" value={stats.totalUsers} icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" color="bg-blue-500/15 text-blue-500" />
                            <StatCard isDark={isDark} label="Total Scripts" value={stats.totalScripts} icon="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" color="bg-purple-500/15 text-purple-500" />
                            <StatCard isDark={isDark} label="Writers" value={stats.totalWriters} icon="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" color="bg-amber-500/15 text-amber-500" />
                            <StatCard isDark={isDark} label="Investors" value={stats.totalInvestors} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-emerald-500/15 text-emerald-500" />
                            <StatCard isDark={isDark} label="Readers" value={stats.totalReaders} icon="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" color="bg-cyan-500/15 text-cyan-500" />
                            <StatCard isDark={isDark} label="Pending Approvals" value={stats.pendingApprovals} icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-orange-500/15 text-orange-500" />
                            <StatCard isDark={isDark} label="Transactions" value={stats.totalTransactions} icon="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" color="bg-pink-500/15 text-pink-500" />
                            <StatCard isDark={isDark} label="Total Revenue" value={`$${stats.totalRevenue?.toFixed(2) || "0.00"}`} icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500/15 text-green-500" />
                        </div>
                    </div>
                );

            case "investors":
            case "writers":
            case "readers":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                {activeTab === "investors" ? "Investors" : activeTab === "writers" ? "Writers" : "Readers"}
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span>
                            </h2>
                            <div className="w-72"><SearchBar value={search} onChange={setSearch} placeholder={`Search ${activeTab}...`} isDark={isDark} /></div>
                        </div>
                        <UserTable users={users} isDark={isDark} onLoginAs={activeTab === "investors" ? handleLoginAs : null} roleLabel={activeTab} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "projects":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>All Projects<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span></h2>
                            <div className="w-72"><SearchBar value={search} onChange={setSearch} placeholder="Search projects..." isDark={isDark} /></div>
                        </div>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                                    <a href={`/script/${s._id}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "ai-usage":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>AI Usage in Projects<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span></h2>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={true} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "evaluations":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Evaluation Purchases<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span></h2>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={true} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "investor-purchases":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Investor Purchases<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span></h2>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={false}
                            actions={(s) => (
                                <div className="flex flex-wrap gap-1">
                                    {s.unlockedBy?.map((u) => (
                                        <span key={u._id || u} className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                                            {u.name || "Investor"}
                                        </span>
                                    ))}
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "payments":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>Payment Transactions<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span></h2>
                        <TransactionTable transactions={transactions} isDark={isDark} />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "scores":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Score Rankings</h2>
                            <div className={`flex rounded-xl overflow-hidden border ${isDark ? "border-[#1a3050] bg-[#0b1426]" : "border-gray-200 bg-gray-50"}`}>
                                {[{ k: "ai", l: "AI Scores" }, { k: "platform", l: "Platform" }, { k: "reader", l: "Reader" }].map((t) => (
                                    <button key={t.k} onClick={() => setScoreSubTab(t.k)}
                                        className={`px-4 py-2 text-sm font-bold transition-all ${scoreSubTab === t.k
                                            ? isDark ? "bg-blue-500/15 text-blue-400" : "bg-[#1e3a5f] text-white"
                                            : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                                            }`}>{t.l}</button>
                                ))}
                            </div>
                        </div>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={true}
                            actions={(s) => (
                                <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "approvals":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Pending Approvals
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span>
                            </h2>
                        </div>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={false}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleApprove(s._id)} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">✓ Approve</button>
                                    <button onClick={() => handleReject(s._id)} className="text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">✕ Reject</button>
                                    <button onClick={() => setScoreModal(s)} className="text-xs font-bold text-purple-500 hover:text-purple-400 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/10 transition-colors">Score</button>
                                    <a href={`/script/${s._id}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "trailers":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>AI Trailer Requests<span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span></h2>
                        </div>
                        <div className={`rounded-2xl border p-5 mb-5 ${isDark ? "bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20" : "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200/40"}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Icon d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
                                <h3 className={`text-sm font-bold ${isDark ? "text-purple-300" : "text-purple-800"}`}>AI Trailer Generation</h3>
                            </div>
                            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                This section shows projects that requested AI-generated trailers. The AI generation pipeline will be connected later.
                                For now, you can review requests and mark trailers as approved once they are ready.
                            </p>
                        </div>
                        <ScriptTable scripts={scripts} isDark={isDark} showScore={false}
                            actions={(s) => (
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.trailerStatus === "ready" ? "bg-emerald-100 text-emerald-700" :
                                        s.trailerStatus === "generating" ? "bg-amber-100 text-amber-700" :
                                            "bg-gray-100 text-gray-600"
                                        }`}>{s.trailerStatus || "none"}</span>
                                    {s.trailerStatus !== "ready" && (
                                        <button onClick={() => handleTrailerApprove(s._id)} className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">Approve</button>
                                    )}
                                    <a href={`/script/${s._id}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:text-blue-400 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors">View</a>
                                </div>
                            )}
                        />
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "pending-investors":
                return (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
                                Investor Account Requests
                                <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span>
                            </h2>
                        </div>
                        {pendingInvestors.length === 0 ? (
                            <div className={`rounded-2xl border p-12 text-center ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                                    <svg className={`w-6 h-6 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>No pending investor requests</p>
                            </div>
                        ) : (
                            <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Investor", "Email", "Signed Up", "Actions"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {pendingInvestors.map((inv) => (
                                            <tr key={inv._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {inv.profileImage ? (
                                                            <img src={inv.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
                                                                {inv.name?.charAt(0)?.toUpperCase() || "?"}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{inv.name}</p>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700`}>pending</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{inv.email}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleApproveInvestor(inv._id)}
                                                            className="text-xs font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors">
                                                            ✓ Approve
                                                        </button>
                                                        <button onClick={() => setRejectModal(inv)}
                                                            className="text-xs font-bold text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                                                            ✕ Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            case "queries":
                return (
                    <div>
                        <h2 className={`text-xl font-extrabold mb-5 ${isDark ? "text-white" : "text-gray-900"}`}>
                            Contact Queries
                            <span className={`ml-2 text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>({total})</span>
                        </h2>
                        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200/60 shadow-sm"}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? "bg-[#132744]" : "bg-gray-50"}>
                                            {["Name", "Email", "Reason", "Message", "Date"].map((h) => (
                                                <th key={h} className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? "divide-[#1a3050]" : "divide-gray-100"}`}>
                                        {contacts.map((c) => (
                                            <tr key={c._id} className={`transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50/50"}`}>
                                                <td className={`px-5 py-3.5 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{c.name}</td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{c.email}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        c.reason === "doubt" ? "bg-blue-100 text-blue-700" :
                                                        c.reason === "team" ? "bg-purple-100 text-purple-700" :
                                                        c.reason === "general" ? "bg-gray-100 text-gray-600" :
                                                        "bg-amber-100 text-amber-700"
                                                    }`}>
                                                        {c.reason === "doubt" ? "Question" : c.reason === "team" ? "Join Team" : c.reason === "general" ? "Feedback" : "Email"}
                                                    </span>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm max-w-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                                    <p className="line-clamp-2">{c.message}</p>
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>{new Date(c.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {contacts.length === 0 && (
                                            <tr><td colSpan={5} className={`px-5 py-10 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>No queries yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isDark={isDark} />
                    </div>
                );

            default:
                return null;
        }
    };

    // ─── Reject Investor Modal ───
    const RejectInvestorModal = ({ investor, onClose, onConfirm }) => {
        const [note, setNote] = useState("");
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div className={`w-full max-w-md mx-4 rounded-2xl p-6 ${isDark ? "bg-[#0f1d35] border border-[#1a3050]" : "bg-white shadow-2xl"}`} onClick={(e) => e.stopPropagation()}>
                    <h3 className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Reject Investor</h3>
                    <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Rejecting <strong>{investor.name}</strong> ({investor.email}). They will not be able to log in.<br />
                        Optionally add a reason (visible to the user on login attempt).
                    </p>
                    <textarea
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Rejection reason (optional)..."
                        className={`w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none border ${isDark ? "bg-[#0b1426] border-[#1a3050] text-gray-200 focus:border-red-500/50" : "bg-gray-50 border-gray-200 text-gray-800 focus:border-red-400"}`}
                    />
                    <div className="flex items-center justify-end gap-3 mt-4">
                        <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isDark ? "text-gray-400 hover:bg-[#1a3050]" : "text-gray-500 hover:bg-gray-100"}`}>Cancel</button>
                        <button onClick={() => onConfirm(investor._id, note.trim())}
                            className="px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 transition-all">
                            Confirm Reject
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#060e1a] text-white overflow-hidden">
            {/* ─── Admin Header ─── */}
            <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-[#1a3050] bg-[#0b1628]">
                <div className="flex items-center gap-3">
                    <BrandLogo className="h-9 w-auto" />
                    <div>
                        <h1 className="text-sm font-extrabold tracking-tight text-white">Ckript Admin</h1>
                        <p className="text-[10px] text-gray-500 font-medium -mt-0.5">Management Console</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden sm:block">Admin Mode</span>
                    <div className="w-px h-5 bg-[#1a3050] hidden sm:block"></div>
                    <button onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                        </svg>
                        Exit Admin
                    </button>
                </div>
            </header>

            {/* ─── Body ─── */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[#1a3050] bg-[#0b1628] overflow-y-auto">
                    <div className="px-3 pt-4 pb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 px-2">Navigation</p>
                    </div>
                    <nav className="flex-1 px-2 pb-4 space-y-0.5">
                        {TABS.map((tab) => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${activeTab === tab.key
                                    ? "bg-blue-500/15 text-blue-400"
                                    : "text-gray-400 hover:bg-[#132744] hover:text-gray-200"
                                    }`}>
                                <Icon d={tab.icon} className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Mobile tab bar */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1a3050] bg-[#0b1628]/95 backdrop-blur-md">
                    <div className="flex overflow-x-auto gap-1 p-1.5">
                        {TABS.map((tab) => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.key
                                    ? "bg-blue-500/15 text-blue-400"
                                    : "text-gray-500"
                                    }`}>{tab.label}</button>
                        ))}
                    </div>
                </div>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {renderContent()}
                </main>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] animate-[slideUp_0.3s_ease-out]">
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-sm ${toast.type === "error"
                        ? "bg-red-500/90 border-red-400/30 text-white"
                        : "bg-emerald-500/90 border-emerald-400/30 text-white"
                        }`}>
                        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d={
                                toast.type === "error"
                                    ? "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                    : "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            } />
                        </svg>
                        <span className="text-sm font-semibold">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Score Modal */}
            {scoreModal && <ScoreModal script={scoreModal} isDark={true} onClose={() => setScoreModal(null)} onSave={handleScore} />}

            {/* Reject Investor Modal */}
            {rejectModal && <RejectInvestorModal investor={rejectModal} onClose={() => setRejectModal(null)} onConfirm={handleRejectInvestor} />}
        </div>
    );
};

export default AdminDashboard;
