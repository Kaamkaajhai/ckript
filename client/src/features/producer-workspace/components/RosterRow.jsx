/*
 * RosterRow — one line of the register.
 *
 * The row selects into the detail pane rather than navigating; the navigation
 * lives on one button in that pane. That is the point of the layout — you can
 * read twenty writers without losing the list — and it is also what buys the
 * row down to 44px, since no per-row action has to fit inside it.
 *
 * It is a `role="row"` in a real grid rather than a <button>, because a button
 * carrying role="row" would lose its button semantics anyway and gain nothing.
 * The grid owns the keyboard model: roving tabindex, so Tab does not walk a
 * hundred rows to get past the register, with arrows moving between them.
 */
import { memo } from "react";
import {
  formatCount,
  formatScore,
  getBioLine,
  getCredentialBadges,
  getFollowers,
  getScoreBand,
  getScriptCount,
  getViews,
} from "../writerRoster";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

const RosterRow = ({
  writer,
  rank,
  selected,
  focused,
  isLead,
  matchesMandate,
  onSelect,
  rowRef,
}) => {
  const avatar = resolveMediaUrl(writer.profileImage);
  const badges = getCredentialBadges(writer);
  const band = getScoreBand(writer);
  const name = writer.name || "Unnamed writer";
  const bio = getBioLine(writer);

  return (
    <div
      ref={rowRef}
      role="row"
      aria-rowindex={rank + 1}
      aria-selected={selected}
      tabIndex={focused ? 0 : -1}
      onClick={() => onSelect(writer._id)}
      className={[
        "ckr-row",
        isLead ? "is-lead" : "",
        selected ? "is-sel" : "",
      ].filter(Boolean).join(" ")}
    >
      <span className="ckr-rank" role="gridcell">{rank}</span>

      <span className="ckr-id" role="gridcell">
        {avatar
          ? <img className="ckr-av ckr-av--img" src={avatar} alt="" loading="lazy" />
          : <span className="ckr-av" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}

        <span className="ckr-name" title={name}>{name}</span>

        {badges.map((badge) => <span key={badge} className="ckr-badge">{badge}</span>)}

        <span className="ckr-bio" title={bio}>{bio}</span>

        {matchesMandate && (
          <span className="ckr-dot" aria-hidden="true" title="Matches your mandate genres" />
        )}
        {matchesMandate && <span className="ckr-sr">Matches your mandate genres</span>}
      </span>

      {/* `data-unit` labels the metrics once the row stacks into a 2×2 block
          and the column strip is no longer above them. */}
      <span className="ckr-m" role="gridcell" data-unit="scripts">{getScriptCount(writer)}</span>
      <span className="ckr-m ckr-m--soft" role="gridcell" data-unit="views">{formatCount(getViews(writer))}</span>
      <span
        className={`ckr-m${band ? ` ckr-m--${band}` : " ckr-m--none"}`}
        role="gridcell"
        data-unit="score"
      >
        {formatScore(writer)}
      </span>
      <span className="ckr-m ckr-m--soft" role="gridcell" data-unit="fans">{formatCount(getFollowers(writer))}</span>
    </div>
  );
};

/*
 * A hundred rows would otherwise re-render on every keyboard step — only the
 * two whose focus or selection actually changed need to.
 */
export default memo(RosterRow);
