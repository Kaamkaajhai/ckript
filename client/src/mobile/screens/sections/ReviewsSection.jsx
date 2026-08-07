import { useState } from "react";
import Icon from "../../components/Icon";
import EmptyState from "../../components/EmptyState";
import LoadMore from "../../components/lists/LoadMore";
import { PAGE_SIZE } from "../../data/dashboardData";
import "./ReviewsSection.css";

/*
 * ReviewsSection — two lenses on the same catalogue: AI Analysis (model
 * scores + criterion bars, each openable in a detail sheet) and Platform
 * Insights (human/platform grades + reviewer feedback). Each list paginates
 * with a "View more" pill. View-state is local, so leaving and returning
 * resets to the first page — the expected mobile behaviour.
 *
 * 2026-08-07 (plan §11 Phase 2): the numbers and words on these cards are now
 * the server's. They used to come from a mapping that read `review.score` and
 * `review.summary`, neither of which the payload has — so every card scored
 * 0/100 with four identical empty bars and one hardcoded sentence, about real
 * scripts. The mapping now lives in `data/dashboardModel.js` and reads the
 * fields the controller actually sends (`rating`, `overall`, `scores`,
 * `feedback`). Desktop shows one card at a time in a carousel; a list that
 * grows is the phone equivalent, so that difference is kept.
 */
export default function ReviewsSection({ onOpenAiDetail, aiReviews, platformReviews }) {
  const [rtab, setRtab] = useState("ai");
  const [aiShown, setAiShown] = useState(PAGE_SIZE);
  const [plShown, setPlShown] = useState(PAGE_SIZE);

  const isAi = rtab === "ai";

  return (
    <div className="ckm-rev">
      <div className="ckm-rev__head">
        <Icon name="auto_awesome" size={22} fill color="var(--ckm-accent)" />
        <h3 className="ckm-rev__title">Reviews &amp; Insights</h3>
      </div>

      <div className="ckm-rev__subtabs">
        <button
          type="button"
          className={`ckm-rev__subtab${isAi ? " is-active" : ""}`}
          onClick={() => setRtab("ai")}
        >
          AI Analysis
        </button>
        <button
          type="button"
          className={`ckm-rev__subtab${!isAi ? " is-active" : ""}`}
          onClick={() => setRtab("platform")}
        >
          Platform Insights
        </button>
      </div>

      {isAi ? (
        <AiList shown={aiShown} onMore={() => setAiShown((n) => n + PAGE_SIZE)} onOpenDetail={onOpenAiDetail} aiReviews={aiReviews} />
      ) : (
        <PlatformList shown={plShown} onMore={() => setPlShown((n) => n + PAGE_SIZE)} platformReviews={platformReviews} />
      )}
    </div>
  );
}

function ScoreBars({ bars }) {
  return (
    <div className="ckm-rev__bars">
      {bars.map((b) => (
        <div key={b.label} className="ckm-rev__bar-row">
          <span className="ckm-rev__bar-label">{b.label}</span>
          <div className="ckm-rev__bar-track">
            <div className="ckm-rev__bar-fill" style={{ width: b.w }} />
          </div>
          <span className="ckm-rev__bar-val">{b.val}</span>
        </div>
      ))}
    </div>
  );
}

function AiList({ shown, onMore, onOpenDetail, aiReviews }) {
  if (!aiReviews || !aiReviews.length) {
    return <EmptyState icon="auto_awesome" title="No AI analyses yet" body="Score a script to see insights here." />;
  }
  const list = aiReviews.slice(0, shown);
  const hasMore = shown < aiReviews.length;

  return (
    <>
      <div className="ckm-rev__count-row">
        <span className="ckm-rev__count-kicker">AI Analyses</span>
        <span className="ckm-rev__count">
          Showing {list.length} of {aiReviews.length}
        </span>
      </div>
      <div className="ckm-rev__list">
        {list.map((rev) => (
          <article key={rev.id} className="ckm-rev__card">
            <div className="ckm-rev__card-top">
              <div className="ckm-rev__card-heading">
                <div className="ckm-rev__eyebrow">AI-Powered Analysis</div>
                <h4 className="ckm-rev__card-title">{rev.title}</h4>
              </div>
              <div className="ckm-rev__card-score">
                <div className="ckm-rev__score-num">
                  {rev.score}
                  <span className="ckm-rev__score-out">/100</span>
                </div>
                <span className="ckm-rev__verdict" style={{ background: rev.vbg, color: rev.vcol }}>
                  {rev.verdict}
                </span>
              </div>
            </div>
            {rev.bars.length > 0 && <ScoreBars bars={rev.bars} />}
            <div className="ckm-rev__card-foot">
              {/* An analysis without written feedback is possible; an empty
                  quotation mark pretending otherwise is not. */}
              {rev.excerpt && <span className="ckm-rev__excerpt">{rev.excerpt}</span>}
              <button type="button" className="ckm-rev__details" onClick={() => onOpenDetail?.(rev)}>
                Details
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {hasMore && (
        <LoadMore
          loaded={list.length}
          total={aiReviews.length}
          pageSize={PAGE_SIZE}
          noun="analyses"
          onLoadMore={onMore}
        />
      )}
    </>
  );
}

function PlatformList({ shown, onMore, platformReviews }) {
  if (!platformReviews || !platformReviews.length) {
    return <EmptyState icon="reviews" title="No platform reviews yet" body="Publish a script to receive platform insights." />;
  }
  const list = platformReviews.slice(0, shown);
  const hasMore = shown < platformReviews.length;

  return (
    <>
      <div className="ckm-rev__count-row">
        <span className="ckm-rev__count-kicker">Platform Reviews</span>
        <span className="ckm-rev__count">
          Showing {list.length} of {platformReviews.length}
        </span>
      </div>
      <div className="ckm-rev__list">
        {list.map((rev) => (
          <article key={rev.id} className="ckm-rev__card">
            <div className="ckm-rev__card-top">
              <div className="ckm-rev__card-heading">
                <div className="ckm-rev__eyebrow">Platform Review</div>
                <h4 className="ckm-rev__card-title">{rev.title}</h4>
              </div>
              <div className="ckm-rev__card-score">
                <div className="ckm-rev__score-num">
                  {rev.score}
                  <span className="ckm-rev__score-out">/100</span>
                </div>
                <span className="ckm-rev__verdict" style={{ background: rev.gbg, color: rev.gcol }}>
                  {rev.grade}
                </span>
              </div>
            </div>
            {rev.bars.length > 0 && <ScoreBars bars={rev.bars} />}
            {rev.feedback && (
              <div className="ckm-rev__feedback">
                <div className="ckm-rev__feedback-kicker">Reviewer feedback</div>
                <p className="ckm-rev__feedback-body">{rev.feedback}</p>
              </div>
            )}
          </article>
        ))}
      </div>
      {hasMore && (
        <LoadMore
          loaded={list.length}
          total={platformReviews.length}
          pageSize={PAGE_SIZE}
          noun="reviews"
          onLoadMore={onMore}
        />
      )}
    </>
  );
}
