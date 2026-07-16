import Icon from "../../components/Icon";
import BottomSheet from "../../components/BottomSheet";
import { aiDetailFor } from "../../data/dashboardData";
import "./AiDetailSheet.css";

/*
 * AiDetailSheet — the full AI analysis for a single script, presented as a
 * bottom sheet (reference screen 02). Opens from any AI review card's
 * "Details" action. When a script has hand-authored detail it is used
 * verbatim; otherwise the sheet derives a faithful breakdown from the
 * review's own bars so every card leads somewhere real.
 */
export default function AiDetailSheet({ review, open, onClose }) {
  const detail = review ? aiDetailFor(review) : null;

  return (
    <BottomSheet open={open && !!review} onClose={onClose} height="88%" label="AI analysis detail">
      {detail && (
        <div className="ckm-aid">
          <div className="ckm-aid__head">
            <div>
              <div className="ckm-aid__eyebrow">AI-Powered Analysis</div>
              <h3 className="ckm-aid__title">{review.title}</h3>
            </div>
            <button type="button" className="ckm-aid__close" onClick={onClose} aria-label="Close">
              <Icon name="close" size={20} color="var(--ckm-text-3)" />
            </button>
          </div>

          <div className="ckm-aid__overall">
            <div className="ckm-aid__overall-col">
              <div className="ckm-aid__overall-kicker">Overall</div>
              <div className="ckm-aid__overall-score">{detail.score}</div>
              <span className="ckm-aid__verdict" style={{ color: detail.vcol, borderColor: detail.vcol }}>
                {detail.verdict}
              </span>
            </div>
            <div className="ckm-aid__divider" />
            <p className="ckm-aid__quote">“{detail.quote}”</p>
          </div>

          <div className="ckm-aid__facets">
            {detail.facets.map((f) => (
              <div key={f.label} className="ckm-aid__facet">
                <div className="ckm-aid__facet-label">{f.label}</div>
                <div className="ckm-aid__facet-value">{f.value}</div>
              </div>
            ))}
          </div>

          <div className="ckm-aid__lists">
            <div>
              <div className="ckm-aid__list-kicker ckm-aid__list-kicker--accent">Strengths</div>
              <div className="ckm-aid__list">
                {detail.strengths.map((s) => (
                  <div key={s} className="ckm-aid__list-item">
                    <span className="ckm-aid__dash ckm-aid__dash--accent">—</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="ckm-aid__list-kicker">To Improve</div>
              <div className="ckm-aid__list">
                {detail.improve.map((s) => (
                  <div key={s} className="ckm-aid__list-item">
                    <span className="ckm-aid__dash">—</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ckm-aid__audience">
            <div className="ckm-aid__list-kicker">Audience &amp; Comparables</div>
            <p className="ckm-aid__audience-body" dangerouslySetInnerHTML={{ __html: detail.audience }} />
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
