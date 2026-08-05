/*
 * RosterRestrictDialog — what the gate says when it fires.
 *
 * The page this replaces printed "Business email required" inside a row and
 * made the row inert. It named a requirement without naming the reason, the
 * remedy, or what was still available, and there was no way to act on it from
 * the page.
 *
 * This is Featured's `fbp-restrict` treatment, same two routes out, same
 * structure — the two surfaces that gate on the same predicate should not
 * explain it differently.
 *
 * It is deliberately specific about what stays visible, because on this page
 * that list is long: the whole register and the whole detail pane work. The
 * only thing behind the gate is the profile.
 */
import { useEffect, useRef } from "react";
import {
  formatCount,
  formatScore,
  getCredentialBadges,
  getFollowers,
  getScriptCount,
  getViews,
} from "../writerRoster";
import RosterIcon from "./RosterIcon";

const RosterRestrictDialog = ({ writer, onClose, onUpgrade, onBusinessEmail }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!writer) return null;

  const badges = getCredentialBadges(writer);
  const still = [
    `${getScriptCount(writer)} scripts`,
    `${formatCount(getViews(writer))} views`,
    `score ${formatScore(writer)}/100`,
    `${formatCount(getFollowers(writer))} followers`,
    badges.length ? badges.join(" · ") : null,
  ].filter(Boolean).join(" · ");

  return (
    <div
      className="ckr-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ckr-modal" role="dialog" aria-modal="true" aria-labelledby="ckr-restrict-title">
        <div className="ckr-modal__head">
          <div>
            <span className="ckr-lab">Permission</span>
            <h2 className="ckr-modal__t" id="ckr-restrict-title">Access Restricted</h2>
          </div>
          <button
            type="button"
            ref={closeRef}
            className="ckr-iconbtn"
            onClick={onClose}
            aria-label="Close"
          >
            <RosterIcon name="close" />
          </button>
        </div>

        <div className="ckr-modal__body">
          <p className="ckr-modal__p">
            Industry accounts on a personal email address can browse the roster — name, bio,
            credentials, genres and every metric in the list — but opening <b>{writer.name}</b>’s
            profile needs a verified business email or the Film Industry Professional plan.
          </p>
          <p className="ckr-modal__still">Still visible without upgrading: {still}.</p>
          <div className="ckr-modal__actions">
            <button type="button" className="ckr-btn ckr-btn--primary" onClick={onUpgrade}>
              Get Film Industry Professional
            </button>
            <button type="button" className="ckr-btn ckr-btn--quiet" onClick={onBusinessEmail}>
              Update to a business email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RosterRestrictDialog;
