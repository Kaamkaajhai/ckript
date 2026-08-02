/*
 * producerLedger.js — the pure part of the industry dashboard ("The Ledger").
 *
 * The page is a deal book: every option the viewer holds and every purchase
 * request they have sent, in one list, plus the money and the writers behind
 * them. Everything here derives display values from payloads the app already
 * returns:
 *
 *   GET /dashboard/investor         stats, marketPulse, activeHolds,
 *                                   recentDeals, matchedScripts, industryProfile
 *   GET /scripts/purchase-requests/mine   the viewer's own requests
 *   GET /transactions/wallet/balance      wallet
 *   GET /transactions?limit=10            ledger entries
 *   GET /users/watchlist                  saved scripts
 *
 * No fixtures and no invented metrics: a figure that cannot be computed from
 * real data is returned as null and the page omits the cell rather than
 * printing a placeholder.
 */

/* ── Money ───────────────────────────────────────────────────────────────── */

export const formatInr = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

/*
 * The masthead and the aside print money in the Indian short scale (₹18.4L,
 * ₹1.24Cr) because a 44px Spectral figure has to stay one line at 1024px.
 * Anything under a lakh is shown in full.
 */
export const formatShortInr = (value) => {
  const amount = Number(value || 0);
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return formatInr(amount);
};

/* ── Time / identity ─────────────────────────────────────────────────────── */

export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

/*
 * The masthead dateline — "Tuesday, 18 November".
 *
 * Assembled from two `toLocaleDateString` calls rather than one: en-GB's
 * weekday+day+month pattern is "Friday 31 July" with no comma, and the design's
 * eyebrow needs the comma to read as a dateline.
 */
