import { Link } from "react-router-dom";
import { Trophy, Award, Users, Globe, Medal } from "lucide-react";
import { Avatar } from "./ui";
import { yearSuffix } from "./labels";
import CountdownTimer from "./CountdownTimer";

/**
 * One competition, as a card.
 *
 * Lifted verbatim out of HallOfFame.jsx so the Challenge hub can list live and upcoming
 * competitions with the same visual language the archive already uses — a second, near-identical
 * card would drift within a release.
 *
 * `variant` changes only the destination and the footer:
 *   "past"     the archive card — links to the Hall of Fame record, shows who won.
 *   "live"     a competition you can still act on — links to the competition page, shows what phase
 *              it is in and how long is left.
 *   "upcoming" announced but not open — links to the competition page, shows when it opens.
 */

const PHASE_LABELS = {
  announced: "Announced",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  live: "Writing under way",
  judging: "Judging",
  results: "Results declared",
};

// `icon` is a rendered element rather than a component reference: a destructured param renamed to
// PascalCase and used only inside JSX is not seen as used by no-unused-vars in this config.
const PersonLine = ({ label, person, icon }) => {
  if (!person) return null;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar src={person.profileImage} name={person.name} size={30} />
      <div className="min-w-0">
        <p className="ckc-meta flex items-center gap-1.5">{icon} {label}</p>
        <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)", marginTop: 1 }}>
          {person.name}
        </p>
      </div>
    </div>
  );
};

/** The next deadline that actually matters to a writer, given where the competition is. */
const countdownFor = (item) => {
  const d = item.dates || {};
  if (item.phase === "registration_open") return { label: "Registration closes in", at: d.regClosesAt };
  if (item.phase === "registration_closed") return { label: "Theme released in", at: d.startsAt };
  if (item.phase === "live") return { label: "Deadline in", at: d.endsAt };
  if (item.phase === "announced") return { label: "Registration opens in", at: d.regOpensAt };
  return null;
};

const fmt = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "";

const CompetitionCard = ({ item, variant = "past", serverNow, to }) => {
  const isArchive = variant === "past";
  // Destination is the caller's choice. The hub points every card — finished ones included — at the
  // competition's own page, because the challenge page is meant to be the destination rather than a
  // signpost. The standalone /hall-of-fame index still points at its own records.
  const href = to || (isArchive ? `/hall-of-fame/${item.slug}` : `/challenge/c/${item.slug}`);
  const countdown = isArchive ? null : countdownFor(item);
  // Only a competition you can act on right now gets the accent band and the pulsing dot.
  const isRunning = item.phase === "live" || item.phase === "registration_open";
  // The counts are NOT guaranteed on an archive card. The hub's "past" bucket also holds
  // competitions still being judged, and those have no record in /competitions/completed to merge
  // stats in from — so the footer printed a bare " entrants" / " countries" with the number missing.
  // Tested for presence rather than truthiness: a competition that genuinely had no entrants should
  // still be able to say "0 entrants".
  const hasEntrantCount = Number.isFinite(item.totalParticipants);
  const hasCountryCount = Number.isFinite(item.countriesRepresented);

  return (
    <Link to={href} className={`ckc-card ${isRunning ? "ckc-live" : ""}`}>
      {/* Only a real banner earns image height. The placeholder gradient was decoration that
          pushed every actual detail below the fold. */}
      {item.bannerUrl ? (
        <img src={item.bannerUrl} alt="" style={{ height: 128, width: "100%", objectFit: "cover", borderRadius: "3px 3px 0 0" }} />
      ) : null}

      <div className="ckc-card-pad">
        <div className="flex items-center justify-between gap-3">
          <span className="ckc-meta">
            {isArchive ? (item.resultsDeclaredAt ? "Concluded" : "Awaiting results") : (PHASE_LABELS[item.phase] || item.phase)}
          </span>
          {isRunning ? <span className="ckc-dot" aria-hidden="true" /> : null}
          {yearSuffix(item.name, item.year) ? <span className="ckc-meta">{item.year}</span> : null}
        </div>

        <h3 className="ckc-title ckc-h3" style={{ marginTop: 10 }}>{item.name}</h3>

        {/* Only ever set once the reveal has happened — the server withholds it before that.
            Coral only while the competition is actually running: the accent is reserved for live
            state, and an archive card's theme is decoration. Spending it on every past card is what
            makes the accent stop meaning anything. */}
        {item.theme ? (
          <p style={{ marginTop: 6, fontFamily: "var(--ckc-display)", fontStyle: "italic", fontSize: 16, color: isRunning ? "var(--ckc-accent-text)" : "var(--ckc-ink)" }}>
            {item.theme}
          </p>
        ) : null}

        <p className="ckc-meta" style={{ marginTop: 12, letterSpacing: "0.06em" }}>
          {fmt(item.dates?.startsAt)}
          {item.dates?.endsAt ? ` – ${fmt(item.dates.endsAt)}` : ""}
        </p>

        {item.prizePool ? (
          <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)" }}>{item.prizePool}</p>
        ) : null}

        {isArchive ? (
          <div className="mt-5 space-y-3 pt-4" style={{ borderTop: "1px solid var(--ckc-rule)" }}>
            <PersonLine
              label="Winner"
              person={item.winner}
              icon={<Trophy className="h-3 w-3 text-amber-500" aria-hidden="true" />}
            />
            <PersonLine
              label="Runner-Up"
              person={item.runnerUp}
              icon={<Award className="h-3 w-3 text-gray-400" aria-hidden="true" />}
            />
            {/* Category winners belong on the record too — listing only the top two erased them
                from the archive even though the API returns them. */}
            {(item.special || []).map((p, i) => (
              <PersonLine
                key={p.userId || i}
                label={p.specialTitle || "Special Award"}
                person={p}
                icon={<Medal className="h-3 w-3 text-[#D14D37]" aria-hidden="true" />}
              />
            ))}
            {!item.winner && !item.runnerUp && !(item.special || []).length ? (
              <p style={{ fontSize: 14, color: "var(--ckc-muted)" }}>
                {item.resultsDeclaredAt ? "Results archived." : "Results not announced yet."}
              </p>
            ) : null}
          </div>
        ) : countdown?.at ? (
          <div className="mt-5 flex items-center justify-between gap-3 pt-4" style={{ borderTop: "1px solid var(--ckc-rule)" }}>
            <span className="ckc-meta">{countdown.label}</span>
            <CountdownTimer target={countdown.at} serverNow={serverNow} size="sm" />
          </div>
        ) : null}

        {isArchive && (hasEntrantCount || hasCountryCount) ? (
          <div className="mt-4 flex gap-5">
            {hasEntrantCount ? (
              <span className="ckc-meta inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" aria-hidden="true" /> {item.totalParticipants}
                {item.totalParticipants === 1 ? " entrant" : " entrants"}
              </span>
            ) : null}
            {hasCountryCount ? (
              <span className="ckc-meta inline-flex items-center gap-1.5">
                <Globe className="h-3 w-3" aria-hidden="true" /> {item.countriesRepresented}
                {item.countriesRepresented === 1 ? " country" : " countries"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
};

export default CompetitionCard;
