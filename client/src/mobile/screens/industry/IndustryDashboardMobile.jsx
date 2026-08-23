import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  INDUSTRY_DASHBOARD_STATUS,
  readIndustryDashboardQuery,
  writeIndustryDashboardQuery,
} from "../../../features/producer-workspace/industryDashboard";
import useIndustryDashboard from "../../../features/producer-workspace/useIndustryDashboard";
import {
  buildBoardStats,
  buildDealRows,
  buildGenreBars,
  buildScoreIndex,
  formatShortInr,
  presentDeal,
  presentTransaction,
  sortDeals,
} from "../../../features/producer-workspace/producerLedger";
import { isFilmIndustryProfessionalRole } from "../../../utils/industryAccess";
import { getScriptCanonicalPath } from "../../../utils/scriptPath";
import AppBar from "../../components/app-bars/AppBar";
import Badge from "../../components/badges/Badge";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import DiscoveryProjectCard from "../discovery/components/DiscoveryProjectCard";
import "./IndustryDashboardMobile.css";

const SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "deals", label: "Deals" },
  { key: "matches", label: "Matches" },
  { key: "finance", label: "Finance" },
  { key: "market", label: "Market" },
];

const firstName = (user) => String(user?.name || "").trim().split(/\s+/)[0] || "there";

function DealCard({ deal }) {
  const projectPath = deal.scriptId ? getScriptCanonicalPath(deal.script) : "";
  return (
    <article className="ckm-industry-dashboard__deal">
      <div className="ckm-industry-dashboard__deal-head">
        <span>{deal.kindLabel}</span>
        <Badge tone={deal.tone === "danger" ? "danger" : deal.tone === "sage" ? "success" : "neutral"} size="sm">
          {deal.statusLabel}
        </Badge>
      </div>
      <h3>{deal.title}</h3>
      <p>{deal.metaLine || "Project details"}</p>
      <dl>
        <div><dt>Amount</dt><dd>{deal.feeText}</dd></div>
        <div><dt>Timing</dt><dd>{deal.dateText || "—"}</dd></div>
      </dl>
      {projectPath && <Link to={projectPath}>Open project</Link>}
    </article>
  );
}

