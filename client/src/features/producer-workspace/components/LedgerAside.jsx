import { Link } from "react-router-dom";

/*
 * The right-hand column: capital, the brief, this cycle's quotas, the market
 * pulse and the watchlist. Read-only summaries — every action in here is a link
 * to the page that actually owns the thing (mandates, pricing, the script).
 */
const LedgerAside = ({
  capital,
  mandateGroups,
  quotas,
  quotaResets,
  market,
  watchlist,
  scriptPathFor,
  onOpenFinance,
}) => (
  <aside className="ck-ledger__aside">
    <section className="ck-ledger__card">
      <div className="ck-ledger__card-head">
        <strong>Capital deployed</strong>
        <button type="button" className="ck-ledger__btn ck-ledger__btn--quiet" onClick={onOpenFinance}>
          Finance →
        </button>
      </div>
      <strong className="ck-ledger__capital-value">{capital.investedText}</strong>
      <span className="ck-ledger__capital-sub">of {capital.committedText} committed capital</span>
      <div className="ck-ledger__meter">
        <span style={{ width: capital.deployedPct }} />
      </div>
      <div className="ck-ledger__capital-grid">
        <div><b>{capital.walletText}</b><small>Wallet</small></div>
        <div><b>{capital.totalDeals}</b><small>Deals</small></div>
        <div><b>{capital.conversion}</b><small>Convert</small></div>
      </div>
    </section>

    <section className="ck-ledger__card">
      <div className="ck-ledger__card-head">
        <strong>My brief</strong>
        <Link to="/mandates" className="ck-ledger__btn ck-ledger__btn--quiet">Edit →</Link>
      </div>
      {mandateGroups.length > 0 ? (
        mandateGroups.map((group) => (
          <div key={group.label} className="ck-ledger__brief-group">
            <div className="ck-ledger__brief-label">{group.label}</div>
            <div className="ck-ledger__chips">
              {group.items.map((chip) => (
                <span
                  key={chip.text}
                  className={`ck-ledger__chip${chip.tone === "danger" ? " ck-ledger__chip--danger" : ""}`}
                >
                  {chip.text}
                </span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="ck-ledger__capital-sub" style={{ marginTop: 0 }}>
          No mandates set yet — tell us what you option and we&rsquo;ll match new scripts to it.
        </p>
      )}
    </section>

    <section className="ck-ledger__card">
      <div className="ck-ledger__card-head">
        <strong>This cycle</strong>
        <span className="ck-ledger__card-note">{quotaResets}</span>
      </div>
      {quotas.map((quota) => (
        <div
          key={quota.key}
          className={`ck-ledger__quota${quota.blocked ? " ck-ledger__quota--blocked" : ""}`}
        >
          <div className="ck-ledger__quota-row">
            <span>{quota.label}</span>
            <b>{quota.value}</b>
          </div>
          <div className="ck-ledger__quota-bar"><span style={{ width: quota.pct }} /></div>
          {quota.blocked && (
            <div className="ck-ledger__quota-warn">Quota reached — resets next cycle</div>
          )}
        </div>
      ))}
      <Link to="/pricing" className="ck-ledger__btn ck-ledger__btn--block">Upgrade plan</Link>
    </section>

    <section className="ck-ledger__card ck-ledger__card--dark">
      <div className="ck-ledger__pulse-head">
        <span>Market pulse</span>
        <span className="ck-ledger__pulse-rule" />
      </div>
      <div className="ck-ledger__pulse-value">{market.newThisWeek}</div>
      <div className="ck-ledger__pulse-sub">
        new scripts this week · {market.availableText} available of {market.totalText}
      </div>
      {market.genres.length > 0 && (
        <div className="ck-ledger__pulse-genres">
          {market.genres.map((genre) => (
            <div key={genre.name} className="ck-ledger__pulse-genre">
              <span>{genre.name}</span>
              <span className="ck-ledger__pulse-bar"><span style={{ width: genre.pct }} /></span>
              <span>{genre.count}</span>
            </div>
          ))}
        </div>
      )}
    </section>

    <section className="ck-ledger__card ck-ledger__card--flush">
      <div className="ck-ledger__watch-head"><strong>Watchlist</strong></div>
      {watchlist.length > 0 ? (
        watchlist.slice(0, 6).map((script, index) => (
          <Link
            key={script._id}
            to={scriptPathFor(script)}
            className="ck-ledger__watch-item"
          >
            <span className="ck-ledger__watch-rank">{index + 1}</span>
            <span className="ck-ledger__watch-title">{script.title}</span>
            <span className="ck-ledger__watch-score">
              {script.scriptScore?.overall ?? "—"}
            </span>
          </Link>
        ))
      ) : (
        <p className="ck-ledger__watch-empty">
          Nothing saved yet. Add a script from any deal&rsquo;s menu.
        </p>
      )}
    </section>
  </aside>
);

export default LedgerAside;
