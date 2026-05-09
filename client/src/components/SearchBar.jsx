import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useDarkMode } from "../context/DarkModeContext";
import { getScriptCanonicalPath } from "../utils/scriptPath";

const SearchBar = ({ className = "", variant = "hero" }) => {
  const { isDarkMode: dark } = useDarkMode();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleChange = (val) => {
    setQuery(val);
    clearTimeout(timer.current);
    if (val.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/scripts/reader-search?q=${encodeURIComponent(val)}&limit=6`);
        setSuggestions(data.scripts || data);
        setOpen(true);
      } catch { setSuggestions([]); }
    }, 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/reader/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search scripts by title, genre, or keyword..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            className={`app-search-input ${dark ? "app-search-input-dark" : ""} w-full pl-11 pr-4 py-3.5 border rounded-xl placeholder-gray-300 outline-none transition-all text-sm font-normal shadow-sm ${dark ? "bg-[#101e30] border-[#1d3350] text-gray-200 !text-white placeholder:!text-slate-400 focus:border-[#244060] focus:ring-2 focus:ring-white/5" : "bg-white border-gray-200 text-gray-700 focus:border-gray-300 focus:ring-2 focus:ring-gray-100"}`}
          />
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className={`absolute top-full mt-2 w-full rounded-xl shadow-lg border overflow-hidden z-50 max-h-80 overflow-y-auto ${dark ? "bg-[#101e30] border-[#182840] shadow-black/30" : "bg-white border-gray-100 shadow-gray-200/50"}`}>
          {suggestions.map((s) => (
            <button
              key={s._id}
              onClick={() => { navigate(getScriptCanonicalPath(s)); setOpen(false); setQuery(""); }}
              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b last:border-b-0 ${dark ? "hover:bg-white/[0.04] border-[#182840]" : "hover:bg-gray-50 border-gray-50"}`}
            >
              {s.coverImage ? (
                <img src={s.coverImage} alt="" className="w-9 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className={`w-9 h-12 rounded-lg shrink-0 flex items-center justify-center border ${dark ? "bg-white/[0.04] border-[#1d3350]" : "bg-gray-50 border-gray-100"}`}>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${dark ? "text-gray-200" : "text-gray-800"}`}>{s.title}</p>
                <p className="text-xs text-gray-400 font-normal">{s.creator?.name} · {s.genre || s.contentType}</p>
              </div>
              {s.rating > 0 && (
                <span className="text-xs font-medium text-gray-500 flex items-center gap-0.5 shrink-0">
                  <svg className="w-3 h-3 fill-amber-400 text-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  {s.rating.toFixed(1)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
