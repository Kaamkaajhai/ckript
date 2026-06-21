import { useNavigate } from "react-router-dom";
import ProducerOnboardingModal from "../components/ProducerOnboardingModal";

/* Standalone route for /producer-director-onboarding.

   The producer onboarding lives in a modal so it can also open in-context from
   the sign-up popup. This thin page keeps the dedicated URL working — for deep
   links, the sidebar "Become a Producer/Director" entry, upgrade CTAs, the Terms
   page and the SEO sitemap — by mounting that same modal over the warm dark
   studio backdrop the design is composed against, so the tinted overlay never
   reveals a blank page behind it.

   Closing (X / Esc / backdrop) returns home; completing the flow lands the new
   producer on the review-pending page (the modal's default onComplete). */
export default function ProducerOnboardingRoute() {
  const navigate = useNavigate();
  return (
    <>
      <div className="pom-route-backdrop" aria-hidden="true" />
      <ProducerOnboardingModal open onClose={() => navigate("/", { replace: true })} />
    </>
  );
}
