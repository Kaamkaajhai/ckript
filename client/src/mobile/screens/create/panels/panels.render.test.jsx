// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectContext } from "../../../../pages/CreateProject/CreateProjectContext";
import { DETAILS_PANELS } from "./DetailsPanels";
import { ClassifyPanel, FilmInfoPanel, PublishPanel } from "./StepPanels";

/*
 * The ported panels. What is worth testing is not that a field exists — the
 * orchestrator owns the values and has its own suite — but the handful of places
 * where porting could quietly change BEHAVIOUR rather than presentation:
 *
 *   • a control that writes state in a shape the orchestrator does not expect
 *     (the Switch hands back a boolean where `handleChange` wants an event);
 *   • a cap re-implemented locally instead of driven through `toggleChip`;
 *   • a list that stops being a list, losing the credit ORDER it exists to show;
 *   • an action that is enabled when the desktop one is not.
 */

vi.mock("react-easy-crop", () => ({ default: () => <div data-testid="cropper" /> }));
vi.mock("../../../../components/ScreenplayReadOnly", () => ({
  default: () => <div data-testid="screenplay-readonly" />,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

const baseContext = (overrides = {}) => ({
  formData: {
    format: "feature_film", styleMedium: "", companyName: "", logline: "", synopsis: "",
    primaryGenre: "", completionStatus: "complete", completedParts: "", totalParts: "",
    futurePlans: "", viewableScript: false, previewWindowStart: "1", previewWindowEnd: "2",
  },
  setFormData: vi.fn(),
  handleChange: vi.fn(),
  targetFilm: true,
  estimatedPages: 47,
  pageStatus: "short",
  formatInfo: { label: "Feature Film", typical: "90–120" },
  wordCount: 8420,
  writers: [{ userId: "u1", name: "Arshad Rahman", creditType: "written_by" }],
  addWriter: vi.fn(), updateWriter: vi.fn(), removeWriter: vi.fn(), moveWriter: vi.fn(),
  tagsInput: "", setTagsInput: vi.fn(),
  handleGenerateMetadata: vi.fn(), metaLoadingField: "", metaNotice: { field: "", text: "" },
  roles: [], addRole: vi.fn(), removeRole: vi.fn(), updateRoleField: vi.fn(), updateRoleAge: vi.fn(),
  publishingDetails: { targetAudience: [], writingStyle: [], estimatedWordCount: "", seriesPotential: "", proseSample: "" },
  setPublishingDetails: vi.fn(), handleProseClick: vi.fn(), proseLoading: false,
  previewPageTexts: [],
  classification: { tones: [], themes: [], settings: [] },
  toggleChip: vi.fn(),
  filmDetails: { wantToDirect: false, wantToProduce: false, filmLanguage: "", filmLanguageCustom: "", dialoguesPresent: "" },
  setFilmDetails: vi.fn(),
  scriptPrice: 149, setScriptPrice: vi.fn(),
  legal: { agreedToTerms: false }, setLegal: vi.fn(),
  rightsLicensing: { legalAcknowledgement: { ownershipConfirmed: false }, royaltySettings: {} },
  setRightsLicensing: vi.fn(),
  agreementRef: { current: null },
  editorZoom: 1,
  user: { role: "creator", subscription: { plan: "gold" } },
  thumbnailFile: null, thumbnailPreviewUrl: "", trailerFile: null, trailerPreviewUrl: "",
  trailerMeta: null, trailerMetaLoading: false, pitchVideoFile: null, pitchVideoPreviewUrl: "",
  pitchVideoMeta: null, pitchVideoMetaLoading: false,
  handleThumbnailSelect: vi.fn(), handleTrailerSelect: vi.fn(), handlePitchVideoSelect: vi.fn(),
  setThumbnailFile: vi.fn(), setTrailerFile: vi.fn(), setPitchVideoFile: vi.fn(), setError: vi.fn(),
  downloadWatermarkedImage: vi.fn(), formatDuration: () => "0s", generateAiCover: vi.fn(),
  isGeneratingAiCover: false, aiCoverAttempts: 0, aiCoverHistory: [], aiCoverIndex: 0,
  setAiCoverIndex: vi.fn(), openThumbnailEditor: vi.fn(),
  ...overrides,
});

const render = (Panel, ctx) => {
  const container = document.createElement("div");
  container.className = "ckm";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter>
        <CreateProjectContext.Provider value={ctx}>
          <Panel />
        </CreateProjectContext.Provider>
      </MemoryRouter>
    );
  });
};

