import { createContext, useContext } from "react";

/*
 * Dynamic Island context — split from the provider component so the hook and
 * context object live in a component-free module (keeps React Fast Refresh
 * happy, which only allows component exports from a .jsx module).
 */
export const DynamicIslandContext = createContext(null);

export function useDynamicIsland() {
  const ctx = useContext(DynamicIslandContext);
  if (!ctx) throw new Error("useDynamicIsland must be used within <DynamicIslandProvider>");
  return ctx;
}
