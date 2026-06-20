import Script from "../models/Script.js";
import User from "../models/User.js";
import InvestorInteraction from "../models/InvestorInteraction.js";

const INTERACTION_WEIGHT = {
  view: 1,
  click: 2,
  read: 3,
  like: 4,
  save: 5,
  time_spent: 2,
};

const SECTION_SIZE = 12;

const normalize = (v = "") => String(v || "").toLowerCase().trim();

const normalizeGenre = (value = "") => {
  const raw = normalize(value).replace(/[\s_]+/g, "-");
  if (!raw) return "";
  const map = {
    scifi: "sci-fi",
    "sci-fi": "sci-fi",
    "sci-fi-fi": "sci-fi",
    "science-fiction": "sci-fi",
  };
  return map[raw] || raw;
};

const normalizeFormat = (value = "") => {
  const raw = normalize(value);
  if (!raw) return "";
  if (raw.includes("song")) return "songs";
  if (raw.includes("standup") || raw.includes("stand-up")) return "standup-comedy";
  if (raw.includes("dialogue")) return "dialogues";
  if (raw.includes("poet") || raw.includes("poetry")) return "poet";
  if (raw === "movie") return "movie";
  if (raw.includes("feature")) return "feature";
  if (raw.includes("play")) return "play";
  if (raw.includes("short")) return "short";
  if (raw.includes("limited")) return "limited-series";
  if (raw.includes("web")) return "web-series";
  if (raw.includes("documentary")) return "documentary";
  if (raw.includes("anime") || raw.includes("animation") || raw.includes("cartoon")) return "anime";
  if (raw.includes("drama school")) return "drama-school";
  if (raw.includes("micro drama")) return "micro_drama";
  if (raw.includes("tv") || raw.includes("series")) return "tv-series";
  return raw.replace(/[\s_]+/g, "-");
};

const normalizeBudget = (value = "") => {
  const raw = normalize(value);
  if (!raw) return "";
  if (raw.includes("micro")) return "micro";
  if (raw.includes("low")) return "low";
  if (raw.includes("mid") || raw.includes("medium")) return "medium";
  if (raw.includes("high")) return "high";
  if (raw.includes("tentpole") || raw.includes("blockbuster")) return "blockbuster";
  return raw;
};

const inferGenresFromText = (text = "") => {
  const source = normalize(text);
  if (!source) return [];

  const hints = {
    horror: ["horror", "slasher", "supernatural", "haunted"],
    drama: ["drama", "dramatic", "family drama", "emotional"],
    thriller: ["thriller", "suspense", "crime thriller", "psychological"],
    comedy: ["comedy", "comic", "satire", "humor"],
    romance: ["romance", "romantic", "love story"],
    action: ["action", "high-octane", "adventure action"],
    mystery: ["mystery", "detective", "whodunit"],
    "sci-fi": ["sci-fi", "science fiction", "scifi", "futuristic"],
    fantasy: ["fantasy", "mythic", "magic"],
    documentary: ["documentary", "docu"],
  };

  const detected = [];
  for (const [genre, keywords] of Object.entries(hints)) {
    if (keywords.some((k) => source.includes(k))) detected.push(genre);
  }
  return detected;
};

const inferFormatsFromText = (text = "") => {
  const source = normalize(text);
  if (!source) return [];
  const detected = [];
  if (source.includes("song")) detected.push("songs");
  if (source.includes("standup") || source.includes("stand-up") || source.includes("comedy special")) detected.push("standup-comedy");
  if (source.includes("dialogue")) detected.push("dialogues");
  if (source.includes("poet") || source.includes("poetry")) detected.push("poet");
  if (source.includes("feature")) detected.push("feature");
  if (source.includes("movie")) detected.push("movie");
  if (source.includes("short")) detected.push("short");
  if (source.includes("web series") || source.includes("web-series")) detected.push("web-series");
  if (source.includes("limited series") || source.includes("limited-series")) detected.push("limited-series");
  if (source.includes("tv") || source.includes("series")) detected.push("tv-series");
  if (source.includes("documentary")) detected.push("documentary");
  if (source.includes("anime") || source.includes("animation") || source.includes("animated")) detected.push("anime");
  return [...new Set(detected)];
};

const inferBudgetsFromInvestmentRange = (value = "") => {
  const v = normalize(value);
  if (!v) return [];
  if (v.includes("under_50k")) return ["micro", "low"];
  if (v.includes("50k_250k")) return ["low", "medium"];
  if (v.includes("250k_1m")) return ["medium", "high"];
  if (v.includes("1m_5m")) return ["high", "blockbuster"];
  if (v.includes("over_5m")) return ["blockbuster", "high"];
  return [];
};

const sumMap = (mapObj, key, value) => {
  if (!key) return;
  mapObj[key] = (mapObj[key] || 0) + value;
};

