import { useEffect, useState } from "react";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import PageHeader from "../components/app-bars/PageHeader";
import Button from "../components/buttons/Button";
import IconButton from "../components/buttons/IconButton";
import TextField from "../components/forms/TextField";
import TextArea from "../components/forms/TextArea";
import SelectField from "../components/forms/SelectField";
import Checkbox from "../components/forms/Checkbox";
import RadioGroup from "../components/forms/RadioGroup";
import Switch from "../components/forms/Switch";
import FilePicker from "../components/forms/FilePicker";
import "./PrimitiveGallery.css";

/*
 * PrimitiveGallery — the Phase 1 states/theme harness (prefix: ckm-gallery).
 *
 * Mounted only by App.jsx's development-only /__mobile-primitives route. It
 * exists so a primitive's states can be verified at 320–768px *before* any
 * screen depends on it: every variant, size, pending, disabled, long-label and
 * stress fixture on one scroll surface, with the live viewport width on screen
 * so a width-specific break is obvious while resizing.
 *
 * It also dogfoods the shell contract: one MobileShell, one PageHeader in the
 * app-bar slot, one <main>. If a primitive cannot be composed here without a
 * page-specific override, the primitive is not finished.
 *
 * One caveat this file cannot avoid: showing PageHeader specimens means more
 * than one <h1> on the page. That is a property of a gallery, not of a screen —
 * PageHeader's whole job is to give a real screen exactly one. Do not "fix" it
 * by adding a heading-level prop.
 */

const LONG_LABEL = "Submit this screenplay to the Ckript International Challenge";

function Row({ title, note, children }) {
  return (
    <section className="ckm-gallery__row">
      <h2 className="ckm-gallery__row-title">{title}</h2>
      {note && <p className="ckm-gallery__note">{note}</p>}
      <div className="ckm-gallery__specimens">{children}</div>
    </section>
  );
}

const GENRES = ["Drama", "Thriller", "Comedy", "Documentary"];
const FORMATS = [
  { value: "film", label: "Feature film", description: "90 minutes or longer" },
  { value: "series", label: "Series", description: "Two or more episodes" },
  { value: "short", label: "Short film" },
];
const SAMPLE_FILE = { name: "the-final-draft-v7-REVISED-clean.pdf", size: 2_411_724 };

