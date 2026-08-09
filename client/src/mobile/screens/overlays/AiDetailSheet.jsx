import Sheet from "../../components/overlays/Sheet";
import { aiDetailFor } from "../../data/dashboardData";
import "./AiDetailSheet.css";

/*
 * AiDetailSheet — the full AI analysis for a single script. Opens from any AI
 * review card's "Details" action.
 *
 * 2026-08-07 (plan §11 Phase 2), three changes:
 *
 *  • It is a real `Sheet` (ckm-bottom-sheet) rather than the dashboard-era
 *    `BottomSheet`, so it gets the focus trap, scroll lock, `inert` background
 *    and focus restoration that the old primitive never had — and its drag is
 *    bound to the grip, so dragging the analysis scrolls it instead of
 *    dismissing it. Its own close button goes away with it: `Sheet` renders
 *    the accessible one.
 *  • The strengths, weaknesses and recommendations are the model's own words,
 *    from `/dashboard/reviews`. They used to be generated from the bar labels
 *    ("Structure lands with confidence") — sentences no model ever wrote,
 *    attributed to one.
 *  • Audience and comparables render as text. They were passed through
 *    `dangerouslySetInnerHTML`, which is defensible for a hand-written fixture
 *    string and not defensible at all once the string is model output stored
 *    on a script.
 */

function DetailList({ kicker, accent = false, items, ordered = false }) {
  if (!items?.length) return null;
  const List = ordered ? "ol" : "ul";

  return (
    <div>
      <div className={`ckm-aid__list-kicker${accent ? " ckm-aid__list-kicker--accent" : ""}`}>
        {kicker}
      </div>
      <List className="ckm-aid__list">
        {items.map((item, i) => (
          <li key={`${kicker}-${i}`} className="ckm-aid__list-item">
            <span className={`ckm-aid__dash${accent ? " ckm-aid__dash--accent" : ""}`} aria-hidden="true">
              {ordered ? i + 1 : "—"}
            </span>
            {item}
          </li>
        ))}
      </List>
    </div>
  );
}

export default function AiDetailSheet({ review, open, onClose, returnFocusTo = null }) {
  const detail = review ? aiDetailFor(review) : null;

  return (
    <Sheet
      open={open && !!review}
      onClose={onClose}
      title={review?.title || "AI analysis"}
      description="AI-Powered Analysis"
      returnFocusTo={returnFocusTo}
      className="ckm-aid__sheet"
    >
      {detail && (
        <div className="ckm-aid">
          <div className="ckm-aid__overall">
            <div className="ckm-aid__overall-col">
              <div className="ckm-aid__overall-kicker">Overall</div>
              <div className="ckm-aid__overall-score">{detail.score}</div>
              <span className="ckm-aid__verdict" style={{ color: detail.vcol, borderColor: detail.vcol }}>
                {detail.verdict}
              </span>
            </div>
            <div className="ckm-aid__divider" />
            {detail.quote && <p className="ckm-aid__quote">“{detail.quote}”</p>}
          </div>

          {detail.facets.length > 0 && (
            <div className="ckm-aid__facets">
              {detail.facets.map((f) => (
                <div key={f.label} className="ckm-aid__facet">
                  <div className="ckm-aid__facet-label">{f.label}</div>
                  <div className="ckm-aid__facet-value">{f.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="ckm-aid__lists">
            <DetailList kicker="Strengths" accent items={detail.strengths} />
            <DetailList kicker="To Improve" items={detail.improve} />
          </div>

          <DetailList kicker="Recommendations" items={detail.recommendations} ordered />

          {(detail.audienceFit || detail.comparables) && (
            <div className="ckm-aid__audience">
              {detail.audienceFit && (
                <>
                  <div className="ckm-aid__list-kicker">Audience &amp; Market</div>
                  <p className="ckm-aid__audience-body">{detail.audienceFit}</p>
                </>
              )}
              {detail.comparables && (
                <>
                  <div className="ckm-aid__list-kicker">Comparable Titles</div>
                  <p className="ckm-aid__audience-body">{detail.comparables}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