const toSortedKeys = (obj = {}, max = 8) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);

const getExplicitSignals = (investor) => {
  const profileText = [
    investor?.bio,
    investor?.industryProfile?.jobTitle,
    investor?.industryProfile?.company,
    investor?.industryProfile?.previousCredits,
  ]
    .filter(Boolean)
    .join(" ");

  const mandateGenres = (investor?.industryProfile?.mandates?.genres || []).map(normalizeGenre);
  const prefGenres = (investor?.preferences?.genres || []).map(normalizeGenre);
  const excluded = (investor?.industryProfile?.mandates?.excludeGenres || []).map(normalizeGenre);
  const inferredGenres = inferGenresFromText(profileText).map(normalizeGenre);

  const mandateFormats = (investor?.industryProfile?.mandates?.formats || []).map(normalizeFormat);
  const inferredFormats = inferFormatsFromText(profileText).map(normalizeFormat);

  const inferredBudgets = inferBudgetsFromInvestmentRange(investor?.industryProfile?.investmentRange).map(normalizeBudget);
  const hookGenres = (investor?.industryProfile?.mandates?.specificHooks || []).flatMap((hook) =>
    inferGenresFromText(hook)
  );

  const profileTags = [
    ...(investor?.skills || []),
    ...(investor?.industryProfile?.mandates?.specificHooks || []),
  ]
    .map((tag) => normalize(tag))
    .filter(Boolean);

  return {
    genres: [...new Set([...mandateGenres, ...prefGenres, ...inferredGenres, ...hookGenres])].filter((g) => g && !excluded.includes(g)),
    formats: [...new Set([...mandateFormats, ...inferredFormats])].filter(Boolean),
    tags: [...new Set(profileTags)],
  };
};

const buildBehaviorSignals = async (investorId, bootstrap = {}) => {
  const interactions = await InvestorInteraction.find({ investor: investorId })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const bootstrapIds = [
    ...(bootstrap?.viewHistoryScriptIds || []),
    ...(bootstrap?.favoriteScriptIds || []),
    ...(bootstrap?.scriptsReadIds || []),
  ]
    .map((id) => id?.toString?.() || String(id || ""))
    .filter(Boolean);

  const scriptedInteractions = bootstrapIds.map((id) => ({
    script: id,
    type: bootstrap?.favoriteScriptIds?.some((f) => String(f) === id)
      ? "save"
      : bootstrap?.scriptsReadIds?.some((r) => String(r) === id)
      ? "read"
      : "view",
  }));

  const allInteractions = [...interactions, ...scriptedInteractions];

  if (!allInteractions.length) {
    return {
      genreWeights: {},
      tagWeights: {},
      formatWeights: {},
      budgetWeights: {},
      recentScriptIds: [],
      avgTimeSpentMs: 0,
    };
  }

  const scriptIds = [...new Set(allInteractions.map((i) => i.script.toString()))];
  const scripts = await Script.find({ _id: { $in: scriptIds } })
    .select("genre primaryGenre tags format contentType budget classification")
    .lean();
  const scriptMap = new Map(scripts.map((s) => [s._id.toString(), s]));

  const genreWeights = {};
  const tagWeights = {};
  const formatWeights = {};
  const budgetWeights = {};
  let timeSpentTotal = 0;
  let timeSpentCount = 0;

  for (const it of allInteractions) {
    const w = INTERACTION_WEIGHT[it.type] || 1;
    const script = scriptMap.get(it.script.toString());
    if (!script) continue;

    const primaryGenre = normalizeGenre(script.genre || script.primaryGenre || script?.classification?.primaryGenre || "");
    sumMap(genreWeights, primaryGenre, w * 1.2);

    const secondary = [
      script?.classification?.secondaryGenre,
      ...(script?.classification?.themes || []),
      ...(script?.classification?.tones || []),
    ].map(normalizeGenre);
    secondary.forEach((g) => sumMap(genreWeights, g, w * 0.45));

    (script.tags || []).map((t) => normalize(t)).forEach((t) => sumMap(tagWeights, t, w));

    const scriptFormats = [...new Set([
      normalizeFormat(script.format || ""),
      normalizeFormat(script.contentType || ""),
    ].filter(Boolean))];
    scriptFormats.forEach((fmt) => sumMap(formatWeights, fmt, w * 0.8));

    const budget = normalizeBudget(script.budget || "");
    sumMap(budgetWeights, budget, w * 0.7);

    if (it.type === "time_spent" && it.timeSpentMs > 0) {
      timeSpentTotal += it.timeSpentMs;
      timeSpentCount += 1;
    }
  }

  return {
    genreWeights,
    tagWeights,
    formatWeights,
    budgetWeights,
    recentScriptIds: scriptIds.slice(0, 100),
    avgTimeSpentMs: timeSpentCount ? Math.round(timeSpentTotal / timeSpentCount) : 0,
  };
};

