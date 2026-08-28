/**
 * Turning a panel's opinions into a suggested ranking.
 *
 * COMPUTED ON READ, never stored — the same stance utils/competitionPhase.js takes for the phase, and
 * for the same reason. An admin voiding a score, a late submission, or a judge finishing overnight
 * must move the ranking on the next load. A stored aggregate is how a competition gets declared
 * against numbers that stopped being true.
 *
 * (ProducerRating denormalises its average onto Script via a post-save hook, and that is right there:
 * it is read on every card in the product. This is read by one admin on one screen. There is no
 * read-volume case to trade correctness for.)
 *
 * A pure function taking plain objects, so it unit-tests against fixtures with no database — the
 * shape competitionEntrySummary.js established.
 */

/**
 * Read one criterion's mark off a score row.
 *
 * `scores` is a Mongoose Map on a hydrated document but a plain object once .lean() has been through
 * it, and both shapes reach here depending on the caller. Handling both is cheaper than forcing every
 * call site to remember which it has.
 */
const readMark = (scores, key) => {
  if (!scores) return undefined;
  const raw = typeof scores.get === "function" ? scores.get(key) : scores[key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Normalise the admin's weights to fractions summing to 1.
 *
 * Weights are relative on purpose: an admin typing 3 / 2 / 1 gets a sensible rubric without being
 * made to do arithmetic that the machine can do. All-zero (or absent) weights mean "these matter
 * equally", which is the only sane reading of an unweighted rubric.
 */
export const normaliseWeights = (criteria = []) => {
  const keys = criteria.map((c) => c?.key).filter(Boolean);
  if (!keys.length) return {};

  const raw = {};
  let total = 0;
  for (const c of criteria) {
    if (!c?.key) continue;
    const w = Number(c.weight);
    const safe = Number.isFinite(w) && w > 0 ? w : 0;
    raw[c.key] = safe;
    total += safe;
  }

  if (total <= 0) {
    const equal = 1 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, equal]));
  }
  return Object.fromEntries(keys.map((k) => [k, (raw[k] || 0) / total]));
};

/**
 * One judge's verdict on one entry, as a single 0..100 number.
 *
 * A criterion this judge did not mark is NOT counted as zero — their weights are renormalised across
 * what they did mark. Imputing zero would punish an entry because an admin added a criterion after
 * judging began, which is a change to the rubric masquerading as an opinion about the script.
 *
 * @returns {{ total: number, scored: string[], complete: boolean } | null} null when nothing was marked
 */
export const scoreToTotal = (score, criteria = [], scale = 10) => {
  const weights = normaliseWeights(criteria);
  const keys = Object.keys(weights);
  if (!keys.length) return null;

  const safeScale = Number(scale) > 0 ? Number(scale) : 10;

  const scored = keys.filter((k) => readMark(score?.scores, k) !== undefined);
  if (!scored.length) return null;

  const presentWeight = scored.reduce((sum, k) => sum + weights[k], 0);
  if (presentWeight <= 0) return null;

  const total = scored.reduce((sum, k) => {
    const mark = Math.min(Math.max(readMark(score.scores, k), 0), safeScale);
    // Renormalise against the weight actually present, so a partial score still lands on 0..100.
    return sum + (mark / safeScale) * (weights[k] / presentWeight) * 100;
  }, 0);

  return { total: round2(total), scored, complete: scored.length === keys.length };
};

/**
 * Build the admin's suggested ranking.
 *
 * @param {object} judging  competition.judging — criteria, weights, scale
 * @param {Array}  entries  every judgeable entry, so an unscored one still appears in the table
 * @param {Array}  scores   JudgeScore rows; only `submitted` ones are counted
 * @returns {{ rows: Array, meta: object }}
 */
