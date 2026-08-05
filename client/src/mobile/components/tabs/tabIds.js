/*
 * Tab and panel ids, derived rather than shared through context, so a TabPanel
 * can sit anywhere on the screen — under a sticky header, inside another
 * section — and still be wired to the tab that controls it.
 *
 * Separate module because a file exporting both components and helpers breaks
 * React Fast Refresh.
 */
export const tabIdFor = (tabsId, id) => `${tabsId}-tab-${id}`;
export const panelIdFor = (tabsId, id) => `${tabsId}-panel-${id}`;