export const formatDateline = (date = new Date()) => {
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const rest = date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${weekday}, ${rest}`;
};

/** Row dates — "20 Nov 2025". Returns "" for a missing/invalid date. */
export const formatDay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const getFirstName = (user) =>
  String(user?.name || "").trim().split(/\s+/)[0] || "there";

export const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "W";

/**
 * "Producer at Tigerhill Pictures" when we know both, the job title alone when
 * we only know that, and nothing at all rather than a guess.
 */
export const formatDesk = (industryProfile = {}, role = "") => {
  const title = String(industryProfile?.jobTitle || "").trim()
    || (role ? role.charAt(0).toUpperCase() + role.slice(1) : "");
  const company = String(industryProfile?.company || "").trim();
  if (title && company) return `${title} at ${company}`;
  return title || company || "";
};

/* ── Status vocabulary ───────────────────────────────────────────────────── */

/*
 * Tone names, not colours, in the JS. The stylesheet owns the six palettes as
 * `.ck-ledger-tone--sage` etc., so a status can never be printed in a colour
 * the design does not have.
 */
export const STATUS_META = {
  active: { label: "Active option", tone: "sage" },
  approved: { label: "Request approved", tone: "sage" },
  pending: { label: "Request pending", tone: "amber" },
  converted: { label: "Converted to sale", tone: "ink" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  rejected: { label: "Declined by writer", tone: "danger" },
};

/*
 * Four buckets the status filters work in. `requests` is a kind AND a state —
 * a purchase request that is still with the writer — which is why the mapping
 * is a function rather than a lookup on status alone.
 */
export const getDealBucket = (deal) => {
  if (deal.status === "pending" || deal.status === "approved") return "requests";
  if (deal.status === "active") return "active";
  if (deal.status === "converted") return "closed";
  return "past";
};

export const STATUS_FILTERS = [
  { key: "active", label: "Active options" },
  { key: "requests", label: "Requests" },
  { key: "closed", label: "Closed" },
  { key: "past", label: "Past" },
];

export const SORT_OPTIONS = [
  { key: "days", label: "Deadline (soonest)", short: "Deadline" },
  { key: "fee", label: "Fee (highest)", short: "Fee" },
  { key: "score", label: "AI score (highest)", short: "Score" },
  { key: "title", label: "Title (A–Z)", short: "Title" },
];

/* ── Deal rows ───────────────────────────────────────────────────────────── */

const daysBetween = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
};

const scriptScore = (script) => {
  const overall = script?.scriptScore?.overall;
  return Number.isFinite(Number(overall)) ? Number(overall) : null;
};

const contentLabel = (script) =>
  String(script?.contentType || "").replace(/_/g, " ").trim();

/**
 * A scriptId → { score, logline, coverImage } index built from every collection
 * in the dashboard payload that carries a full Script projection.
 *
 * `/scripts/purchase-requests/mine` populates its script with only
 * `title price thumbnailUrl creator`, so a request row has no AI score of its
 * own. Rather than print a number that is not there — or invent one — the row
 * borrows the score the SAME script already has in `matchedScripts`,
 * `recentViews`, `topRated` or `activeHolds`. If it is in none of them the row
 * shows an em dash.
 */
export const buildScoreIndex = (dash = {}) => {
  const index = new Map();
  const add = (script) => {
    const id = String(script?._id || "");
    if (!id || index.has(id)) return;
    const overall = script?.scriptScore?.overall;
    index.set(id, {
      score: Number.isFinite(Number(overall)) ? Number(overall) : null,
      logline: script?.logline || "",
      coverImage: script?.coverImage || "",
    });
  };

  [
    ...(dash.matchedScripts || []),
    ...(dash.recentViews || []),
    ...(dash.topRated || []),
    ...(dash.activeHolds || []).map((hold) => hold?.script),
  ].filter(Boolean).forEach(add);

  return index;
};

/**
 * Options and purchase requests are two different collections with two
 * different shapes. The deal book shows them as one list, so they are
 * normalised here rather than branched on at three points in the JSX.
 *
 * `activeHolds` carries a richer `script` projection than `recentDeals` (it has
 * the AI score and the logline), so the two are merged by option id — otherwise
 * every live option would print a marker with no score.
 */
export const buildDealRows = ({
  recentDeals = [], activeHolds = [], purchaseRequests = [], scoreIndex = new Map(),
} = {}) => {
  const holdById = new Map(
    (activeHolds || []).filter(Boolean).map((hold) => [String(hold._id), hold])
  );
  const enrich = (script, field) => scoreIndex.get(String(script?._id || ""))?.[field] ?? null;

  const options = (recentDeals || []).filter(Boolean).map((deal) => {
    const enriched = holdById.get(String(deal._id));
    const script = enriched?.script || deal.script || {};
    return {
      id: `option:${deal._id}`,
      recordId: String(deal._id),
      kind: "option",
      kindLabel: "Option · 30-day window",
      script,
      scriptId: String(script?._id || ""),
      title: script?.title || "Untitled project",
      genre: script?.genre || "",
      contentType: contentLabel(script),
      logline: script?.logline || enrich(script, "logline") || "",
      writer: script?.creator?.name || "",
      writerId: String(script?.creator?._id || ""),
      score: scriptScore(script) ?? enrich(script, "score"),
      fee: Number(deal.fee || 0),
      status: deal.status || "expired",
      startDate: deal.startDate || null,
      endDate: deal.endDate || null,
      daysRemaining: deal.status === "active"
        ? (deal.daysRemaining ?? daysBetween(deal.endDate))
        : null,
      // Only a live option can be released; the endpoint rejects anything else.
      canRelease: deal.status === "active",
      canDownloadPdf: false,
      purchaseRequestId: null,
    };
  });

  const requests = (purchaseRequests || []).filter(Boolean).map((request) => {
    const script = request.script || {};
    return {
      id: `request:${request._id}`,
      recordId: String(request._id),
      kind: "request",
      kindLabel: "Purchase request",
      script,
      scriptId: String(script?._id || ""),
      title: script?.title || "Untitled project",
      genre: script?.genre || "",
      contentType: contentLabel(script),
      logline: script?.logline || enrich(script, "logline") || "",
      writer: request.writer?.name || script?.creator?.name || "",
      writerId: String(request.writer?._id || script?.creator?._id || ""),
      score: scriptScore(script) ?? enrich(script, "score"),
      fee: Number(request.amount || request.frozenAmount || script?.price || 0),
      status: request.status || "pending",
      startDate: request.createdAt || null,
      endDate: request.status === "pending" ? null : (request.updatedAt || null),
      daysRemaining: null,
      canRelease: false,
      // The acceptance PDF only exists once a writer has approved the request.
      canDownloadPdf: request.status === "approved",
      purchaseRequestId: String(request._id),
    };
  });

  return [...options, ...requests];
};

/** A live deal is one still waiting on somebody: it belongs at the top. */
const isLive = (deal) =>
  deal.status === "active" || deal.status === "pending" || deal.status === "approved";

export const sortDeals = (rows, sort = "days") => {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sort === "fee") return b.fee - a.fee;
    if (sort === "score") return (b.score ?? -1) - (a.score ?? -1);
    if (sort === "title") return String(a.title).localeCompare(String(b.title));
    /*
     * Deadline. Only live deals have one — everything settled or lapsed sorts
     * to the end, otherwise an expired option (0 days remaining) reads as the
     * most urgent row on the page.
     */
    const rank = (deal) => {
      if (!isLive(deal)) return 9000;
      return deal.daysRemaining == null ? 500 : deal.daysRemaining;
    };
    return rank(a) - rank(b);
  });
  return sorted;
};

export const filterDeals = (rows, statuses = []) =>
  (statuses.length ? rows.filter((row) => statuses.includes(getDealBucket(row))) : rows);

/**
 * Everything the deal card needs to paint itself, computed once.
 * An option in its last three days is shown in the danger tone with a
 * countdown instead of its status — the design's one piece of urgency.
 */
export const presentDeal = (deal) => {
  const meta = STATUS_META[deal.status] || STATUS_META.expired;
  const urgent = deal.status === "active" && deal.daysRemaining != null && deal.daysRemaining <= 3;
  const metaParts = [deal.genre, deal.contentType, deal.writer].filter(Boolean);
  if (deal.score != null) metaParts.push(`score ${deal.score}`);

  return {
    ...deal,
    urgent,
    tone: urgent ? "danger" : meta.tone,
    statusLabel: urgent
      ? `${deal.daysRemaining} ${deal.daysRemaining === 1 ? "day" : "days"} left`
      : meta.label,
    metaLine: metaParts.join(" · "),
    feeText: formatInr(deal.fee),
    marker: deal.score == null ? "—" : String(deal.score),
    dateText: deal.kind === "option"
      ? (deal.status === "active" && deal.endDate
        ? `ends ${formatDay(deal.endDate)}`
        : formatDay(deal.endDate || deal.startDate))
      : `submitted ${formatDay(deal.startDate)}`,
    primaryLabel: deal.status === "approved"
      ? "Review & settle"
      : deal.status === "active" ? "Review option" : "Open",
  };
};

/* ── The board (the five-figure editorial band) ──────────────────────────── */

/**
 * Conversion is read → acquired. It is null, not "0.0%", when nothing has been
 * read yet: a producer on day one has no conversion rate, they have no data.
 */
export const getConversionRate = (stats = {}) => {
  const viewed = Number(stats.totalViewed || 0);
  if (!viewed) return null;
  const closed = Math.max(
    Number(stats.convertedDeals || 0),
    Number(stats.scriptsPurchased || 0)
  );
  return `${((closed / viewed) * 100).toFixed(1)}%`;
};

/**
 * @param {boolean} [options.statsKnown]
 *   False when /dashboard/investor failed. Four of the five figures come only
 *   from that response, so they print an em dash — a producer must not read
 *   "Scripts read 0" and believe it. "Live options" still counts the deals we
 *   do hold, and the wallet is a separate endpoint, so both stay live.
 */
export const buildBoardStats = ({
  stats = {}, deals = [], walletBalance = 0, statsKnown = true,
} = {}) => {
  const activeOptions = deals.filter((deal) => deal.status === "active").length;
  const pendingRequests = deals.filter((deal) => deal.status === "pending").length;
  const conversion = getConversionRate(stats);
  const known = (value) => (statsKnown ? value : "—");

  return [
    {
      key: "read",
      label: "Scripts read",
      value: known(Number(stats.totalViewed || 0).toLocaleString("en-IN")),
      sub: !statsKnown
        ? "not loaded"
        : stats.avgViewedScore != null ? `avg score ${stats.avgViewedScore}` : "no scored reads yet",
    },
    {
      key: "options",
      label: "Live options",
      value: String(activeOptions),
      sub: `${pendingRequests} request${pendingRequests === 1 ? "" : "s"} pending`,
    },
    {
      key: "acquired",
      label: "Acquired",
      value: known(String(Number(stats.scriptsPurchased || 0))),
      sub: statsKnown ? `${Number(stats.successfulProjects || 0)} in production` : "not loaded",
    },
    {
      key: "capital",
      label: "Capital deployed",
      value: known(formatShortInr(stats.totalInvested)),
      sub: `${formatShortInr(walletBalance)} in wallet`,
    },
    {
      key: "conversion",
      label: "Conversion",
      value: (statsKnown && conversion) || "—",
      sub: "read → acquired",
    },
  ];
};

/** The masthead's one-line summary of where the ledger stands today. */
export const buildLedgerLine = ({ deals = [], walletBalance = 0 } = {}) => {
  const active = deals.filter((deal) => deal.status === "active").length;
  const pending = deals.filter((deal) => deal.status === "pending").length;
  return [
    `${active} live option${active === 1 ? "" : "s"}`,
    `${pending} request${pending === 1 ? "" : "s"} awaiting a writer`,
    // The wallet is shown in full here, not short-scaled: this line is the one
    // place a producer reads the exact number they have left to spend.
    `${formatInr(walletBalance)} unspent`,
  ].join(" · ");
};

/* ── Aside ───────────────────────────────────────────────────────────────── */

/**
 * "Capital deployed" is invested / (invested + wallet): the share of the money
 * this account has actually put to work. With no money either way it is 0, not
 * NaN.
 */
export const buildCapital = ({ stats = {}, walletBalance = 0, dealCount = 0 } = {}) => {
  const invested = Number(stats.totalInvested || 0);
  const wallet = Number(walletBalance || 0);
  const committed = invested + wallet;
  return {
    investedText: formatShortInr(invested),
    committedText: formatShortInr(committed),
    walletText: formatShortInr(wallet),
    deployedPct: committed > 0 ? `${Math.round((invested / committed) * 100)}%` : "0%",
    totalDeals: String(Math.max(Number(stats.totalDeals || 0), dealCount)),
    conversion: getConversionRate(stats) ?? "—",
  };
};

/**
 * The brief, straight off `industryProfile.mandates`. Exclusions are rendered
 * in the danger tone with a ✕, which is the only thing the design does to
 * distinguish "I want this" from "never send me this".
 */
export const buildMandateGroups = (mandates = {}) => {
  const group = (label, items, tone = "neutral") => {
    const list = (items || []).filter(Boolean);
    return list.length ? { label, items: list.map((text) => ({ text, tone })) } : null;
  };

  const hooks = [
    ...(mandates.specificHooks || []).map((text) => ({ text, tone: "neutral" })),
    ...(mandates.exclusions || []).map((text) => ({ text: `✕ ${text}`, tone: "danger" })),
  ];

  return [
    group("Genres", mandates.genres),
    group("Formats", mandates.formats),
    hooks.length ? { label: "Hooks · exclusions", items: hooks } : null,
  ].filter(Boolean);
};

/**
 * The three metered actions in a billing cycle. `limit` comes from the
 * subscription, not a constant — a plan with 25 reveals must not be drawn
 * against 10.
 */
export const buildQuotas = ({ contacts, messages, meetings } = {}) => ([
  { key: "contacts", label: "Contact reveals", ...contacts },
  { key: "messages", label: "Writers messaged", ...messages },
  { key: "meetings", label: "Meetings booked", ...meetings },
].map((row) => {
  const used = Number(row.used || 0);
  const limit = Math.max(1, Number(row.limit || 0));
  const blocked = used >= limit;
  return {
    key: row.key,
    label: row.label,
    value: `${used} / ${limit}`,
    pct: `${Math.min(100, Math.round((used / limit) * 100))}%`,
    blocked,
  };
}));

/**
 * The market pulse card's genre bars. Counted from the scripts the platform
 * actually matched to this brief — the endpoint returns no genre histogram, and
 * inventing one would be a fake metric.
 */
export const buildGenreBars = (matchedScripts = []) => {
  const counts = new Map();
  (matchedScripts || []).forEach((script) => {
    const genre = script?.genre;
    if (!genre) return;
    counts.set(genre, (counts.get(genre) || 0) + 1);
  });

  const rows = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const top = rows[0]?.count || 1;
  return rows.map((row) => ({ ...row, pct: `${Math.round((row.count / top) * 100)}%` }));
};

/* ── Money in and out ────────────────────────────────────────────────────── */

const CREDIT_TYPES = new Set(["credit", "refund", "topup", "deposit"]);

export const presentTransaction = (txn = {}) => {
  const isCredit = CREDIT_TYPES.has(String(txn.type || "").toLowerCase());
  const status = String(txn.status || "").replace(/_/g, " ");
  return {
    id: String(txn._id || ""),
    description: txn.description || txn.type || "Transaction",
    date: formatDay(txn.createdAt),
    amount: `${isCredit ? "+" : "−"}${formatInr(txn.amount)}`,
    isCredit,
    status,
    tone: txn.status === "completed" ? "sage" : txn.status === "failed" ? "danger" : "amber",
  };
};

/**
 * The "Export CSV" action builds the file from the rows on screen — no
 * server round-trip, and no promise of an export the backend cannot make.
 */
export const buildLedgerCsv = (deals = []) => {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = ["Kind", "Title", "Writer", "Genre", "Format", "AI score", "Amount (INR)", "Status", "Start", "End"];
  const rows = deals.map((deal) => [
    deal.kind === "option" ? "Option" : "Purchase request",
    deal.title,
    deal.writer,
    deal.genre,
    deal.contentType,
    deal.score ?? "",
    deal.fee,
    (STATUS_META[deal.status] || STATUS_META.expired).label,
    formatDay(deal.startDate),
    formatDay(deal.endDate),
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
};

/**
 * The detail drawer's activity trail. Built from the dates the record already
 * carries, newest last, so it never claims an event the data does not show.
 */
export const buildActivity = (deal) => {
  if (!deal) return [];
  const entries = [];

  if (deal.kind === "option") {
    if (deal.startDate) entries.push({ text: "Option opened", when: formatDay(deal.startDate), tone: "ink" });
    if (deal.status === "active" && deal.endDate) {
      entries.push({ text: "Window closes", when: formatDay(deal.endDate), tone: "amber" });
    }
    if (deal.status === "converted") entries.push({ text: "Converted to sale", when: formatDay(deal.endDate), tone: "sage" });
    if (deal.status === "cancelled") entries.push({ text: "Option cancelled", when: formatDay(deal.endDate), tone: "neutral" });
    if (deal.status === "expired") entries.push({ text: "Option expired", when: formatDay(deal.endDate), tone: "neutral" });
    return entries;
  }

  if (deal.startDate) entries.push({ text: "Request sent to writer", when: formatDay(deal.startDate), tone: "ink" });
  if (deal.status === "pending") entries.push({ text: "Awaiting the writer's decision", when: "—", tone: "amber" });
  if (deal.status === "approved") entries.push({ text: "Approved by the writer", when: formatDay(deal.endDate), tone: "sage" });
  if (deal.status === "rejected") entries.push({ text: "Declined by the writer", when: formatDay(deal.endDate), tone: "danger" });
  if (deal.status === "cancelled") entries.push({ text: "Request withdrawn", when: formatDay(deal.endDate), tone: "neutral" });
  return entries;
};
