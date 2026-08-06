/*
 * producer-workspace — the film-industry section: producers, directors,
 * investors and other industry professionals.
 *
 * WHAT MOVED HERE, AND WHAT DID NOT
 * ---------------------------------
 * These three pages were loose in pages/ under names that no longer described
 * them ("InvestorDashboard" was the dashboard for every industry role, not just
 * investors; "Writers" was the writer directory). They are industry-owned: no
 * other audience routes to them, so they belong to this module.
 *
 *   ProducerDashboardPage  /dashboard  (was pages/InvestorDashboard.jsx)
 *   WriterRosterPage       /writers    (was pages/Writers.jsx, then
 *                                      WriterDirectoryPage.jsx)
 *   MandatesPage           /mandates   (was pages/Mandates.jsx)
 *
 * Deliberately NOT moved, because they are shared and moving them would have
 * been a lie about ownership:
 *
 *   features/investor-desk    /home — pages/ReaderHome.jsx re-exports it
 *                             verbatim, so readers and industry share one page.
 *                             It owns its own folder for the same reason.
 *   features/featured-broadsheet  /featured — reader and industry both route
 *                             here, so it owns its own folder too.
 *   pages/TopList.jsx, pages/Search.jsx  — every audience uses them.
 *
 * The page CONTENT is unchanged by the move: only the file locations, the
 * component names and the relative import depth. Redesigning these surfaces to
 * match the shell's design language is the next piece of work, not this one.
 */

export { default as ProducerDashboardPage } from "./ProducerDashboardPage";
export { default as WriterRosterPage } from "./WriterRosterPage";
export { default as MandatesPage } from "./MandatesPage";
