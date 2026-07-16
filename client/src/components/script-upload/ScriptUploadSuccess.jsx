import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MatIcon } from "../../layouts/dashboard/icons";
import "./ScriptUploadSuccess.css";

export default function ScriptUploadSuccess({ projectTitle, reviewPath }) {
  const headingRef = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="script-upload-success" aria-labelledby="su-success-title">
      <div className="su-success-glow su-success-glow--one" aria-hidden="true" />
      <div className="su-success-glow su-success-glow--two" aria-hidden="true" />

      <section className="su-success-panel" role="status" aria-live="polite">
        <div className="su-success-mark" aria-hidden="true">
          <span><MatIcon name="check" size={30} /></span>
        </div>

        <p className="su-success-kicker">Submission complete</p>
        <h1 id="su-success-title" ref={headingRef} tabIndex={-1}>Your project has been submitted.</h1>
        <p className="su-success-message">
          <strong>{projectTitle || "Your project"}</strong> is now with the Ckript review team. We’ll notify you when the review is complete.
        </p>

        <div className="su-success-actions" aria-label="Submission actions">
          <a className="su-success-button su-success-button--secondary" href="/upload">
            <MatIcon name="add" size={18} />
            Create more
          </a>
          <Link className="su-success-button su-success-button--primary" to={reviewPath || "/dashboard"}>
            Review your project
            <MatIcon name="arrow_forward" size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
