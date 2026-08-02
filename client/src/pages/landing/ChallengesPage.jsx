import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import useReveal from "./_shared/useReveal";
import useChallenge from "./_shared/useChallenge";
import { LOGO_SRC, ROUTES } from "./_shared/theme";
import Challenge from "./sections/Challenge/Challenge";
import Footer from "./sections/Footer/Footer";
import "./landing.css";

/**
 * /challenges — the challenge told in the LANDING's voice, on its own page.
 *
 * The marketing nav used to point straight at /challenge, the application hub. That hands a
 * first-time visitor an interior console before anything has sold them the event — and every
 * attempt to make the hub carry both jobs turned one surface into a bad copy of the other.
 * So the split is now physical:
 *
 *   /challenges  (this page)  .ckl register — seduce. The five-beat editorial sequence,
 *                             oversized type, one idea per beat. Marketing nav points here.
 *   /challenge   (the hub)    .ckc register — inform. Masthead, phase band, programme,
 *                             ownership, the four-tab record. This page's CTAs point there.
 *
 * Same data hook as the homepage (publicApi, dormant-first, failure-silent), so the two marketing
 * surfaces can never disagree about what is running.
 */

export default function ChallengesPage() {
  const rootRef = useRef(null);
  useReveal(rootRef);

  const challenge = useChallenge();

  // Same scrollbar scoping as Landing: present before first paint, gone when the page is.
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("ckl-scroll");
    return () => el.classList.remove("ckl-scroll");
  }, []);

  return (
    <div className="ckl" ref={rootRef}>
      {/* A slim way home, not the full landing nav — this page has exactly one job and the
          five-beat section supplies its own calls to action. */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1320,
          margin: "0 auto",
          padding: "26px clamp(20px, 5vw, 80px) 0",
        }}
      >
        <Link to={ROUTES.home} aria-label="Ckript home">
          <img src={LOGO_SRC} alt="Ckript" style={{ height: 34, width: "auto", display: "block" }} />
        </Link>
        <Link
          to={ROUTES.challenge}
          style={{
            fontFamily: "var(--ck-sans)",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--ck-ink)",
            textDecoration: "none",
            borderBottom: "2px solid var(--ck-border)",
            paddingBottom: 4,
          }}
        >
          Open the Challenge Hub
        </Link>
      </header>

      <Challenge
        phase={challenge.phase}
        competition={challenge.competition}
        winner={challenge.winner}
      />

      <Footer />
    </div>
  );
}