export default function IndustryDashboardMobile({ user, previewData = null, previewState = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readIndustryDashboardQuery(searchParams), [searchParams]);
  const liveDashboard = useIndustryDashboard({ enabled: !previewState, previewData });
  const dashboard = previewState || liveDashboard;
  const data = dashboard.data;
  const isProfessional = isFilmIndustryProfessionalRole(user);
  const tabs = isProfessional ? SECTIONS : SECTIONS.filter(({ key }) => !["deals", "finance"].includes(key));
  const section = tabs.some(({ key }) => key === query.section) ? query.section : "overview";

  const setSection = useCallback((next) => {
    setSearchParams(writeIndustryDashboardQuery(searchParams, { section: next }), { replace: true });
  }, [searchParams, setSearchParams]);

  const dash = useMemo(() => data?.dash || {}, [data?.dash]);
  const matched = useMemo(() => dash.matchedScripts || [], [dash.matchedScripts]);
  const deals = useMemo(() => sortDeals(buildDealRows({
    recentDeals: dash.recentDeals,
    activeHolds: dash.activeHolds,
    purchaseRequests: data?.purchaseRequests,
    scoreIndex: buildScoreIndex(dash),
  })).map(presentDeal), [dash, data?.purchaseRequests]);
  const walletBalance = data?.wallet?.balance ?? data?.wallet?.wallet?.balance ?? 0;
  const stats = useMemo(() => buildBoardStats({
    stats: dash.stats || {},
    deals,
    walletBalance,
    statsKnown: !data?.failures?.dash,
  }), [dash.stats, data?.failures?.dash, deals, walletBalance]);
  const transactions = useMemo(() => (data?.transactions || []).map(presentTransaction), [data?.transactions]);
  const genreBars = useMemo(() => buildGenreBars(matched), [matched]);
  const market = dash.marketPulse || {};

  const sectionBody = () => {
    if (section === "deals") return deals.length ? deals.map((deal) => <DealCard key={deal.id} deal={deal} />) : (
      <EmptyState compact titleAs="h2" icon="handshake" title="Your deal book is empty" body="Purchase requests and live options appear here." actions={<Button variant="secondary" to="/search">Browse projects</Button>} />
    );
    if (section === "matches") return matched.length ? matched.map((project, index) => (
      <DiscoveryProjectCard key={project._id} project={project} rank={index + 1} />
    )) : (
      <EmptyState compact titleAs="h2" icon="auto_awesome" title="No matches this week" body="Refine your mandate while new work enters the catalogue." actions={<Button variant="secondary" to="/mandates">Edit mandate</Button>} />
    );
    if (section === "finance") return (
      <section className="ckm-industry-dashboard__finance">
        <div className="ckm-industry-dashboard__wallet">
          <span>Wallet balance</span>
          <strong>{data?.failures?.wallet ? "Unavailable" : formatShortInr(walletBalance)}</strong>
        </div>
        {data?.failures?.transactions ? (
          <InlineMessage tone="error" title="Transaction history did not load" onRetry={dashboard.retry}>
            {data.failures.transactions}
          </InlineMessage>
        ) : transactions.length ? transactions.map((row) => (
          <div className="ckm-industry-dashboard__transaction" key={row.id}>
            <span><strong>{row.description}</strong><small>{row.date} · {row.status}</small></span>
            <b className={row.isCredit ? "is-credit" : ""}>{row.amount}</b>
          </div>
        )) : <p className="ckm-industry-dashboard__quiet">No recent transactions.</p>}
      </section>
    );
    if (section === "market") return (
      <section className="ckm-industry-dashboard__market">
        <dl>
          <div><dt>New this week</dt><dd>{Number(market.newThisWeek || 0).toLocaleString("en-IN")}</dd></div>
          <div><dt>Available now</dt><dd>{Number(market.available || 0).toLocaleString("en-IN")}</dd></div>
          <div><dt>Total published</dt><dd>{Number(market.totalScripts || 0).toLocaleString("en-IN")}</dd></div>
        </dl>
        {genreBars.map((genre) => (
          <div className="ckm-industry-dashboard__genre" key={genre.name}>
            <span>{genre.name}</span><span>{genre.count}</span>
            <i><b style={{ width: genre.pct }} /></i>
          </div>
        ))}
        <Button variant="secondary" to="/search">Search projects</Button>
      </section>
    );
    return (
      <>
        <dl className="ckm-industry-dashboard__stats">
          {stats.slice(0, isProfessional ? 5 : 3).map((item) => (
            <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd><span>{item.sub}</span></div>
          ))}
        </dl>
        <section className="ckm-industry-dashboard__next">
          <div><h2>{matched.length} new {matched.length === 1 ? "match" : "matches"}</h2><p>Projects ranked against your standing mandate.</p></div>
          <Button variant="secondary" onClick={() => setSection("matches")}>Review matches</Button>
        </section>
        {isProfessional && deals.slice(0, 3).map((deal) => <DealCard key={deal.id} deal={deal} />)}
      </>
    );
  };

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="industry-dashboard"
      className="ckm-industry-dashboard"
      scrollClassName="ckm-industry-dashboard__scroll"
      appBar={<AppBar user={user} />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={dashboard.retry}
    >
      <header className="ckm-industry-dashboard__header">
        <p>Industry workspace · live account data</p>
        <h1>{isProfessional ? "Deal flow" : "Casting desk"}, {firstName(user)}</h1>
        <span>{isProfessional ? "Review decisions, matches and capital without a desktop ledger." : "Discover projects and track the market from a read-only workspace."}</span>
      </header>

      {!isProfessional && <InlineMessage title="Discovery-only account">Deal and finance controls are reserved for film industry professional roles.</InlineMessage>}

      {dashboard.status === INDUSTRY_DASHBOARD_STATUS.LOADING && (
        <SkeletonGroup label="Loading industry dashboard" className="ckm-industry-dashboard__loading">
          <SkeletonShape height={130} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={180} radius="var(--ckm-r-lg)" />
          <SkeletonShape height={180} radius="var(--ckm-r-lg)" />
        </SkeletonGroup>
      )}

      {dashboard.status === INDUSTRY_DASHBOARD_STATUS.FAILED && (
        <InlineMessage variant="panel" title="The dashboard is unavailable" onRetry={dashboard.retry}>{dashboard.failure?.message}</InlineMessage>
      )}

      {dashboard.status === INDUSTRY_DASHBOARD_STATUS.READY && (
        <>
          {Object.keys(data?.failures || {}).length > 0 && (
            <InlineMessage title="Some account data did not load">Available sections remain current. Retry to restore the missing data.</InlineMessage>
          )}
          <nav className="ckm-industry-dashboard__tabs" aria-label="Dashboard sections">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" aria-current={section === tab.key ? "page" : undefined} onClick={() => setSection(tab.key)}>{tab.label}</button>
            ))}
          </nav>
          <div className="ckm-industry-dashboard__body">{sectionBody()}</div>
        </>
      )}
    </MobileShell>
  );
}
