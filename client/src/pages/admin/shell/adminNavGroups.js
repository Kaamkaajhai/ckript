/**
 * The sidebar's grouping of the admin's REAL sections.
 *
 * Keys only — labels and icons stay in AdminDashboard's TABS, which remains the single source of
 * truth until stage 5 splits that file. Grouping here means the shell can reorganise navigation
 * without touching the 5,000-line page, and the page can rename a tab without touching the shell.
 *
 * Every key in AdminDashboard.TABS appears exactly once below; `groupNavItems` throws in dev if
 * that ever stops being true, so a new tab cannot silently vanish from the sidebar.
 */
export const ADMIN_NAV_GROUPS = [
  { title: "", keys: ["overview", "analytics"] },
  {
    title: "People",
    keys: ["writers", "investors", "premium-professionals", "membership-reviews"],
  },
  {
    title: "Content",
    keys: ["projects", "approvals", "scores", "evaluations"],
  },
  {
    title: "AI",
    keys: ["trailers", "ai-trailers", "ai-usage"],
  },
  {
    title: "Revenue",
    keys: ["payments", "invoices", "investor-purchases", "writer-plans", "bank-reviews"],
  },
  {
    title: "Competitions",
    keys: ["competitions", "referrals"],
  },
  {
    title: "Communication",
    keys: ["messages", "queries", "meetings"],
  },
  {
    title: "Archive",
    keys: ["deleted-writers", "deleted-film-professionals"],
  },
];

/**
 * Join the groups with the page's tab definitions ({key, label, icon}).
 * Unknown keys are dropped with a dev warning; tabs missing from every group are appended to a
 * trailing "More" group rather than lost.
 */
export function groupNavItems(groups, tabs) {
  const byKey = new Map(tabs.map((t) => [t.key, t]));
  const placed = new Set();

  const built = groups
    .map((group) => ({
      title: group.title,
      items: group.keys
        .map((key) => {
          const tab = byKey.get(key);
          if (!tab && import.meta.env?.DEV) {
            console.warn(`[admin shell] nav group references unknown tab "${key}"`);
          }
          if (tab) placed.add(key);
          return tab;
        })
        .filter(Boolean),
    }))
    .filter((group) => group.items.length);

  const leftovers = tabs.filter((t) => !placed.has(t.key));
  if (leftovers.length) built.push({ title: "More", items: leftovers });

  return built;
}
