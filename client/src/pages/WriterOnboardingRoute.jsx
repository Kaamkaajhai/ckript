import { useNavigate } from "react-router-dom";
import WriterOnboardingModal from "../components/WriterOnboardingModal";

/* Standalone route for /writer-onboarding.

   Writer onboarding lives in a modal so it can also open in-context from the
   sign-up popup. This thin page keeps the dedicated URL working — for deep
   links, the sidebar "Become a Writer" entry, the landing/Terms CTAs and the
   SEO sitemap — by mounting that same modal over the warm dark studio backdrop
   the design is composed against, so the tinted overlay never reveals a blank
   page behind it.

   Closing (X / Esc / backdrop) returns home; completing the flow lands the new
   writer on their profile (the modal's default onComplete). */
export default function WriterOnboardingRoute() {
  const navigate = useNavigate();
  return (
    <>
      <div className="wom-route-backdrop" aria-hidden="true" />
      <WriterOnboardingModal open onClose={() => navigate("/", { replace: true })} />
    </>
  );
}
