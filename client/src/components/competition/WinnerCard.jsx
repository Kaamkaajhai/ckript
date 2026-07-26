import { Link } from "react-router-dom";
import { Avatar } from "./ui";

/**
 * A person who won something — the unit the Hall of Fame is actually about.
 *
 * The archive lists competitions; the Hall of Fame lists WRITERS. Same data, opposite emphasis: the
 * writer's name and face lead, and the competition is the footnote that says when.
 *
 * Links to the writer's profile and nothing else. Competition entries stay private drafts, so there
 * is deliberately no path from here to a script — the server does not even return a scriptId.
 */

const AWARD_STYLE = {
  winner: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  runner_up: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  special: "bg-[#D14D37]/10 text-[#D14D37]",
};

const AWARD_LABEL = { winner: "Winner", runner_up: "Runner-Up", special: "Special Award" };

const WinnerCard = ({ person, award, competitionName, year }) => {
  if (!person) return null;

  return (
    <Link
      to={`/share/profile/${person.userId}`}
      className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#D14D37] hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start gap-4">
        <Avatar src={person.profileImage} name={person.name} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white">{person.name}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${AWARD_STYLE[award] || AWARD_STYLE.special}`}>
              {person.specialTitle || AWARD_LABEL[award] || "Award"}
            </span>
          </div>
          {person.username ? (
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">@{person.username}</p>
          ) : null}
        </div>
      </div>

      {person.scriptTitle ? (
        <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{person.scriptTitle}</p>
      ) : null}

      {person.logline ? (
        <p className="mt-1.5 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">{person.logline}</p>
      ) : null}

      <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {competitionName}{year ? ` · ${year}` : ""}
      </p>
    </Link>
  );
};

export default WinnerCard;