const scoreProject = (project, signals, now) => {
  const { explicit, behavior } = signals;

  const primaryGenre = normalizeGenre(project.genre || project.primaryGenre || project?.classification?.primaryGenre || "");
  const secondaryGenres = [
    project?.classification?.secondaryGenre,
    ...(project?.classification?.themes || []),
    ...(project?.classification?.tones || []),
  ].map(normalizeGenre).filter(Boolean);

  const tags = (project.tags || []).map((t) => normalize(t)).filter(Boolean);
  const projectFormats = [...new Set([
    normalizeFormat(project.format || ""),
    normalizeFormat(project.contentType || ""),
  ].filter(Boolean))];
  const budget = normalizeBudget(project.budget || "");

  let interestMatch = 0;
  if (explicit.genres.includes(primaryGenre)) interestMatch += 0.45;
  if (secondaryGenres.some((g) => explicit.genres.includes(g))) interestMatch += 0.15;
  if (tags.some((t) => explicit.tags?.includes(t))) interestMatch += 0.12;
  if (projectFormats.some((fmt) => explicit.formats.includes(fmt))) interestMatch += 0.2;
  if (explicit.budgets.includes(budget)) interestMatch += 0.2;
  interestMatch = Math.min(1, interestMatch);

  let behaviorMatch = 0;
  behaviorMatch += (behavior.genreWeights[primaryGenre] || 0) * 0.04;
  behaviorMatch += secondaryGenres.reduce((n, g) => n + (behavior.genreWeights[g] || 0), 0) * 0.01;
  behaviorMatch += tags.reduce((n, t) => n + (behavior.tagWeights[t] || 0), 0) * 0.01;
  if (projectFormats.length > 0) {
    const strongestFormatWeight = Math.max(...projectFormats.map((fmt) => behavior.formatWeights[fmt] || 0));
    behaviorMatch += strongestFormatWeight * 0.02;
  }
  behaviorMatch += (behavior.budgetWeights[budget] || 0) * 0.02;
  behaviorMatch = Math.min(1, behaviorMatch);

  const popularity = Math.min(
    1,
    ((project.views || 0) / 1200) * 0.35 +
      ((project.readsCount || 0) / 300) * 0.25 +
      ((project.reviewCount || 0) / 100) * 0.2 +
      ((project.rating || 0) / 5) * 0.2
  );

  const createdAt = project.createdAt ? new Date(project.createdAt).getTime() : now;
  const ageDays = Math.max(0, (now - createdAt) / (24 * 60 * 60 * 1000));
  const recency = Math.exp(-ageDays / 30);

  const score = interestMatch * 0.38 + behaviorMatch * 0.32 + popularity * 0.2 + recency * 0.1;

  return {
    score,
    breakdown: { interestMatch, behaviorMatch, popularity, recency },
  };
};

export const updateInvestorDynamicProfile = async (investorId, explicitSignals = null) => {
  const investor = await User.findById(investorId).select(
    "bio skills industryProfile.jobTitle industryProfile.company industryProfile.previousCredits industryProfile.investmentRange industryProfile.mandates preferences viewHistory scriptsRead favoriteScripts recommendationProfile"
  );
  if (!investor) return null;

  const explicit = explicitSignals || getExplicitSignals(investor);
  const behavior = await buildBehaviorSignals(investorId, {
    viewHistoryScriptIds: (investor.viewHistory || []).map((v) => v.script).filter(Boolean),
    scriptsReadIds: investor.scriptsRead || [],
    favoriteScriptIds: investor.favoriteScripts || [],
  });

  investor.recommendationProfile = {
    detectedGenres: explicit.genres,
    preferredFormats: explicit.formats,
    preferredBudgets: explicit.budgets,
    behavior: {
      genreWeights: behavior.genreWeights,
      tagWeights: behavior.tagWeights,
      formatWeights: behavior.formatWeights,
      budgetWeights: behavior.budgetWeights,
      avgTimeSpentMs: behavior.avgTimeSpentMs,
    },
    updatedAt: new Date(),
  };

  investor.markModified("recommendationProfile");
  await investor.save();

  return investor.recommendationProfile;
};

