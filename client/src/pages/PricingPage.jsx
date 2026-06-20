import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Check, Crown, Sparkles } from "lucide-react";
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

const PremiumBadge = ({ user }) => {
  const expiresAt = user?.subscription?.accessExpiresAt;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  return (
  <div className="relative mx-auto w-full max-w-[340px]">
    {/* Ambient glow behind the card */}
    <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-br from-amber-400/15 via-yellow-300/5 to-purple-600/10 blur-3xl" />

    {/* Card */}
    <div className="relative overflow-hidden rounded-[26px] border border-amber-400/20 bg-gradient-to-br from-[#16100a] via-[#110d06] to-[#1a1208] p-7 shadow-[0_40px_100px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(251,191,36,0.18)]">

      {/* Top shimmer line */}
      <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />

      {/* Radial glow spots */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_10%,rgba(251,191,36,0.07),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_90%,rgba(139,92,246,0.06),transparent_55%)]" />

      <div className="relative flex flex-col items-center text-center gap-0">

        {/* Crown icon */}
        <div className="relative mb-5">
          <div className="absolute inset-0 scale-[1.8] rounded-full blur-2xl bg-amber-400/20" />
          <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-amber-400/30 bg-gradient-to-br from-amber-950/80 via-amber-900/40 to-amber-950/80 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_0_32px_rgba(251,191,36,0.15)]">
            <Crown className="h-8 w-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          </div>
        </div>

        {/* Plan chip */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-4 py-1.5 shadow-[0_0_16px_rgba(251,191,36,0.06)]">
          <span className="h-[6px] w-[6px] rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.32em] text-amber-300/90">Film Industry Professional</span>
        </div>

        {/* Heading */}
        <h2 className="text-[24px] font-black tracking-tight text-white leading-none">Premium Member</h2>
        <p className="mt-1.5 text-[13px] text-white/35 tracking-wide">₹1999 / month · Full access activated</p>

        {/* Divider */}
        <div className="my-5 h-px w-[80%] bg-gradient-to-r from-transparent via-amber-400/15 to-transparent" />

        {/* Status pills */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-1.5 shadow-[0_0_12px_rgba(52,211,153,0.06)]">
            <span className="h-[5px] w-[5px] rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-400">Active</span>
          </span>
          {daysLeft > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-amber-400/90">{daysLeft} days left</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5">
            <BadgeCheck className="h-3 w-3 text-amber-400/70" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Verified</span>
          </span>
        </div>
      </div>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
    </div>
  </div>
  );
};

export default function PricingPage() {
  const { user, setUser, loading: authLoading } = useContext(AuthContext);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const countdownRef = useRef(null);

  const isEligibleRole = isFilmIndustryProfessionalRole(user);
  const hasAccess = hasActiveFilmIndustryProfessionalAccess(user);
  const roleLabel = String(user?.role || "").trim() || "guest";

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const buttonLabel = useMemo(() => {
    if (authLoading) return "Checking session...";
    if (loading) return "Working...";
    if (hasAccess) return "Return to previous page";
    if (!user) return "Sign in to continue";
    if (!isEligibleRole) return "Not available";
    return "Pay securely with Razorpay";
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

  const startCountdownRedirect = (redirectTo) => {
    let count = 3;
    setRedirectCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      setRedirectCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        navigate(redirectTo || "/home", { replace: true });
      }
    }, 1000);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayCheckout = async (isRenew = false) => {
    setError("");
    setMessage("");

    if (authLoading) return;

    if (!user) {
      if (!isRenew) openAuthModal({ redirect: "/pricing" });
      return;
    }

    if (!isEligibleRole) {
      setError("Only film industry professionals can activate this plan.");
      return;
    }

    if (hasAccess && !isRenew) {
      goBackSafely();
      return;
    }

    setLoading(true);

    try {
      const res = await loadRazorpayScript();
      if (!res) {
        setError("Razorpay SDK failed to load. Are you connected to the internet?");
        setLoading(false);
        return;
      }

      const { data: orderData } = await api.post("/payment/film-industry-professional/create-razorpay-order");
      
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Ckript",
        description: "Film Industry Professional Plan",
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            setMessage("Verifying payment...");
            const { data: verifyData } = await api.post("/payment/film-industry-professional/verify-razorpay-payment", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              returnTo: normalizeReturnPath(location.state?.from),
            });

            const storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
            const updatedUser = {
              ...storedUser,
              ...(verifyData?.user || {}),
              token: storedUser.token,
              expiresAt: storedUser.expiresAt || verifyData?.user?.expiresAt,
            };

            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
            
            setMessage(isRenew ? "Plan renewed successfully! Redirecting..." : "Payment successful!");
            setCheckoutSuccess(true);
            startCountdownRedirect(verifyData?.redirectTo || "/home");
          } catch (verifyError) {
            setError(verifyError?.response?.data?.message || "Payment verification failed.");
            setLoading(false);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#0f1320",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to initiate payment.");
      setLoading(false);
    }
  };

  /* ── Success state shown after checkout ── */
  if (checkoutSuccess) {
    return (
      <main className="relative min-h-screen bg-[#0f1320] text-white flex items-center justify-center px-4 py-12">
        {/* Full-page ambient glow */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(251,191,36,0.05),transparent_65%)]" />

        <div className="relative w-full max-w-[420px] flex flex-col items-center gap-8">

          {/* Check mark at top */}
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full blur-2xl bg-emerald-400/15" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
              <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-400/70 font-bold mb-2">Access Granted</p>
            <h1 className="text-[28px] font-black tracking-tight text-white leading-tight">You're in, Professional.</h1>
            <p className="mt-2 text-sm text-white/40">Your premium membership is now active.</p>
          </div>

          <PremiumBadge />

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-white/30 tracking-wide">
              Redirecting in <span className="text-white/60 font-bold">{redirectCountdown}</span>s...
            </p>
            <button
              type="button"
              onClick={() => {
                if (countdownRef.current) clearInterval(countdownRef.current);
                navigate("/home", { replace: true });
              }}
              className="text-[11px] font-semibold text-white/40 underline underline-offset-2 hover:text-white/70 transition"
            >
              Go now
            </button>
          </div>
        </div>
      </main>
    );
  }

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

          {/* Premium badge — shown when plan is already active */}
          {hasAccess && (
            <div className="mb-6">
              <PremiumBadge user={user} />
            </div>
          )}

          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              {!hasAccess && (
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Sparkles className="h-6 w-6 text-white/90" />
                </div>
              )}
              <h1 className="text-[32px] font-black leading-tight tracking-tight text-white">
                Film industry professional Model
              </h1>
              <p className="mt-4 text-[52px] font-black leading-none tracking-tight text-white">
                1999 rs.
                <span className="ml-2 text-[22px] font-semibold text-white/45">/ Month</span>
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] shrink-0 ${
              hasAccess
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/[0.04] text-white/65"
            }`}>
              {authLoading ? "Checking" : hasAccess ? "Active" : user ? "Test mode" : "Login required"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleRazorpayCheckout(false)}
            disabled={authLoading || loading || (!user ? false : !isEligibleRole)}
            className={`flex h-[64px] w-full items-center justify-center rounded-full text-[18px] font-extrabold transition ${
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

          {hasAccess && (
            <button
              type="button"
              onClick={() => handleRazorpayCheckout(true)}
              disabled={authLoading || loading}
              className="mt-3 flex h-[64px] w-full items-center justify-center rounded-full text-[18px] font-extrabold transition border border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
            >
              {loading ? "Working..." : "Renew Plan"}
            </button>
          )}

          <div className="mt-4 h-px bg-white/8" />

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
