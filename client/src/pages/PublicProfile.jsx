import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useDarkMode } from "../context/DarkModeContext";
import { AuthContext } from "../context/AuthContext";
import publicApi from "../services/publicApi";
import { resolveMediaUrl } from "../utils/mediaUrl";

const formatIndustrySubRole = (value = "", otherValue = "") => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return "";
  if (normalized === "other") {
    const custom = String(otherValue || "").trim();
    return custom ? `Other (${custom})` : "Other";
  }

  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const isWriterRole = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "writer" || normalized === "creator";
};

const formatRepresentationStatus = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return "Unrepresented";
  if (normalized === "manager_and_agent") return "Manager & Agent";
  if (normalized === "manager") return "Manager";
  if (normalized === "agent") return "Agent";
  if (normalized === "unrepresented") return "Unrepresented";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const PublicProfile = () => {
  const { id } = useParams();
  const location = useLocation();
  const { isDarkMode: dark } = useDarkMode();
  const { loading: authLoading } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    const fetchPublicProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await publicApi.get(`/users/public/${id}`);
        if (cancelled) return;
        setProfile(data?.user || null);
        setScripts(Array.isArray(data?.scripts) ? data.scripts : []);
      } catch (err) {
        if (cancelled) return;
        const apiMessage = err?.response?.data?.message;
        setError(apiMessage || "This shared profile is unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) {
      fetchPublicProfile();
    } else {
      setLoading(false);
      setError("Invalid profile link.");
    }

    return () => {
      cancelled = true;
    };
  }, [authLoading, id]);

  const loginLink = useMemo(() => {
    const next = `${location.pathname}${location.search || ""}`;
    return `/login?next=${encodeURIComponent(next)}`;
  }, [location.pathname, location.search]);

  const memberSince = useMemo(() => {
    const raw = profile?.createdAt;
    if (!raw) return "";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [profile?.createdAt]);

  const writerLinks = profile?.writerProfile?.links || {};
  const writerPublicLinks = [
    { key: "portfolio", label: "Portfolio", value: writerLinks.portfolio },
    { key: "linkedin", label: "LinkedIn", value: writerLinks.linkedin },
    { key: "imdb", label: "IMDb", value: writerLinks.imdb },
    { key: "instagram", label: "Instagram", value: writerLinks.instagram },
    { key: "twitter", label: "Twitter", value: writerLinks.twitter },
    { key: "facebook", label: "Facebook", value: writerLinks.facebook },
  ].filter((item) => String(item.value || "").trim());

  const writerProfilePublic = isWriterRole(profile?.role);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-[#060e1a]" : "bg-[#f5f7fb]"}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
          <p className={`text-sm font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>Loading shared profile...</p>
        </div>
      </div>
    );
  }

  if (!profile || error) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${dark ? "bg-[#060e1a]" : "bg-[#f5f7fb]"}`}>
        <div className={`max-w-md w-full rounded-2xl border p-6 text-center ${dark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200 shadow-sm"}`}>
          <h1 className={`text-xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Shared Profile Unavailable</h1>
          <p className={`mt-2 text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{error || "This link may be expired or private."}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link to="/" className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors">Go Home</Link>
            <Link to={loginLink} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${dark ? "bg-[#060e1a]" : "bg-[#f5f7fb]"}`}>
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className={`rounded-3xl border overflow-hidden ${dark ? "border-[#1a3050] bg-[#0f1d35]" : "border-gray-200 bg-white shadow-sm"}`}>
          <div className={`h-24 sm:h-32 ${dark ? "bg-gradient-to-r from-[#16345b] via-[#1f4b85] to-[#16345b]" : "bg-gradient-to-r from-[#dbeafe] via-[#bfdbfe] to-[#dbeafe]"}`} />
          <div className="px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="-mt-10 sm:-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <img
                  src={resolveMediaUrl(profile.profileImage) || "https://via.placeholder.com/96x96?text=User"}
                  alt={profile.name || "User"}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 ${dark ? "border-[#0f1d35]" : "border-white"}`}
                />
                <div>
                  <p className={`text-[11px] uppercase tracking-wider font-bold ${dark ? "text-blue-200" : "text-blue-700"}`}>Shared Profile</p>
                  <h1 className={`text-2xl sm:text-3xl font-extrabold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>{profile.name || "User"}</h1>
                  <p className={`text-sm font-semibold capitalize ${dark ? "text-gray-300" : "text-gray-600"}`}>{profile.role || "member"}</p>
                </div>
              </div>

              <Link
                to={loginLink}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Login To Connect
              </Link>
            </div>

            <div className={`mt-5 rounded-3xl border p-6 sm:p-8 space-y-6 divide-y ${dark ? "bg-[#0d1520] border-[#1a3050] divide-white/[0.06]" : "bg-white border-gray-200 shadow-sm divide-gray-100"}`}>
              <div className="pt-6 first:pt-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </span>
                  <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>About</h3>
                </div>
                <p className={`text-[15px] leading-relaxed ${dark ? "text-gray-200" : "text-gray-700"}`}>
                  {profile.bio || "No about details shared yet."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="pt-6 first:pt-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </span>
                    <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Role</h3>
                  </div>
                  <span className={`inline-flex px-4 py-2 rounded-2xl text-[14px] font-bold border ${dark ? "border-white/10 text-gray-100 bg-white/[0.04]" : "border-gray-200 text-gray-800 bg-gray-50"}`}>
                    {String(profile.role || "member").charAt(0).toUpperCase() + String(profile.role || "member").slice(1)}
                  </span>
                </div>

                <div className="pt-6 first:pt-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </span>
                    <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Member Info</h3>
                  </div>
                  {memberSince ? (
                    <p className={`text-[14px] font-semibold ${dark ? "text-gray-300" : "text-gray-700"}`}>Member since {memberSince}</p>
                  ) : (
                    <p className={`text-[14px] ${dark ? "text-gray-400" : "text-gray-500"}`}>Member details unavailable</p>
                  )}
                </div>
              </div>

              {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                <div className="pt-6 first:pt-0">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </span>
                    <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Skills & Expertise</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className={`px-3 py-1.5 rounded-2xl text-[13px] font-semibold border ${dark ? "border-white/10 text-gray-200 bg-white/[0.04]" : "border-gray-200 text-gray-700 bg-gray-50"}`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {writerProfilePublic && profile.writerProfile && (
                <>
                  <div className="pt-6 first:pt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </span>
                      <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Writer Profile</h3>
                    </div>

                    <div className="space-y-3">
                      {profile.writerProfile.username ? (
                        <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
                          <span className={`text-[15px] ${dark ? "text-gray-400" : "text-gray-400"}`}>Username</span>
                          <span className={`text-[15px] font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>@{profile.writerProfile.username}</span>
                        </div>
                      ) : null}
                      <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
                        <span className={`text-[15px] ${dark ? "text-gray-400" : "text-gray-400"}`}>Representation</span>
                        <span className={`text-[15px] font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>{formatRepresentationStatus(profile.writerProfile.representationStatus)}</span>
                      </div>
                      {profile.writerProfile.agencyName ? (
                        <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
                          <span className={`text-[15px] ${dark ? "text-gray-400" : "text-gray-400"}`}>Agency</span>
                          <span className={`text-[15px] font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>{profile.writerProfile.agencyName}</span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${profile.writerProfile.wgaMember ? (dark ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border-emerald-200") : (dark ? "bg-white/10 text-gray-200 border-white/10" : "bg-gray-100 text-gray-700 border-gray-200")}`}>
                          WGA: {profile.writerProfile.wgaMember ? "Verified" : "No"}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${profile.writerProfile.sgaMember ? (dark ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20" : "bg-emerald-100 text-emerald-700 border-emerald-200") : (dark ? "bg-white/10 text-gray-200 border-white/10" : "bg-gray-100 text-gray-700 border-gray-200")}`}>
                          SWA: {profile.writerProfile.sgaMember ? "Verified" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="pt-6 first:pt-0">
                      <h3 className={`text-[18px] font-extrabold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>Genres</h3>
                      {Array.isArray(profile.writerProfile.genres) && profile.writerProfile.genres.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.writerProfile.genres.map((genre) => (
                            <span key={genre} className={`px-3 py-1.5 rounded-2xl text-[12px] font-semibold border ${dark ? "bg-blue-500/10 text-blue-200 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{genre}</span>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-[13px] italic ${dark ? "text-gray-500" : "text-gray-300"}`}>No genres selected</p>
                      )}
                    </div>

                    <div className="pt-6 first:pt-0">
                      <h3 className={`text-[18px] font-extrabold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>Specialized Tags</h3>
                      {Array.isArray(profile.writerProfile.specializedTags) && profile.writerProfile.specializedTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.writerProfile.specializedTags.map((tag) => (
                            <span key={tag} className={`px-3 py-1.5 rounded-2xl text-[12px] font-semibold border ${dark ? "bg-white/10 text-gray-200 border-white/10" : "bg-gray-50 text-gray-700 border-gray-200"}`}>{tag}</span>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-[13px] italic ${dark ? "text-gray-500" : "text-gray-300"}`}>No tags shared</p>
                      )}
                    </div>
                  </div>

                  {writerPublicLinks.length > 0 && (
                    <div className="pt-6 first:pt-0">
                      <h3 className={`text-[18px] font-extrabold mb-3 ${dark ? "text-white" : "text-gray-900"}`}>Public Links</h3>
                      <div className="flex flex-wrap gap-2">
                        {writerPublicLinks.map((item) => (
                          <a
                            key={item.key}
                            href={item.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-3 py-1.5 rounded-2xl text-[12px] font-semibold border ${dark ? "bg-white/10 text-gray-200 border-white/10 hover:bg-white/15" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}`}
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {String(profile.role || "").toLowerCase() === "investor" && (
                <>
                  <div className="pt-6 first:pt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                      </span>
                      <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Professional Info</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
                        <span className={`text-[15px] ${dark ? "text-gray-400" : "text-gray-400"}`}>Company</span>
                        <span className={`text-[15px] font-semibold text-right max-[420px]:text-left break-words [overflow-wrap:anywhere] ${dark ? "text-gray-200" : "text-gray-700"}`}>
                          {profile.industryProfile?.company || <span className={`italic font-normal ${dark ? "text-gray-500" : "text-gray-300"}`}>Not set</span>}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
                        <span className={`text-[15px] ${dark ? "text-gray-400" : "text-gray-400"}`}>Job Title</span>
                        <span className={`text-[15px] font-semibold text-right max-[420px]:text-left break-words [overflow-wrap:anywhere] ${dark ? "text-gray-200" : "text-gray-700"}`}>
                          {profile.industryProfile?.jobTitle || <span className={`italic font-normal ${dark ? "text-gray-500" : "text-gray-300"}`}>Not set</span>}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 max-[640px]:flex-col max-[640px]:items-start">
                        <span className={`text-[15px] ${dark ? "text-gray-400" : "text-gray-400"}`}>Sub-Role</span>
                        <span className={`text-[15px] font-semibold text-right max-[420px]:text-left break-words [overflow-wrap:anywhere] ${dark ? "text-gray-200" : "text-gray-700"}`}>
                          {profile.industryProfile?.subRole
                            ? formatIndustrySubRole(profile.industryProfile.subRole, profile.industryProfile?.subRoleOther)
                            : <span className={`italic font-normal ${dark ? "text-gray-500" : "text-gray-300"}`}>Not set</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 first:pt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${dark ? "border-white/10 text-blue-200" : "border-gray-200 text-blue-700 bg-blue-50"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                      </span>
                      <h3 className={`text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Investment Mandates</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-gray-400" : "text-gray-400"}`}>Preferred Genres</p>
                        {Array.isArray(profile.industryProfile?.mandates?.genres) && profile.industryProfile.mandates.genres.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.industryProfile.mandates.genres.map((genre) => (
                              <span key={genre} className={`px-3 py-1.5 rounded-2xl text-[12px] font-semibold border ${dark ? "bg-blue-500/10 text-blue-200 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{genre}</span>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-[13px] italic ${dark ? "text-gray-500" : "text-gray-300"}`}>No genres selected</p>
                        )}
                      </div>

                      <div>
                        <p className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-gray-400" : "text-gray-400"}`}>Formats</p>
                        {Array.isArray(profile.industryProfile?.mandates?.formats) && profile.industryProfile.mandates.formats.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.industryProfile.mandates.formats.map((format) => (
                              <span key={format} className={`px-3 py-1.5 rounded-2xl text-[12px] font-semibold border ${dark ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"}`}>{format}</span>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-[13px] italic ${dark ? "text-gray-500" : "text-gray-300"}`}>No formats selected</p>
                        )}
                      </div>

                      <div>
                        <p className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-2 ${dark ? "text-gray-400" : "text-gray-400"}`}>Budget Tiers</p>
                        {Array.isArray(profile.industryProfile?.mandates?.budgetTiers) && profile.industryProfile.mandates.budgetTiers.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.industryProfile.mandates.budgetTiers.map((tier) => (
                              <span key={tier} className={`px-3 py-1.5 rounded-2xl text-[12px] font-semibold border ${dark ? "bg-amber-500/10 text-amber-200 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{tier}</span>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-[13px] italic ${dark ? "text-gray-500" : "text-gray-300"}`}>No budget tiers selected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${dark ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
                Followers: {Number(profile.followerCount || 0)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${dark ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"}`}>
                Following: {Number(profile.followingCount || 0)}
              </span>
              {Array.isArray(profile?.writerProfile?.genres) && profile.writerProfile.genres.slice(0, 4).map((genre) => (
                <span key={genre} className={`px-3 py-1 rounded-full text-xs font-bold ${dark ? "bg-blue-500/15 text-blue-200" : "bg-blue-100 text-blue-700"}`}>
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>

        {writerProfilePublic && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl sm:text-2xl font-extrabold ${dark ? "text-white" : "text-gray-900"}`}>Published Projects</h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dark ? "bg-white/10 text-gray-200" : "bg-white border border-gray-200 text-gray-700"}`}>
                {scripts.length}
              </span>
            </div>

            {scripts.length === 0 ? (
              <div className={`rounded-2xl border p-8 text-center ${dark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200"}`}>
                <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>No public projects available right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scripts.map((script) => (
                  <Link
                    key={script._id}
                    to={`/share/project/${script._id}`}
                    className={`rounded-2xl border overflow-hidden transition-transform hover:-translate-y-0.5 ${dark ? "bg-[#0f1d35] border-[#1a3050]" : "bg-white border-gray-200 shadow-sm"}`}
                  >
                    <div className={`aspect-[16/7] ${dark ? "bg-[#0a1322]" : "bg-gray-100"}`}>
                      {script.coverImage ? (
                        <img src={resolveMediaUrl(script.coverImage)} alt={script.title || "Project"} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className={`text-lg font-extrabold leading-tight ${dark ? "text-white" : "text-gray-900"}`}>{script.title || "Untitled Project"}</h3>
                      {script.logline ? <p className={`mt-1 text-sm font-semibold ${dark ? "text-gray-200" : "text-gray-700"}`}>{script.logline}</p> : null}
                      {script.synopsis ? <p className={`mt-2 text-xs leading-relaxed ${dark ? "text-gray-300" : "text-gray-600"}`}>{script.synopsis}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