export const trackInvestorInteraction = async ({
  userId,
  scriptId,
  type,
  timeSpentMs = 0,
  source = "unknown",
  metadata = {},
}) => {
  if (!userId || !scriptId || !type) return null;

  const interaction = await InvestorInteraction.create({
    investor: userId,
    script: scriptId,
    type,
    timeSpentMs,
    source,
    metadata,
  });

  const inc = {};
  if (type === "view") inc["engagement.viewEvents"] = 1;
  if (type === "click") inc["engagement.clicks"] = 1;
  if (type === "like") inc["engagement.likes"] = 1;
  if (type === "save") inc["engagement.saves"] = 1;
  if (type === "read") inc["engagement.reads"] = 1;
  if (type === "time_spent" && timeSpentMs > 0) {
    inc["engagement.totalTimeSpentMs"] = timeSpentMs;
    inc["engagement.timeSpentEvents"] = 1;
  }

  if (Object.keys(inc).length > 0) {
    await Script.findByIdAndUpdate(scriptId, { $inc: inc }).catch(() => null);
  }

  await updateInvestorDynamicProfile(userId).catch(() => null);

  return interaction;
};

export const buildInvestorFeed = async (userId) => {
  const investor = await User.findById(userId).select(
    "bio skills industryProfile.jobTitle industryProfile.company industryProfile.previousCredits industryProfile.investmentRange industryProfile.mandates preferences viewHistory scriptsRead favoriteScripts recommendationProfile"
  );
  if (!investor) {
    return { detectedGenres: [], genreSections: [], trending: [], newReleases: [], explore: [] };
  }

  const explicit = getExplicitSignals(investor);
  const behavior = await buildBehaviorSignals(userId, {
    viewHistoryScriptIds: (investor.viewHistory || []).map((v) => v.script).filter(Boolean),
    scriptsReadIds: investor.scriptsRead || [],
    favoriteScriptIds: investor.favoriteScripts || [],
  });
  const now = Date.now();

  const activeGenreFilters = [
    ...(investor?.industryProfile?.mandates?.genres || []),
    ...(investor?.preferences?.genres || []),
  ]
    .map(normalizeGenre)
    .filter(Boolean);

  const activeFormatFilters = [
    ...(investor?.industryProfile?.mandates?.formats || []),
    ...(investor?.preferences?.contentTypes || []),
  ]
    .map(normalizeFormat)
    .filter(Boolean);

  const candidates = await Script.find({
    status: "published",
    isSold: { $ne: true },
    purchaseRequestLocked: { $ne: true },
    isDeleted: { $ne: true },
  })
    .populate("creator", "name profileImage role")
    .sort({ createdAt: -1 })
    .limit(600)
    .lean();

  const matchesActiveFilters = (project) => {
    if (activeGenreFilters.length > 0) {
      const projectGenres = [
        normalizeGenre(project.genre || project.primaryGenre || project?.classification?.primaryGenre || ""),
        normalizeGenre(project?.classification?.secondaryGenre || ""),
      ].filter(Boolean);

      if (!projectGenres.some((g) => activeGenreFilters.includes(g))) {
        return false;
      }
    }

    if (activeFormatFilters.length > 0) {
      const projectFormats = [
        normalizeFormat(project.format || ""),
        normalizeFormat(project.contentType || ""),
      ].filter(Boolean);

      if (!projectFormats.some((fmt) => activeFormatFilters.includes(fmt))) {
        return false;
      }
    }

    return true;
  };

  const constrainedCandidates = candidates.filter(matchesActiveFilters);
  const rankingPool = constrainedCandidates.length > 0 ? constrainedCandidates : candidates;

  const scored = rankingPool
    .map((project) => {
      const result = scoreProject(project, { explicit, behavior }, now);
      return { ...project, _score: result.score, _scoreBreakdown: result.breakdown };
    })
    .sort((a, b) => b._score - a._score);

  const used = new Set();

  const detectedGenres = explicit.genres.length ? explicit.genres : toSortedKeys(behavior.genreWeights, 4);

  const genreSections = [];
  for (const g of detectedGenres.slice(0, 4)) {
    const byGenre = scored
      .filter((s) => normalizeGenre(s.genre || s.primaryGenre || s?.classification?.primaryGenre) === g)
      .slice(0, SECTION_SIZE);

    if (!byGenre.length) continue;
    byGenre.forEach((s) => used.add(s._id.toString()));
    genreSections.push({ genre: g.charAt(0).toUpperCase() + g.slice(1), scripts: byGenre });
  }

  const personalized = scored.filter((s) => !used.has(s._id.toString())).slice(0, SECTION_SIZE);
  personalized.forEach((s) => used.add(s._id.toString()));

  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const newReleases = scored
    .filter((s) => !used.has(s._id.toString()) && new Date(s.createdAt).getTime() >= thirtyDaysAgo)
    .slice(0, SECTION_SIZE);
  newReleases.forEach((s) => used.add(s._id.toString()));

  const explore = scored.filter((s) => !used.has(s._id.toString())).slice(0, SECTION_SIZE);

  return {
    detectedGenres,
    genreSections,
    trending: personalized,
    newReleases,
    explore,
  };
};
