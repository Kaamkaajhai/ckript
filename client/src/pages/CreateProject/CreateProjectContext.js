import { createContext, useContext } from "react";

/* Shared wizard state for the CreateProject flow.
   The orchestrator (index.jsx) owns every piece of state, handler, and derived
   value, and publishes them through this context as one flat bag. Step components
   (steps/Step*.jsx) read exactly what they need via useCreateProject(). This keeps
   the steps in their own files without threading dozens of props through each. */
export const CreateProjectContext = createContext(null);

export const useCreateProject = () => {
  const ctx = useContext(CreateProjectContext);
  if (!ctx) {
    throw new Error("useCreateProject must be used within a CreateProjectContext provider");
  }
  return ctx;
};
