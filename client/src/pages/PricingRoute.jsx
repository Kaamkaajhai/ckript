import { useEffect } from "react";
import { useAuthModal } from "../context/AuthModalContext";

/* The /pricing route. Pricing is a modal now, not a page — but the route is
   kept alive for deep links, the marketing footer, new-tab opens
   (window.open('/pricing')) and SEO. Visiting it simply opens the pricing
   modal over a quiet branded backdrop; closing the modal routes the visitor
   back (handled by closePricingModal in AuthModalContext).

   SEO is unaffected: crawlers are served the prerendered /pricing HTML
   (scripts/prerender-seo.mjs) and SeoManager sets the meta tags at runtime,
   both independent of this component. */
export default function PricingRoute() {
  const { openPricingModal } = useAuthModal();

  useEffect(() => {
    openPricingModal();
  }, [openPricingModal]);

  return (
    <main className="relative min-h-screen bg-[#080c14] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-10%] left-[-5%] h-[40vh] w-[40vw] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[-5%] h-[35vh] w-[35vw] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>
      {/* Quiet, crawlable summary that sits behind the modal. */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40">Pricing</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white/80">
          Plans for writers and the film industry
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/40">
          Free, Silver and Gold plans for writers, plus the Film Industry Professional membership.
          Choose a plan from the window above.
        </p>
      </div>
    </main>
  );
}