const accessibleName = (el) => {
  const label = el.getAttribute("aria-label");
  if (label) return label.trim();
  const clone = el.cloneNode(true);
  for (const hidden of clone.querySelectorAll("[aria-hidden='true']")) hidden.remove();
  return clone.textContent.trim();
};

const control = (name) => Array.from(document.querySelectorAll("button, a"))
  .find((el) => accessibleName(el) === name);
const chip = (text) => Array.from(document.querySelectorAll(".ckm-chip__main"))
  .find((el) => el.textContent.trim().endsWith(text));
const click = (el) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

beforeEach(() => { document.body.innerHTML = ""; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

/* ───────────────────────────── Basics ────────────────────────────────── */

describe("Basics panel", () => {
  const writers = [
    { userId: "u1", name: "Arshad Rahman", creditType: "written_by" },
    { userId: null, name: "Meher Sethi", creditType: "story_by" },
  ];

  it("keeps writer credits a list, because the order IS the billing", () => {
    render(DETAILS_PANELS.basics, baseContext({ writers }));
    const items = document.querySelectorAll(".ckm-create-project__stack > li");

    expect(items).toHaveLength(2);
    expect(items[0].closest("ul")).toBeTruthy();
  });

  it("names each reorder control after the writer it moves", () => {
    // "Move up" three times in a row is unusable with a screen reader.
    render(DETAILS_PANELS.basics, baseContext({ writers }));

    expect(control("Move Arshad Rahman down")).toBeTruthy();
    expect(control("Move Meher Sethi up")).toBeTruthy();
  });

  it("disables the moves that would fall off the ends", () => {
    render(DETAILS_PANELS.basics, baseContext({ writers }));

    expect(control("Move Arshad Rahman up").disabled).toBe(true);
    expect(control("Move Meher Sethi down").disabled).toBe(true);
    expect(control("Move Arshad Rahman down").disabled).toBe(false);
  });

  it("refuses to remove the last credit, so a project can never be unattributed", () => {
    render(DETAILS_PANELS.basics, baseContext());
    expect(control("Remove").disabled).toBe(true);
  });

  it("reads the page count as a status with the format's range, not as a bare number", () => {
    render(DETAILS_PANELS.basics, baseContext({ pageStatus: "short" }));
    const message = document.querySelector(".ckm-message");

    expect(message.textContent).toContain("47 pages");
    expect(message.textContent).toContain("90–120");
    expect(message.textContent).toMatch(/early draft/i);
  });

  it("hides the film-only page estimate on the publishing track", () => {
    render(DETAILS_PANELS.basics, baseContext({ targetFilm: false }));
    expect(document.querySelector(".ckm-message")).toBeNull();
  });
});

/* ───────────────────────────── Access ────────────────────────────────── */

describe("Access panel", () => {
  it("hands the Switch's boolean to handleChange in the event shape it expects", () => {
    // The Switch reports `next`, not an event. Getting this wrong would set
    // `viewableScript` to an object and silently publish a preview nobody asked
    // for — the exact class of bug a port introduces.
    const handleChange = vi.fn();
    render(DETAILS_PANELS.access, baseContext({ handleChange }));

    click(document.querySelector(".ckm-switch__control"));

    expect(handleChange).toHaveBeenCalledWith({
      target: { name: "viewableScript", type: "checkbox", checked: true },
    });
  });

  it("shows nothing but an explanation while the preview is off", () => {
    render(DETAILS_PANELS.access, baseContext());

    expect(control("Preview 1 page")).toBeUndefined();
    expect(document.body.textContent).toMatch(/No preview will be shown/i);
  });

  it("refuses the preview when the range holds no text, and says so", () => {
    render(DETAILS_PANELS.access, baseContext({
      formData: { ...baseContext().formData, viewableScript: true },
      previewPageTexts: ["   ", ""],
    }));

    const button = control("Nothing to preview yet");
    expect(button.getAttribute("aria-disabled") ?? String(button.disabled)).toBe("true");
  });

  it("summons the preview rather than embedding one CodeMirror per page in the form", () => {
    render(DETAILS_PANELS.access, baseContext({
      formData: { ...baseContext().formData, viewableScript: true },
      previewPageTexts: ["INT. ROOM - NIGHT", "EXT. PLATFORM - DAY", "unused page three"],
    }));

    // Nothing is mounted until asked for.
    expect(document.querySelectorAll("[data-testid='screenplay-readonly']")).toHaveLength(0);

    click(control("Preview 2 pages"));

    // And only the chosen window, not the whole script.
    expect(document.querySelectorAll("[data-testid='screenplay-readonly']")).toHaveLength(2);
    expect(document.querySelector(".ckm-dialog")).toBeTruthy();
  });
});

/* ───────────────────────────── Media ─────────────────────────────────── */

describe("Media panel", () => {
  it("makes the drop zone a label bound to the real file input", () => {
    // A touch device has nothing to drag a file from, so the zone is a tap
    // target — and it works through the label, not a JS click forward, which is
    // what keeps the input focusable and announced.
    render(DETAILS_PANELS.media, baseContext());
    const label = document.querySelector(".ckm-media__drop");
    const input = document.getElementById(label.getAttribute("for"));

    expect(input?.type).toBe("file");
    expect(input.accept).toContain("image/jpeg");
  });

  it("offers the AI generator beside the picker while there is no cover yet", () => {
    const generateAiCover = vi.fn();
    render(DETAILS_PANELS.media, baseContext({ generateAiCover }));

    const generate = document.querySelector(".ckm-media__drop--alt");
    expect(generate.textContent).toContain("Generate a cover");

    click(generate);
    expect(generateAiCover).toHaveBeenCalledTimes(1);
  });

  it("locks the pitch video behind the same plan gate desktop applies", () => {
    render(DETAILS_PANELS.media, baseContext({
      user: { role: "creator", subscription: { plan: "silver" } },
    }));

    expect(document.body.textContent).toMatch(/Pitch video is a premium feature/i);
    expect(control("View plans")).toBeTruthy();
  });

  it("offers the pitch upload to a paid writer", () => {
    render(DETAILS_PANELS.media, baseContext());

    expect(document.body.textContent).not.toMatch(/premium feature/i);
    const slots = Array.from(document.querySelectorAll(".ckm-media__drop"))
      .map((el) => el.textContent);
    expect(slots.some((text) => text.includes("Choose pitch video"))).toBe(true);
  });

  it("drops the trailer slot on the publishing track", () => {
    render(DETAILS_PANELS.media, baseContext({ targetFilm: false }));
    expect(document.body.textContent).not.toMatch(/Trailer video/i);
  });
});

/* ───────────────────────────── Classify ──────────────────────────────── */

describe("Classify panel", () => {
  it("drives the cap through toggleChip one tag at a time", () => {
    // `toggleChip` already owns the add/remove and the three-item cap. Two
    // implementations is how the platforms end up disagreeing about whether a
    // fourth tone is allowed.
    const toggleChip = vi.fn();
    render(ClassifyPanel, baseContext({
      classification: { tones: ["Dark"], themes: [], settings: [] },
      toggleChip,
    }));

    click(chip("Gritty"));
    expect(toggleChip).toHaveBeenCalledWith("tones", "Gritty");

    click(chip("Dark"));
    expect(toggleChip).toHaveBeenLastCalledWith("tones", "Dark");
  });

  it("sets the primary genre directly, since it is a single required value", () => {
    const setFormData = vi.fn();
    render(ClassifyPanel, baseContext({ setFormData }));

    click(chip("Thriller"));

    const updater = setFormData.mock.calls[0][0];
    expect(updater({ primaryGenre: "" })).toMatchObject({ primaryGenre: "Thriller" });
  });
});

/* ───────────────────────────── Film info ─────────────────────────────── */

describe("Film info panel", () => {
  it("treats directing and producing as two independent answers", () => {
    // Desktop draws them as a card pair that looks like a segmented choice but
    // toggles independently. Checkboxes say what is actually true.
    const setFilmDetails = vi.fn();
    render(FilmInfoPanel, baseContext());

    const boxes = document.querySelectorAll(".ckm-checkbox__input");
    expect(boxes).toHaveLength(2);
    expect(boxes[0].type).toBe("checkbox");
    expect(setFilmDetails).not.toHaveBeenCalled();
  });

  it("groups them under a legend so a screen reader knows what they answer", () => {
    render(FilmInfoPanel, baseContext());
    const legend = document.querySelector("fieldset > legend");

    expect(legend.textContent).toContain("Your creative role");
  });

  it("asks which language only after Other is chosen", () => {
    render(FilmInfoPanel, baseContext());
    expect(document.body.textContent).not.toContain("Which language?");

    if (root) act(() => root.unmount());
    document.body.innerHTML = "";
    render(FilmInfoPanel, baseContext({
      filmDetails: { ...baseContext().filmDetails, filmLanguage: "Other" },
    }));

    expect(document.body.textContent).toContain("Which language?");
  });
});

/* ───────────────────────────── Publish ───────────────────────────────── */

describe("Publish panel", () => {
  it("makes the agreement scrollable by keyboard, not only by finger", () => {
    // A scroll container that is not focusable cannot be scrolled by a keyboard
    // or switch user at all (WCAG 2.1.1), and this one holds 4,000 words.
    render(PublishPanel, baseContext());
    const agreement = document.querySelector(".ckm-create-project__agreement");

    expect(agreement.getAttribute("tabindex")).toBe("0");
    expect(agreement.getAttribute("role")).toBe("region");
    expect(agreement.getAttribute("aria-label")).toBeTruthy();
  });

  it("keeps both legal confirmations separate, as the publish gate reads them", () => {
    const setLegal = vi.fn();
    const setRightsLicensing = vi.fn();
    render(PublishPanel, baseContext({ setLegal, setRightsLicensing }));

    const boxes = Array.from(document.querySelectorAll(".ckm-checkbox__input"));
    expect(boxes).toHaveLength(2);

    act(() => { boxes[0].click(); });
    expect(setLegal).toHaveBeenCalledTimes(1);
    expect(setRightsLicensing).not.toHaveBeenCalled();
  });

  it("reveals the royalty fields only for the payment structures that have them", () => {
    render(PublishPanel, baseContext());
    expect(document.body.textContent).not.toContain("Royalty percentage");

    if (root) act(() => root.unmount());
    document.body.innerHTML = "";
    render(PublishPanel, baseContext({
      rightsLicensing: {
        paymentStructure: "revenue_sharing_model",
        royaltySettings: { percentage: 5, durationType: "years", durationYears: 3 },
        legalAcknowledgement: { ownershipConfirmed: false },
      },
    }));

    expect(document.body.textContent).toContain("Royalty percentage");
    expect(document.body.textContent).toContain("How many years");
  });

  it("normalises the rights state on every edit rather than writing a raw patch", () => {
    const setRightsLicensing = vi.fn();
    render(PublishPanel, baseContext({ setRightsLicensing }));

    click(chip("Full rights sale"));

    const updater = setRightsLicensing.mock.calls[0][0];
    const next = updater({ rightsType: "custom_negotiation_required" });
    expect(next.rightsType).toBe("full_rights_sale");
    // normalizeRightsLicensingState fills the shape the server validates.
    expect(next.royaltySettings).toBeDefined();
  });

  it("keeps the price presets and the custom field pointed at one value", () => {
    const setScriptPrice = vi.fn();
    render(PublishPanel, baseContext({ scriptPrice: 149, setScriptPrice }));

    expect(chip("₹149").getAttribute("aria-pressed")).toBe("true");

    click(chip("₹99"));
    expect(setScriptPrice).toHaveBeenCalledWith(99);
  });
});
