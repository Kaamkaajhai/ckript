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
      <Avatar src={person.profileImage} name={person.name} size={32} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {icon} {label}
        </p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{person.name}</p>
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

  return (
    <Link
      to={href}
      className="block rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-[#D14D37] hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {item.bannerUrl ? (
        <img src={item.bannerUrl} alt="" className="h-32 w-full rounded-t-2xl object-cover" />
      ) : (
        <div className="h-32 w-full rounded-t-2xl bg-gradient-to-br from-[#D14D37]/15 to-[#D14D37]/5" />
      )}

      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.name}</h3>
          {yearSuffix(item.name, item.year) ? (
            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {item.year}
            </span>
          ) : null}
        </div>

        {/* Only ever set once the reveal has happened — the server withholds it before that. */}
        {item.theme ? <p className="mt-1 text-sm italic text-[#D14D37]">{item.theme}</p> : null}

        {!isArchive && item.phase ? (
          <span className="mt-3 inline-block rounded-full bg-[#D14D37]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#D14D37]">
            {PHASE_LABELS[item.phase] || item.phase}
          </span>
        ) : null}

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {fmt(item.dates?.startsAt)}
          {item.dates?.endsAt ? ` – ${fmt(item.dates.endsAt)}` : ""}
        </p>

        {item.prizePool ? (
          <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-100">{item.prizePool}</p>
        ) : null}

        {isArchive ? (
          <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-4 dark:border-gray-700">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.resultsDeclaredAt ? "Results archived." : "Results not announced yet."}
              </p>
            ) : null}
          </div>
        ) : countdown?.at ? (
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">{countdown.label}</span>
            <CountdownTimer target={countdown.at} serverNow={serverNow} size="sm" />
          </div>
        ) : null}

        {isArchive ? (
          <div className="mt-4 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> {item.totalParticipants} participants
            </span>
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" /> {item.countriesRepresented} countries
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
};

export default CompetitionCard;
