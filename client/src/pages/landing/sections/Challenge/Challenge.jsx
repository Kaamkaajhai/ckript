import { Link } from "react-router-dom";
import Icon from "../../_shared/Icon";
import { RED } from "../../_shared/theme";
import CompetitionCard from "../../../../components/competition/CompetitionCard";
import {
  KICKER, HERO_FIGURE, HERO_LINES, LEAD, CARDS, WINNER_FACTS, ENTRY_CHIPS, FLOW, CTA,
} from "./challenge.data";
import "./Challenge.css";

/**
 * The Challenge, on the landing page.
 *
 * FIVE BEATS: the figure, three cards, one laureate, who can enter, the ask. Each beat carries one
 * idea and the visitor should finish it curious rather than informed — the homepage exists to make
 * them click into /challenge, and /challenge exists to answer everything they then want to know.
 *
 * What is deliberately ABSENT is the point of the design: no numbered steps, no judging criteria,
 * no ownership paragraphs, no statistics band, no tab strip. Every one of those lives on the hub.
 * Duplicating them here would give the two pages the same job and guarantee they drift apart.
 *
 * The section is evergreen apart from a single phase branch on the closing button, because there is
 * no competition running for most of the year. ChallengeStrip under the hero carries the urgency
 * when there is any.
 */

const Challenge = ({ phase, competition, winner }) => {
  // The one place this section reacts to phase. Everything else reads the same in every month of
  // the year, which is what stops the homepage going stale between competitions.
  const open = phase === "registration_open" && competition?.slug;
  const cta = open
    ? { label: "Register", to: `/challenge/register?c=${competition.slug}` }
    : { label: CTA.label, to: CTA.to };

  return (
    <section className="ckl-chal">
      <div className="ckl-chal-inner">

        {/* ── 1 · The figure ─────────────────────────────────────────────────────────────────── */}
        <div className="ckl-chal-open">
          <div className="ckl-kicker" data-ra="ckl-fadeUp">{KICKER}</div>

          <div className="ckl-chal-open-grid">
            {/* The number is the section's one strong visual. It is decorative at this size — the
                unit beneath carries the meaning for anyone not seeing the type. */}
            <div className="ckl-chal-figure" data-ra="ckl-fadeUp" data-rd="0.06">
              <span className="ckl-chal-figure-n" aria-hidden="true">{HERO_FIGURE.value}</span>
              <span className="ckl-chal-figure-u">{HERO_FIGURE.unit}</span>
            </div>

            <div className="ckl-chal-open-text" data-ra="ckl-fadeUp" data-rd="0.12">
              <h2 className="ckl-h2 ckl-chal-h2">
                {HERO_LINES[0]}<br />
                <span className="ckl-h2-em">{HERO_LINES[1]}</span>
              </h2>
              <p className="ckl-lead ckl-chal-lead">{LEAD}</p>
            </div>
          </div>
        </div>
        
        {/* Live challenge card added as requested */}
        {competition ? (
          <div style={{ marginTop: "40px", marginBottom: "40px", maxWidth: "800px", marginInline: "auto" }} data-ra="ckl-fadeUp" data-rd="0.15">
            <CompetitionCard 
              item={competition} 
              variant={phase === "announced" ? "upcoming" : "live"} 
              to={`/challenge/c/${competition.slug}`} 
              serverNow={Date.now()} 
            />
          </div>
        ) : null}

        {/* ── 2 · Three cards ────────────────────────────────────────────────────────────────── */}
        <div className="ckl-chal-cards">
          {CARDS.map((card, i) => (
            <div key={card.title} className="ckl-chal-card" data-ra="ckl-fadeUp" data-rd={(i * 0.06).toFixed(2)}>
              {/* Material Symbols render as a ligature, so the glyph's NAME is its text content —
                  a screen reader announces "lock" unless it is hidden. The icon is decorative here;
                  the title beneath carries the meaning. */}
              <span aria-hidden="true"><Icon name={card.icon} size={26} color={RED} /></span>
              <h3 className="ckl-chal-card-t">{card.title}</h3>
              <p className="ckl-chal-card-b">{card.body}</p>
            </div>
          ))}
        </div>

        {/* ── 3 · One laureate ───────────────────────────────────────────────────────────────────
            Renders only when a completed competition has a winner. No placeholder person and no
            empty frame — an invented laureate on a homepage is worse than none at all.

            Note what is NOT here: a quote. The only prose the API carries for a winner is the
            logline, and `loglineByAi` is true whenever Ckript generated it — which is the case for
            the only winner in the database today. Setting machine-written text in quotation marks
            under a real writer's name would attribute words to them they did not write. */}
        {winner ? (
          <div className="ckl-chal-laureate" data-ra="ckl-fadeUp">
            <div className="ckl-chal-laureate-main">
              <p className="ckl-chal-laureate-meta">
                {winner.competitionName}{winner.year ? ` · ${winner.year}` : ""}
              </p>
              <p className="ckl-chal-laureate-award">Winner</p>
              <p className="ckl-chal-laureate-name">{winner.name}</p>
              {winner.scriptTitle ? (
                <p className="ckl-chal-laureate-script">{winner.scriptTitle}</p>
              ) : null}
            </div>

            <div className="ckl-chal-laureate-facts">
              {WINNER_FACTS.map((f) => (
                <div key={f.label} className="ckl-chal-fact">
                  <span className="ckl-chal-fact-l">{f.label}</span>
                  <span className="ckl-chal-fact-v">{f.value}</span>
                </div>
              ))}
              <Link to="/hall-of-fame" className="ckl-chal-laureate-link">
                View Hall of Fame
                <span aria-hidden="true"><Icon name="arrow_forward" size={17} /></span>
              </Link>
            </div>
          </div>
        ) : null}

        {/* ── 4 · Who, and the shape of it ───────────────────────────────────────────────────────
            One screen, no explanation. The chips are examples and the flow carries no ordinals —
            the moment this grows numbers it becomes the six-step block that belongs on the hub. */}
        <div className="ckl-chal-anyone">
          <p className="ckl-chal-anyone-h" data-ra="ckl-fadeUp">Anyone can enter.</p>

          <div className="ckl-chal-chips">
            {ENTRY_CHIPS.map((chip, i) => (
              <span key={chip} className="ckl-chal-chip" data-ra="ckl-fadeUp" data-rd={(i * 0.04).toFixed(2)}>
                {chip}
              </span>
            ))}
          </div>

          <ol className="ckl-chal-flow" data-ra="ckl-fadeUp" data-rd="0.12">
            {FLOW.map((step, i) => (
              <li key={step} className="ckl-chal-flow-i">
                <span className="ckl-chal-flow-t">{step}</span>
                {i < FLOW.length - 1 ? <span className="ckl-chal-flow-r" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>
        </div>

        {/* ── 5 · The ask ────────────────────────────────────────────────────────────────────── */}
        <div className="ckl-chal-cta" data-ra="ckl-fadeUp">
          <h3 className="ckl-chal-cta-h">{CTA.headline}</h3>
          <p className="ckl-chal-cta-l">{CTA.line}</p>
          <Link to={cta.to} className="ckl-chal-btn hov-btn-lift">{cta.label}</Link>
        </div>

      </div>
    </section>
  );
};

export default Challenge;
