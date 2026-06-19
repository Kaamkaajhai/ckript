import { useContext, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import api from "../services/api";
import {
  hasActiveFilmIndustryProfessionalAccess,
  isFilmIndustryProfessionalRole,
} from "../utils/industryAccess";

const included = [
  "Access 15 Verified Writer Contacts (Email, LinkedIn & Phone no.).",
  "Message Directly to 15 Writers for Rights, IP, Negotiation & Deal Discussions.",
  "Schedule max 15 Meetings with Writers Through the Platform.",
  "Curated Script Delivered to Your Mail Based on Your Preferred Genre.",
];

const normalizeReturnPath = (value = "") => {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/")) return "";
  if (path.startsWith("//")) return "";
  if (path.startsWith("/login") || path.startsWith("/signup")) return "";
  return path;
};

export default function PricingPage() {
  const { user, setUser, loading: authLoading } = useContext(AuthContext);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEligibleRole = isFilmIndustryProfessionalRole(user);
  const hasAccess = hasActiveFilmIndustryProfessionalAccess(user);
  const roleLabel = String(user?.role || "").trim() || "guest";

  const buttonLabel = useMemo(() => {
    if (authLoading) return "Checking session...";
    if (loading) return "Working...";
    if (hasAccess) return "Return to previous page";
    if (!user) return "Sign in to continue";
    if (!isEligibleRole) return "Not available";
    return "Start Test Checkout";
  }, [authLoading, hasAccess, isEligibleRole, loading, user]);

  const goBackSafely = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    if (user?.role === "reader") {
      navigate("/reader", { replace: true });
      return;
    }
    if (["investor", "producer", "director", "industry", "professional"].includes(String(user?.role || "").toLowerCase())) {
      navigate("/home", { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  const handleStartCheckout = async () => {
    setError("");
    setMessage("");

    if (authLoading) return;

    if (!user) {
      openAuthModal({ redirect: "/pricing" });
      return;
    }

    if (!isEligibleRole) {
      setError("Only film industry professionals can activate this plan.");
      return;
    }

    if (hasAccess) {
      goBackSafely();
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/payment/film-industry-professional/test-checkout", {
        returnTo: normalizeReturnPath(location.state?.from),
      });

      const storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
      const updatedUser = {
        ...storedUser,
        ...(data?.user || {}),
        token: storedUser.token,
        expiresAt: storedUser.expiresAt || data?.user?.expiresAt,
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage(data?.message || "Test checkout activated successfully.");

      navigate(data?.redirectTo || "/home", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to activate test checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#0f1320] text-white">
      <div className="absolute left-4 top-4 z-20">
        <button
          type="button"
          onClick={goBackSafely}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/75 backdrop-blur-xl transition hover:bg-white/[0.06] hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="mx-auto max-w-[460px] px-4 py-6">
        <section className="mt-10 rounded-[24px] border border-white/10 bg-[#151a2a] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Sparkles className="h-6 w-6 text-white/90" />
              </div>
              <h1 className="text-[32px] font-black leading-tight tracking-tight text-white">
                Film industry professional Model
              </h1>
              <p className="mt-4 text-[52px] font-black leading-none tracking-tight text-white">
                1999 rs.
                <span className="ml-2 text-[22px] font-semibold text-white/45">/ Month</span>
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
              {authLoading ? "Checking" : hasAccess ? "Active" : user ? "Test mode" : "Login required"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartCheckout}
            disabled={authLoading || loading || (!user ? false : !isEligibleRole)}
            className={`mb-4 flex h-[64px] w-full items-center justify-center rounded-full text-[18px] font-extrabold transition ${
              hasAccess
                ? "bg-emerald-500/90 text-[#07130e] hover:bg-emerald-400"
                : !user
                  ? "bg-[#4a5165] text-white hover:bg-[#555d75]"
                  : !isEligibleRole
                    ? "cursor-not-allowed bg-white/10 text-white/35"
                    : "bg-[#4a5165] text-white hover:bg-[#555d75]"
            }`}
          >
            {buttonLabel}
          </button>

          <div className="h-px bg-white/8" />

          <ul className="mt-4 space-y-4">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[18px] leading-[1.55] text-white/78">
                <Check className="mt-1 h-5 w-5 shrink-0 text-emerald-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {message && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
            {user ? `${roleLabel} account detected` : "Sign in first to activate this plan."}
          </div>
        </section>
      </div>
    </main>
  );
}
