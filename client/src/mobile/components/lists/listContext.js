import { createContext, useContext } from "react";

/*
 * The one thing a row needs to know from its container: whether it is inside a
 * real <ul>, and so whether it must render an <li> or a plain element.
 *
 * It lives in its own module because a file that exports both a component and a
 * hook breaks React Fast Refresh — the component's state is discarded on every
 * edit, which is exactly the feedback loop the mobile work depends on.
 */
export const ListContext = createContext(null);

export function useListContext() {
  return useContext(ListContext);
}