export const buildJudgingLeaderboard = (judging = {}, entries = [], scores = []) => {
  const criteria = Array.isArray(judging.criteria) ? judging.criteria.filter((c) => c?.key) : [];
  const scale = Number(judging.scale) > 0 ? Number(judging.scale) : 10;
  const weights = normaliseWeights(criteria);

  // Only finished opinions count. A draft is a judge thinking, not a judge deciding.
  const submitted = scores.filter((s) => s?.status === "submitted");

  const byEntry = new Map();
  for (const s of submitted) {
    const key = String(s.entry || "");
    if (!key) continue;
    if (!byEntry.has(key)) byEntry.set(key, []);
    byEntry.get(key).push(s);
  }

  const rows = entries.map((entry) => {
    const id = String(entry?._id || "");
    const entryScores = byEntry.get(id) || [];

    const totals = [];
    let anyPartial = false;
    for (const s of entryScores) {
      const result = scoreToTotal(s, criteria, scale);
      if (!result) continue;
      totals.push(result.total);
      if (!result.complete) anyPartial = true;
    }

    // Per-criterion means, so an admin can see WHERE a script won rather than only that it did.
    const perCriterion = {};
    for (const c of criteria) {
      const marks = entryScores
        .map((s) => readMark(s.scores, c.key))
        .filter((m) => m !== undefined);
      perCriterion[c.key] = marks.length
        ? { mean: round2(marks.reduce((a, b) => a + b, 0) / marks.length), min: Math.min(...marks), max: Math.max(...marks), count: marks.length }
        : { mean: null, min: null, max: null, count: 0 };
    }

    return {
      entryId: id,
      eventId: entry?.eventId || "",
      title: entry?.snapshot?.title || "",
      judgeCount: totals.length,
      // The MEAN of judge totals, never the sum: a sum lets an entry three judges happened to read
      // beat one two judges read on headcount alone. judgeCount sits beside it so thin coverage stays
      // visible instead of being folded invisibly into the number.
      weightedMean: totals.length ? round2(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
      // How far apart the panel was. The disagreement signal an admin needs before trusting a rank.
      spread: totals.length > 1 ? round2(Math.max(...totals) - Math.min(...totals)) : 0,
      perCriterion,
      partialScores: anyPartial,
      suggestedRank: null,
      tiedWith: [],
    };
  });

  // Standard competition ranking: 1, 2, 2, 4. Compared at 2dp, so 74.9999 and 75.0001 tie rather
  // than claiming a precision five people's opinions do not have.
  const ranked = rows.filter((r) => r.weightedMean !== null).sort((a, b) => b.weightedMean - a.weightedMean);
  let rank = 0;
  ranked.forEach((row, i) => {
    if (i === 0 || row.weightedMean !== ranked[i - 1].weightedMean) rank = i + 1;
    row.suggestedRank = rank;
  });
  for (const row of ranked) {
    if (row.weightedMean === null) continue;
    row.tiedWith = ranked
      .filter((r) => r !== row && r.weightedMean === row.weightedMean)
      .map((r) => r.entryId);
  }

  // Ties are NEVER broken automatically. spread, judgeCount and the per-criterion means are surfaced
  // so a human can choose; applying any of them as a tiebreak would make the machine the decider.
  const judgeIds = new Set(submitted.map((s) => String(s.judge || "")));

  return {
    rows: rows.sort((a, b) => {
      if (a.weightedMean === null && b.weightedMean === null) return String(a.eventId).localeCompare(String(b.eventId));
      if (a.weightedMean === null) return 1;   // unscored entries sink, they are not last place
      if (b.weightedMean === null) return -1;
      return b.weightedMean - a.weightedMean;
    }),
    meta: {
      criteria: criteria.map((c) => ({ key: c.key, label: c.label || c.key, weight: round2((weights[c.key] || 0) * 100) })),
      scale,
      entryCount: entries.length,
      scoredEntryCount: rows.filter((r) => r.weightedMean !== null).length,
      judgeCount: judgeIds.size,
      submittedScoreCount: submitted.length,
      draftScoreCount: scores.length - submitted.length,
      hasTies: rows.some((r) => r.tiedWith.length > 0),
    },
  };
};

/**
 * Count nominations per award category, so the admin can see who the panel put forward.
 *
 * Deliberately NOT folded into the ranking. A special award is a different question from "who was
 * best overall", and merging the two would let a nomination quietly move a rank.
 */
export const tallyNominations = (awards = [], nominations = [], entries = []) => {
  const entryById = new Map(entries.map((e) => [String(e?._id || ""), e]));

  return awards
    .filter((a) => a?.key)
    .map((award) => {
      const forAward = nominations.filter((n) => n?.awardKey === award.key);
      const counts = new Map();
      for (const n of forAward) {
        const key = String(n.entry || "");
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const ranked = [...counts.entries()]
        .map(([entryId, count]) => {
          const entry = entryById.get(entryId);
          return {
            entryId,
            eventId: entry?.eventId || "",
            title: entry?.snapshot?.title || "",
            count,
            reasons: forAward.filter((n) => String(n.entry) === entryId).map((n) => n.reason).filter(Boolean),
          };
        })
        .sort((a, b) => b.count - a.count);

      const top = ranked.length ? ranked[0].count : 0;
      const leaders = ranked.filter((r) => r.count === top && top > 0);

      return {
        key: award.key,
        label: award.label || award.key,
        nominations: ranked,
        // A tie leaves no suggestion rather than picking one — same rule as the ranking.
        suggested: leaders.length === 1 ? leaders[0] : null,
        tied: leaders.length > 1,
      };
    });
};

export default buildJudgingLeaderboard;
