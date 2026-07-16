import { useEffect } from "react";
import { useAuthModal } from "../context/AuthModalContext";
import BrandLogo from "../components/BrandLogo";

/* The /forgot-password route. Password recovery is a modal now — this route is
   kept for deep links and anyone who navigates straight to /forgot-password.
   It opens the recovery modal over a quiet branded backdrop; closing it routes
   the visitor back (handled by closeForgotPasswordModal in AuthModalContext). */
export default function ForgotPasswordRoute() {
  const { openForgotPasswordModal } = useAuthModal();

  useEffect(() => {
    openForgotPasswordModal();
  }, [openForgotPasswordModal]);

  return (
    <div className="min-h-screen bg-[#080e18] relative overflow-hidden flex flex-col items-center justify-center px-6 text-center">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <BrandLogo className="h-10 w-auto" />
        <h1 className="mt-8 text-xl font-bold tracking-tight text-white/80">Reset your password</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#4a5a6e]">
          We'll email you a verification code so you can set a new password securely.
          Use the window above to continue.
        </p>
      </div>
    </div>
  );
}
