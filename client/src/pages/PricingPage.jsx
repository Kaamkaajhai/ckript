import { useEffect, useMemo, useRef, useState, useContext } from "react";
import { BadgeCheck, Check, Crown, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthModal } from "../context/AuthModalContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import useFilmIndustryProfessionalCheckout from "../hooks/useFilmIndustryProfessionalCheckout";

const getIncludedFeatures = (quota = 10) => [
  `Access ${quota} Verified Writer Contacts (Email, LinkedIn & Phone no.).`,
  `Message Directly to ${quota} Writers for Rights, IP, Negotiation & Deal Discussions.`,
  `Schedule max ${quota} Meetings with Writers Through the Platform.`,
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

const WriterPlanCard = ({ title, price, features, tier, isPopular, isActive, daysLeft, onSubscribe, onRenew, isRenewing, buttonText = "Choose Plan", quota, uploadedCount }) => {
  const isGold = tier === "gold";
  const isSilver = tier === "silver";

  let borderStyle = "border-white/[0.08]";
  let bgStyle = "bg-[#0e1220]";
  let titleColor = "text-white";
  let iconColor = "text-indigo-400";
  let buttonStyle = "bg-white/10 text-white hover:bg-white/20 hover:shadow-white/10";

  if (isGold) {
    borderStyle = "border-amber-400/50";
    bgStyle = "bg-gradient-to-b from-[#1a1309] to-[#0e1220]";
    titleColor = "text-amber-400";
    iconColor = "text-amber-400";
    buttonStyle = "bg-amber-500 text-amber-950 hover:bg-amber-400 hover:shadow-amber-500/20";
  } else if (isSilver) {
    borderStyle = "border-slate-400/40";
    bgStyle = "bg-gradient-to-b from-[#151921] to-[#0e1220]";
    titleColor = "text-slate-300";
    iconColor = "text-slate-400";
    buttonStyle = "bg-slate-300 text-slate-900 hover:bg-slate-200 hover:shadow-slate-300/20";
  }

  return (
    <div className={`relative overflow-hidden rounded-[20px] border ${borderStyle} ${bgStyle} p-6 shadow-xl flex flex-col`}>
      {isGold && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600"></div>
      )}
      {isSilver && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400"></div>
      )}
      {isPopular && (
        <div className={`absolute top-4 right-4 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${
          isGold ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" :
          "bg-slate-500/10 border border-slate-400/20 text-slate-300"
        }`}>
          Recommended
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <h3 className={`text-[17px] font-bold tracking-tight ${titleColor}`}>{title}</h3>
        {isActive && (
          <div className="flex items-center gap-2 mt-1">
            {daysLeft > 0 && (
              <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-amber-400/90">{daysLeft} days left</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-0.5 shadow-[0_0_12px_rgba(52,211,153,0.06)]">
              <span className="h-[4px] w-[4px] rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.24em] text-emerald-400">Active</span>
            </span>
          </div>
        )}
      </div>
      <div className="mt-1.5 mb-5 flex items-baseline gap-1.5">
        <span className="text-[32px] font-black tracking-tight text-white leading-none">₹{price}</span>
        <span className="text-[11px] font-medium text-white/40">/ month</span>
      </div>
      <ul className="mb-7 space-y-3 flex-1">
        {features.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-[12px] leading-[1.5] text-white/60">
            <Check className={`mt-[2px] h-3.5 w-3.5 shrink-0 ${iconColor}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {isActive && quota !== undefined && uploadedCount !== undefined && (
        <div className="mb-4 bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-medium text-white/60">Scripts Uploaded</span>
            <span className="text-[12px] font-bold text-white/90">{uploadedCount} <span className="text-white/40">/ {quota}</span></span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${uploadedCount >= quota ? 'bg-rose-500' : isGold ? 'bg-amber-400' : isSilver ? 'bg-slate-300' : 'bg-emerald-400'}`} 
              style={{ width: `${Math.min(100, (uploadedCount / quota) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[10px] mt-2 font-medium text-white/50 text-right">
            {Math.max(0, quota - uploadedCount)} more script{Math.max(0, quota - uploadedCount) !== 1 ? 's' : ''} available
          </p>
        </div>
      )}
      {isActive && onRenew ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={onSubscribe}
            className={`w-full rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-all shadow-lg ${buttonStyle}`}
          >
            Go to Dashboard
          </button>
          <button
            onClick={onRenew}
            disabled={isRenewing}
            className="w-full rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-all border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white/90 disabled:opacity-50"
          >
            {isRenewing ? "Working..." : "Renew Plan"}
          </button>
        </div>
      ) : (
        <button
          onClick={onSubscribe}
          className={`w-full rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-all shadow-lg ${buttonStyle}`}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
};

export default function PricingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthModal } = useAuthModal();
  const { setUser } = useContext(AuthContext);

  const [writerLoading, setWriterLoading] = useState(false);
  const [writerMessage, setWriterMessage] = useState("");
  const [writerError, setWriterError] = useState("");

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

  // The full-page surface and the landing Pricing modal share one checkout.
  const {
    user,
    authLoading,
    isEligibleRole,
    hasAccess,
    loading,
    error,
    message,
    startCheckout,
  } = useFilmIndustryProfessionalCheckout();

  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const countdownRef = useRef(null);

  const roleLabel = String(user?.role || "").trim() || "guest";

  const hasSilverAccess = user?.subscription?.accessTier === "writer_silver" && user?.subscription?.accessStatus === "active" && new Date(user?.subscription?.accessExpiresAt) > new Date();
  const hasGoldAccess = user?.subscription?.accessTier === "writer_gold" && user?.subscription?.accessStatus === "active" && new Date(user?.subscription?.accessExpiresAt) > new Date();
  
  const writerExpDate = user?.subscription?.accessExpiresAt ? new Date(user.subscription.accessExpiresAt) : null;
  const writerDaysLeft = writerExpDate ? Math.max(0, Math.ceil((writerExpDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24))) : 0;

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const [uploadedCount, setUploadedCount] = useState(0);

  useEffect(() => {
    if (user && ["writer", "creator"].includes(String(user.role).toLowerCase())) {
      const fetchCount = async () => {
        try {
          const res = await api.get("/scripts/mine");
          const allScripts = Array.isArray(res.data) ? res.data : [];
          const myScripts = allScripts.filter((script) => !script?.isCollaborator);
          setUploadedCount(myScripts.length);
        } catch (error) {
          console.error("Failed to fetch scripts count", error);
        }
      };
      fetchCount();
    }
  }, [user]);

  const buttonLabel = useMemo(() => {
    if (authLoading) return "Checking session...";
    if (loading) return "Working...";
    if (hasAccess) return "Return to previous page";
    if (!user) return "Sign in to continue";
    if (!isEligibleRole) return "Not available for your account type";
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

  const handleCheckout = (isRenew = false) =>
    startCheckout({
      isRenew,
      returnTo: normalizeReturnPath(location.state?.from),
      signInRedirect: "/pricing",
      onSuccess: (verifyData) => {
        setCheckoutSuccess(true);
        startCountdownRedirect(verifyData?.redirectTo || "/home");
      },
      onAlreadyActive: goBackSafely,
    });

  const handleWriterRazorpayCheckout = async (tier) => {
    setWriterError("");
    setWriterMessage("");

    if (authLoading) return;

    if (!user) {
      openAuthModal({ redirect: "/pricing" });
      return;
    }

    if (!["writer", "creator"].includes(String(user.role).toLowerCase())) {
      setWriterError("This plan is designed for writers and creators.");
      return;
    }

    setWriterLoading(true);

    try {
      const res = await loadRazorpayScript();
      if (!res) {
        setWriterError("Razorpay SDK failed to load. Are you connected to the internet?");
        setWriterLoading(false);
        return;
      }

      const { data: orderData } = await api.post("/payment/writer/create-razorpay-order", { tier });
      
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Ckript",
        description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Model Subscription`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            setWriterMessage("Verifying payment...");
            const { data: verifyData } = await api.post("/payment/writer/verify-razorpay-payment", {
              tier,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
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
            
            setWriterMessage("Payment successful!");
            setCheckoutSuccess(true);
            startCountdownRedirect("/dashboard");
          } catch (verifyError) {
            setWriterError(verifyError?.response?.data?.message || "Payment verification failed.");
            setWriterLoading(false);
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
            setWriterLoading(false);
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      setWriterError(err?.response?.data?.message || "Failed to initiate payment.");
      setWriterLoading(false);
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
    <main className="relative min-h-screen bg-[#080c14] text-white overflow-hidden">

      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-10%] left-[-5%] h-[40vh] w-[40vw] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] h-[35vh] w-[35vw] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      {/* Back button — top right */}
      <div className="absolute right-4 top-4 z-20">
        <button
          type="button"
          onClick={goBackSafely}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 backdrop-blur-xl transition hover:border-white/20 hover:text-white/80"
        >
          Back
        </button>
      </div>

      <div className="relative flex flex-col items-center justify-start px-5 py-12 sm:px-8 w-full z-10">
        <div className="w-full max-w-5xl mx-auto">

          {/* Writer's Business Model Section */}
          <div className="text-left mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              Writer's Business Model
            </h1>
            <div className="mt-4 h-[2px] w-20 bg-gradient-to-r from-indigo-500 to-transparent rounded-full"></div>
          </div>

          {writerMessage && (
            <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-300">
              {writerMessage}
            </div>
          )}
          {writerError && (
            <div className="mb-6 rounded-lg border border-rose-500/20 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-300">
              {writerError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <WriterPlanCard
              title="Free Tier"
              price="0"
              tier="free"
              isActive={!hasSilverAccess && !hasGoldAccess}
              quota={1}
              uploadedCount={uploadedCount}
              features={[
                "Upload 1 script",
                "Appear only in search section",
                "AI generated synopsis and logline"
              ]}
              buttonText={user ? "Go to Dashboard" : "Sign In to Continue"}
              onSubscribe={() => {
                if (user) {
                  navigate("/dashboard");
                } else {
                  openAuthModal({ redirect: "/dashboard" });
                }
              }}
            />
            <WriterPlanCard
              title="Silver Model"
              price="399"
              tier="silver"
              isActive={hasSilverAccess}
              daysLeft={writerDaysLeft}
              quota={8}
              uploadedCount={uploadedCount}
              features={[
                "Upload 8 scripts",
                "Appear in top script sections",
                "AI generated synopsis, logline and Roles",
                "AI evaluation",
                "View who see scripts/profile"
              ]}
              onSubscribe={() => {
                if (!user) {
                  openAuthModal({ redirect: "/pricing" });
                } else if (hasSilverAccess) {
                  navigate("/dashboard");
                } else {
                  handleWriterRazorpayCheckout("silver");
                }
              }}
              onRenew={() => handleWriterRazorpayCheckout("silver")}
              isRenewing={writerLoading}
              buttonText={writerLoading ? "Processing..." : hasSilverAccess ? "Active Plan" : user ? "Pay securely with Razorpay" : "Sign In to Continue"}
            />
            <WriterPlanCard
              title="Gold Model"
              price="699"
              tier="gold"
              isPopular={true}
              isActive={hasGoldAccess}
              daysLeft={writerDaysLeft}
              quota={20}
              uploadedCount={uploadedCount}
              features={[
                "Upload 20 scripts",
                "Appear in top script section",
                "Appear in featured section",
                "AI generated synopsis, logline and Roles",
                "AI evaluation",
                "View who see scripts/profile",
                "Ckript professional reader evaluation",
                "Upload Pitch video of script"
              ]}
              onSubscribe={() => {
                if (!user) {
                  openAuthModal({ redirect: "/pricing" });
                } else if (hasGoldAccess) {
                  navigate("/dashboard");
                } else {
                  handleWriterRazorpayCheckout("gold");
                }
              }}
              onRenew={() => handleWriterRazorpayCheckout("gold")}
              isRenewing={writerLoading}
              buttonText={writerLoading ? "Processing..." : hasGoldAccess ? "Active Plan" : user ? "Pay securely with Razorpay" : "Sign In to Continue"}
            />
          </div>

          {/* Film Industry Professional Section */}
          <div className="border-t border-white/[0.06] pt-12 flex flex-col items-start">
            <div className="text-left mb-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                Film Industry Professional Model
              </h2>
              <div className="mt-4 h-[2px] w-20 bg-gradient-to-r from-amber-400 to-transparent rounded-full"></div>
            </div>

            <div className="w-full max-w-[380px]">

          {/* Card */}
          <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0e1220] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">

            {/* Top accent line */}
            <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            {/* Subtle inner glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(99,102,241,0.06),transparent_60%)]" />

            <div className="relative p-5">

              {/* Header row */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  {!hasAccess && (
                    <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                  )}
                  <h2 className="text-[18px] font-semibold tracking-tight text-white">Premium Model</h2>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-[34px] font-black tracking-tight text-white leading-none">₹1999</span>
                    <span className="text-[12px] font-medium text-white/30">/ month</span>
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-end gap-1.5 shrink-0">
                  {(authLoading || hasAccess || !user) && (
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${
                      hasAccess
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/[0.03] text-white/35"
                    }`}>
                      {authLoading ? "..." : hasAccess ? "Active" : "Login required"}
                    </span>
                  )}
                  {hasAccess && (() => {
                    const expiresAt = user?.subscription?.accessExpiresAt;
                    const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : null;
                    return daysLeft !== null ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">
                        {daysLeft}d left
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Divider */}
              <div className="mb-4 h-px bg-white/[0.06]" />

              {/* Features */}
              <ul className="mb-5 space-y-2.5">
                {getIncludedFeatures(user?.subscription?.contactsLimit || 10).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-white/55">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                type="button"
                onClick={() => handleCheckout(false)}
                disabled={authLoading || loading || (!user ? false : !isEligibleRole)}
                className={`flex h-[48px] w-full items-center justify-center rounded-xl text-[13.5px] font-semibold tracking-wide transition-all ${
                  hasAccess
                    ? "bg-emerald-500 text-[#051a0f] hover:bg-emerald-400"
                    : !user
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : !isEligibleRole
                        ? "cursor-not-allowed bg-white/[0.05] text-white/25"
                        : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {buttonLabel}
              </button>

              {hasAccess && (
                <button
                  type="button"
                  onClick={() => handleCheckout(true)}
                  disabled={authLoading || loading}
                  className="mt-2 flex h-[44px] w-full items-center justify-center rounded-xl text-[13px] font-semibold transition border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.07] hover:text-white/90"
                >
                  {loading ? "Working..." : "Renew Plan"}
                </button>
              )}

              {/* Status / error / message */}
              {message && (
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-2 text-[11px] text-emerald-300">
                  {message}
                </div>
              )}
              {error && (
                <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.08] px-3 py-2 text-[11px] text-rose-300">
                  {error}
                </div>
              )}

              <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${
                user && !isEligibleRole
                  ? "border-rose-500/15 bg-rose-500/[0.07] text-rose-300/70"
                  : "border-white/[0.05] bg-white/[0.02] text-white/30"
              }`}>
                {!user
                  ? "Sign in first to activate this plan."
                  : !isEligibleRole
                    ? `This plan is for film industry professionals. Your account type (${roleLabel}) is not eligible.`
                    : "film industry professional account detected"}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </main>
  );
}
