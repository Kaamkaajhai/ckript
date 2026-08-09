import { useMemo, useRef, useState } from "react";
import { CreateProjectContext } from "../../pages/CreateProject/CreateProjectContext";
import Editor from "../screens/create/Editor";

/*
 * Development-only harness for the mobile screenplay editor
 * (/__mobile-editor — see App.jsx; never built into production routes).
 *
 * WHY IT EXISTS
 * -------------
 * `/create-project` is still a desktop migration fallback: promoting the route
 * needs mode B (the publish wizard, steps 2–5), which is not built. So the
 * editor chrome has no URL yet, and the checks that matter most for it — touch
 * target sizes, contrast on the dark chrome, whether the docked bar overlaps the
 * caret line, whether anything overflows at 320px — are exactly the ones a jsdom
 * suite cannot answer. This route puts the real component, the real stylesheets
 * and the REAL CodeMirror editor in a real browser so a five-width sweep can.
 *
 * It mounts a fixture `CreateProjectContext` rather than the orchestrator: the
 * orchestrator authenticates, fetches drafts and autosaves, and a harness that
 * does those things produces a different screen every run.
 *
 * Everything here is deterministic on purpose — a fixed "last saved" time, a
 * fixed script — so a screenshot diff means a change, not a clock tick.
 */

const FIXTURE_SCRIPT = `INT. RAILWAY RETIRING ROOM - NIGHT

A ceiling fan turns too slowly to matter. ARSHAD, 40s, sits with a
manuscript in his lap and no intention of reading it.

ARSHAD
You said the last train was at eleven.

MEHER (O.S.)
I said the last train I was taking.

She comes in from the platform, coat still wet.

MEHER
There's another at four. There's always another at four.

ARSHAD
(not looking up)
That's not the same as there being one now.

CUT TO:

EXT. PLATFORM 3 - CONTINUOUS

Rain on an empty bench. The board flickers and gives up.
`;

const FIXED_LAST_SAVED = new Date(2026, 7, 9, 14, 32);

export default function EditorHarness() {
  const [screenplayValue, setScreenplayValue] = useState(FIXTURE_SCRIPT);
  const [title, setTitle] = useState("The Four O'Clock Train");
  const [currentElement, setCurrentElement] = useState("action");
  const [emphasisState, setEmphasisState] = useState({ active: [], centered: false, hasSelection: false });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState("");
  const [pendingRecovery, setPendingRecovery] = useState(null);
  const [screenplayEnabled, setScreenplayEnabled] = useState(true);

  const screenplayApiRef = useRef(null);
  const screenplayFileInputRef = useRef(null);

  /*
   * The states a sweep has to be able to reach are query-driven rather than
   * clickable, so the harness can be *navigated* to a state instead of driven
   * into one: ?state=recovery, ?state=error, ?state=exit, ?state=readonly,
   * ?state=prose.
   */
  const requested = new URLSearchParams(window.location.search).get("state") || "";

  const value = useMemo(() => ({
    canEditContent: requested !== "readonly",
    collabLocks: {},
    collabMyUserId: "harness-user",
    collabRequestEdit: () => {},
    competitionMode: false,
    creationBlocked: false,
    currentElement,
    dark: false,
    editor: null,
    editorZoom: 1,
    emphasisState,
    enforceGoldPlan: () => true,
    error: requested === "error" ? "Could not save — you appear to be offline." : error,
    exiting: false,
    exportingScreenplay: null,
    focusedCommentId: null,
    handleCaretLine: () => {},
    handleExitEditor: () => setShowExitConfirm(true),
    handleExportScreenplay: () => {},
    handleImportScreenplayFile: () => {},
    handleNext: () => {},
    handleScreenplayChange: (next) => { setScreenplayValue(next); setSaved(false); },
    hasFullAccess: true,
    importNotice: "",
    isScreenplayFormat: true,
    lastSaved: FIXED_LAST_SAVED,
    saved,
    saving: false,
    sceneComments: [],
    screenplayApiRef,
    screenplayEnabled,
    screenplayFileInputRef,
    screenplayValue,
    setCurrentElement,
    setEmphasisState,
    setError,
    setScreenplayEnabled,
    setShowExitConfirm,
    setShowTitlePageModal: () => {},
    setTitle,
    setSaved,
    showExitConfirm: requested === "exit" || showExitConfirm,
    title,
    titlePage: {},
    titlePageActive: false,
    useScreenplayEditor: requested !== "prose" && screenplayEnabled,
    confirmExitDiscard: () => setShowExitConfirm(false),
    confirmExitSaveDraft: () => setShowExitConfirm(false),
    pendingRecovery: requested === "recovery"
      ? { updatedAt: new Date(2026, 7, 8, 21, 5).toISOString() }
      : pendingRecovery,
    acceptPendingRecovery: () => setPendingRecovery(null),
    dismissPendingRecovery: () => setPendingRecovery(null),
  }), [
    currentElement, emphasisState, error, pendingRecovery, requested, saved,
    screenplayEnabled, screenplayValue, showExitConfirm, title,
  ]);

  return (
    <CreateProjectContext.Provider value={value}>
      <Editor />
    </CreateProjectContext.Provider>
  );
}
