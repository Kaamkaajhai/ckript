import { useCreateProject } from "../../../pages/CreateProject/CreateProjectContext";
import Editor from "./Editor";
import useCreateProjectToasts from "./useCreateProjectToasts";
import Wizard from "./Wizard";

/*
 * CreateProjectChrome — the mobile chrome for `/create-project`, injected into
 * the orchestrator through its `Shell` prop.
 *
 * ONE ROUTE, TWO SURFACES. `/create-project` carries a screenplay editor and a
 * five-step publish wizard, and they are not variations of one screen: the
 * editor is an immersive dark surface with a docked formatting bar, the wizard
 * is a light `flow` stepper with a sticky footer. Trying to serve both from one
 * component produced, on desktop, a shell whose footer holds word counts, zoom
 * buttons and a prose toggle that mean nothing on four of its five steps.
 *
 * So `step` chooses, and each surface declares its own shell mode. Exactly one
 * is mounted at a time, which is also what makes the shared overlays (the exit
 * flow above all) safe to render inside whichever is up.
 *
 * WHY THIS COMPONENT IS SO SHORT. Everything it could have owned belongs
 * somewhere better: state to the orchestrator, chrome to the two surfaces,
 * transient messages to the app-wide toast layer. What is left is the one
 * decision only it can make.
 */
export default function CreateProjectChrome() {
  const { step } = useCreateProject();

  // The orchestrator's `toastMessage` has no renderer under `nativeChrome`, so
  // it is forwarded to the mobile toast layer here — once, above both surfaces,
  // rather than by whichever one happens to be mounted when a save fails.
  useCreateProjectToasts();

  return step === 1 ? <Editor /> : <Wizard />;
}