export default function PrimitiveGallery() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 0 : window.innerWidth));
  const [pending, setPending] = useState(false);

  // Live state, so the interactive controls are actually exercisable here
  // rather than being frozen specimens.
  const [logline, setLogline] = useState("A screenwriter discovers her producer is an AI.");
  const [accepted, setAccepted] = useState(false);
  const [format, setFormat] = useState("series");
  const [notify, setNotify] = useState(true);
  const [files, setFiles] = useState([SAMPLE_FILE]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // A real round trip, so the pending state is seen the way a user sees it.
  const runPending = () => {
    setPending(true);
    const t = setTimeout(() => setPending(false), 1600);
    return () => clearTimeout(t);
  };

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.DETAIL}
      screenId="primitive-gallery"
      className="ckm-gallery"
      scrollClassName="ckm-gallery__scroll"
      appBar={(
        <PageHeader
          eyebrow="Phase 1"
          title="Mobile primitives"
          subtitle={`Live width ${width}px · verify 320 / 360 / 390 / 430 / 768`}
          backTo="/dashboard"
          actions={(
            <>
              <IconButton icon="notifications" label="Notifications" badge={3} />
              <IconButton icon="more_vert" label="More options" />
            </>
          )}
        />
      )}
    >
      <div className="ckm-gallery__page">
        <Row
          title="Button — intent"
          note="Primary is ink, not terracotta: white on --ckm-accent measures ~4.35:1 and fails AA for label text."
        >
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="destructive" icon="delete">Delete</Button>
        </Row>

        <Row title="Button — size and width">
          <Button size="md">Medium 44px</Button>
          <Button size="lg">Large 52px</Button>
          <Button fullWidth icon="add" size="lg">Full-width primary action</Button>
          <Button fullWidth variant="secondary" trailingIcon="arrow_forward">Continue</Button>
        </Row>

        <Row
          title="Button — pending and disabled"
          note="Pending keeps focus and blocks the double submit; disabled leaves the tab order."
        >
          <Button pending={pending} pendingLabel="Saving…" onClick={runPending}>
            Tap to save
          </Button>
          <Button variant="secondary" pending pendingLabel="Uploading…">Upload</Button>
          <Button disabled>Disabled</Button>
          <Button variant="destructive" disabled>Delete</Button>
        </Row>

        <Row title="Button — as navigation">
          <Button to="/dashboard" variant="secondary" icon="dashboard">Link to dashboard</Button>
          <Button href="https://ckript.com" variant="tertiary" trailingIcon="open_in_new">External</Button>
        </Row>

        <Row
          title="Button — stress fixtures"
          note="Long and translated labels wrap inside the control; they never widen the page."
        >
          <Button fullWidth>{LONG_LABEL}</Button>
          <Button variant="secondary">{LONG_LABEL}</Button>
          <Button>1</Button>
        </Row>

        <Row
          title="Icon button"
          note="sm is drawn at 36px and tapped at 44px; the badge count is part of the accessible name."
        >
          <IconButton icon="search" label="Search" />
          <IconButton icon="bookmark" label="Save script" variant="soft" />
          <IconButton icon="share" label="Share" size="sm" />
          <IconButton icon="delete" label="Delete draft" tone="danger" />
          <IconButton icon="notifications" label="Notifications" badge={128} />
          <IconButton icon="favorite" label="Following" active />
          <IconButton icon="edit" label="Edit" disabled />
        </Row>

        <Row
          title="Page header — long title"
          note="Two-line clamp with the full value in the title attribute; actions stay reachable at 320px."
        >
          <div className="ckm-gallery__frame">
            <PageHeader
              eyebrow="Draft"
              title="An Unreasonably Long Screenplay Title That Would Otherwise Push The Actions Off Screen"
              backTo="/dashboard"
              backLabel="Projects"
              actions={<IconButton icon="more_vert" label="More options" size="sm" />}
            />
          </div>
          <div className="ckm-gallery__frame">
            <PageHeader title="No back, no actions" border={false} />
          </div>
        </Row>

        <Row
          title="Text field — keyboard, hint, error"
          note="Every input renders at 16px: below that, iOS Safari zooms on focus and does not zoom back."
        >
          <div className="ckm-gallery__stack">
            <TextField label="Screenplay title" placeholder="Untitled" required />
            <TextField label="Email" purpose="email" hint="We only use this for submission updates." />
            <TextField label="Page count" purpose="number" hint="Numeric keyboard, but not type=number." />
            <TextField label="Search scripts" purpose="search" icon="search" placeholder="Title, writer, genre…" />
            <TextField
              label="Email"
              purpose="email"
              defaultValue="not-an-email"
              error="Enter a valid email address, like name@example.com."
            />
            <TextField label="Writer" defaultValue="Arshad Rahman" disabled />
          </div>
        </Row>

        <Row title="Textarea — live counter">
          <div className="ckm-gallery__stack">
            <TextArea
              label="Logline"
              maxLength={140}
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              hint="One sentence. What is the story about?"
            />
          </div>
        </Row>

        <Row
          title="Select — native picker"
          note="Native on purpose: no custom listbox beats the platform picker on a phone."
        >
          <div className="ckm-gallery__stack">
            <SelectField label="Genre" options={GENRES} placeholder="Choose a genre" required />
            <SelectField label="Genre" options={GENRES} error="Choose a genre to continue." />
          </div>
        </Row>

        <Row title="Choice controls">
          <div className="ckm-gallery__stack">
            <Checkbox
              label="I accept the script upload terms"
              description="Your script stays behind the paywall until you publish it."
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <Checkbox label="Email me about challenges" error="You must accept the terms to continue." />
            <RadioGroup
              label="Format"
              name="gallery-format"
              options={FORMATS}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              required
            />
            <Switch
              label="Email notifications"
              description="A weekly digest of producer activity."
              checked={notify}
              onChange={setNotify}
            />
            <Switch label="Disabled setting" checked={false} disabled />
          </div>
        </Row>

        <Row
          title="File picker"
          note="A chosen file is removable; the name truncates instead of pushing the remove control away."
        >
          <div className="ckm-gallery__stack">
            <FilePicker
              label="Screenplay"
              buttonLabel="Choose a PDF"
              accept="application/pdf"
              hint="PDF or Final Draft, up to 20 MB."
              files={files}
              onSelect={setFiles}
              onRemove={(_, index) => setFiles((list) => list.filter((__, i) => i !== index))}
              required
            />
          </div>
        </Row>

        <Row
          title="Destructive adjacency"
          note="§7.4: a destructive action never sits within a thumb-slip of the primary one."
        >
          <div className="ckm-gallery__stack">
            <Button fullWidth>Save changes</Button>
            <Button fullWidth variant="tertiary">Discard</Button>
            <div className="ckm-gallery__danger-zone">
              <Button fullWidth variant="destructive" icon="delete_forever">Delete project</Button>
            </div>
          </div>
        </Row>

        <Row
          title="Keyboard reach"
          note="The last field on the screen. Focus it on a real device: it and its error must stay visible once the keyboard opens."
        >
          <div className="ckm-gallery__stack">
            <TextField
              label="Last field on the page"
              purpose="tel"
              error="This error must remain visible with the keyboard open."
            />
          </div>
        </Row>
      </div>
    </MobileShell>
  );
}
