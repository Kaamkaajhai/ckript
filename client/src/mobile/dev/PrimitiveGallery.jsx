import { useEffect, useState } from "react";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import PageHeader from "../components/app-bars/PageHeader";
import AppBar, { AppBarAction, AppBarAvatar } from "../components/app-bars/AppBar";
import NavBar from "../components/navigation/NavBar";
import Button from "../components/buttons/Button";
import IconButton from "../components/buttons/IconButton";
import TextField from "../components/forms/TextField";
import TextArea from "../components/forms/TextArea";
import SelectField from "../components/forms/SelectField";
import Checkbox from "../components/forms/Checkbox";
import RadioGroup from "../components/forms/RadioGroup";
import Switch from "../components/forms/Switch";
import FilePicker from "../components/forms/FilePicker";
import List from "../components/lists/List";
import ListRow from "../components/lists/ListRow";
import LoadMore from "../components/lists/LoadMore";
import Card, {
  CardActions,
  CardBody,
  CardEyebrow,
  CardFooter,
  CardMedia,
  CardTags,
  CardText,
  CardTitle,
} from "../components/cards/Card";
import Badge from "../components/badges/Badge";
import Chip, { ChipRow } from "../components/chips/Chip";
import SegmentedControl from "../components/tabs/SegmentedControl";
import Tabs, { TabPanel } from "../components/tabs/Tabs";
import EmptyState from "../components/EmptyState";
import InlineMessage from "../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonRows, SkeletonText } from "../components/feedback/Skeletons";
import { useToast } from "../components/feedback/toastContext";
import Sheet from "../components/overlays/Sheet";
import Dialog from "../components/overlays/Dialog";
import ConfirmDialog from "../components/overlays/ConfirmDialog";
import ActionSheet from "../components/overlays/ActionSheet";
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

/*
 * One deliberate account per audience. The chrome reads the live AuthContext by
 * default, so without these the gallery could only ever show the signed-in
 * developer's own bar — and the whole point of the specimen is to compare four.
 */
const AUDIENCE_SPECIMENS = [
  { label: "Writer", user: { role: "writer", _id: "u1", name: "Ada Lovelace", username: "ada" } },
  { label: "Industry", user: { role: "producer", _id: "u2", name: "Otto Preminger", username: "otto" } },
  { label: "Reader", user: { role: "reader", _id: "u3", name: "Rae Ito" } },
  { label: "Admin", user: { role: "admin", _id: "u4", name: "Sam Ops", username: "samops" } },
];

const GENRES = ["Drama", "Thriller", "Comedy", "Documentary"];
const FORMATS = [
  { value: "film", label: "Feature film", description: "90 minutes or longer" },
  { value: "series", label: "Series", description: "Two or more episodes" },
  { value: "short", label: "Short film" },
];
const SAMPLE_FILE = { name: "the-final-draft-v7-REVISED-clean.pdf", size: 2_411_724 };

const FILTERS = ["Drama", "Thriller", "Documentary", "Short film", "Regional language"];
const SORTS = [
  { value: "recent", label: "Recent" },
  { value: "rated", label: "Top rated" },
  { value: "price", label: "Price" },
];
const PROJECT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews", count: 12 },
  { id: "collaborators", label: "Collaborators", count: 3 },
  { id: "versions", label: "Version history" },
];

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
  const [genres, setGenres] = useState(["Drama"]);
  const [sort, setSort] = useState("recent");
  const [tab, setTab] = useState("reviews");
  const [loaded, setLoaded] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);

  // Overlays. `overlay` holds at most one of the three surfaces; `confirm` is
  // separate because it must be able to stack *on top of* the action sheet —
  // that pairing is the one the stacking rules exist for.
  const [overlay, setOverlay] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [sheetNote, setSheetNote] = useState("");
  const [undone, setUndone] = useState(false);
  const toast = useToast();

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

  const toggleGenre = (genre) => setGenres((list) => (
    list.includes(genre) ? list.filter((g) => g !== genre) : [...list, genre]
  ));

  // Deliberately slow, so the pending label and the focus rescue at the end of
  // the list can both be observed rather than inferred.
  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setLoaded((n) => Math.min(64, n + 20));
      setLoadingMore(false);
    }, 900);
  };

  // A confirmation that resolves slowly, so the dialog can be seen holding
  // focus and staying open while the work it confirmed is still in flight.
  const runConfirm = () => {
    setConfirmPending(true);
    setTimeout(() => {
      setConfirmPending(false);
      setConfirm(null);
      setOverlay(null);
    }, 1400);
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
      overlays={(
        <>
          <Sheet
            open={overlay === "sheet"}
            onClose={() => setOverlay(null)}
            title="Filter scripts"
            description="Narrow the list without leaving it."
            footer={(
              <>
                <Button fullWidth onClick={() => setOverlay(null)}>Show 24 results</Button>
                <Button fullWidth variant="tertiary" onClick={() => setGenres([])}>Clear all</Button>
              </>
            )}
          >
            <div className="ckm-gallery__stack">
              <ChipRow label="Genre">
                {FILTERS.map((filter) => (
                  <Chip
                    key={filter}
                    selected={genres.includes(filter)}
                    onSelect={() => toggleGenre(filter)}
                  >
                    {filter}
                  </Chip>
                ))}
              </ChipRow>
              {/* A field inside a sheet: focus it on a device, and the footer
                  staying above the keyboard is what useKeyboardInset is for. */}
              <TextField label="Maximum price" purpose="numeric" hint="In rupees" />
              <Switch
                label="Only scripts I can afford"
                checked={notify}
                onChange={(event) => setNotify(event.target.checked)}
              />
            </div>
          </Sheet>

          <Dialog
            open={overlay === "dialog"}
            onClose={() => setOverlay(null)}
            title="Edit logline"
            description="Autosaved to this draft"
            action={<Button variant="tertiary" onClick={() => setOverlay(null)}>Save</Button>}
            footer={<Button fullWidth onClick={() => setOverlay(null)}>Done</Button>}
          >
            <div className="ckm-gallery__stack">
              <TextArea
                label="Logline"
                value={logline}
                maxLength={180}
                onChange={(event) => setLogline(event.target.value)}
              />
              <p className="ckm-gallery__note">
                A full-screen dialog covers the frame and slides in from the trailing
                edge. It dismisses with a close icon, never a back chevron — the
                app&rsquo;s history did not move.
              </p>
            </div>
          </Dialog>

          <ActionSheet
            open={overlay === "actions"}
            onClose={() => setOverlay(null)}
            title="An Unreasonable Man"
            description="Draft 7 · 118 pages"
            items={[
              { id: "share", label: "Share", icon: "share", hint: "Anyone with the link", onSelect: () => setSheetNote("Shared.") },
              { id: "duplicate", label: "Duplicate", icon: "content_copy", onSelect: () => setSheetNote("Duplicated.") },
              { id: "export", label: "Export as PDF", icon: "picture_as_pdf", onSelect: () => setSheetNote("Exported.") },
              { id: "archive", label: "Archive", icon: "archive", disabled: true, hint: "Not while a review is open" },
              { id: "delete", label: "Delete", icon: "delete", destructive: true, onSelect: () => setConfirm("destructive") },
            ]}
          />

          <ConfirmDialog
            open={confirm != null}
            destructive={confirm === "destructive"}
            pending={confirmPending}
            onCancel={() => { setConfirm(null); setConfirmPending(false); }}
            onConfirm={runConfirm}
            title={confirm === "destructive" ? "Delete this script?" : "Publish to the marketplace?"}
            message={confirm === "destructive"
              ? "This removes An Unreasonable Man and its 12 reviews. It cannot be undone."
              : "Producers will be able to find and read this script immediately."}
            confirmLabel={confirm === "destructive" ? "Delete script" : "Publish"}
          />
        </>
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
          title="Badge — status, never a target"
          note="Text colour is the darkened *-ink token: --ckm-green on --ckm-green-bg measures ~3.88:1 and fails AA."
        >
          <Badge>Draft</Badge>
          <Badge tone="success" dot>Published</Badge>
          <Badge tone="warning" icon="schedule">In review</Badge>
          <Badge tone="danger" dot>Payment failed</Badge>
          <Badge tone="accent" variant="solid">New</Badge>
          <Badge tone="success" variant="solid">Winner</Badge>
          <Badge tone="neutral" variant="outline">Optioned</Badge>
          <Badge tone="accent" size="sm">Featured</Badge>
          <Badge tone="danger" srLabel="3 unread messages">3</Badge>
        </Row>

        <Row
          title="Chip — filters that scroll"
          note="One chip family: the base pill is the dashboard's, and only the interactive forms are added. Selection is aria-pressed, not a class."
        >
          <div className="ckm-gallery__stack">
            <ChipRow label="Filter by genre">
              {FILTERS.map((genre) => (
                <Chip
                  key={genre}
                  selected={genres.includes(genre)}
                  onSelect={() => toggleGenre(genre)}
                >
                  {genre}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow label="Applied filters" wrap>
              {genres.map((genre) => (
                <Chip key={genre} selected onSelect={() => toggleGenre(genre)} onRemove={() => toggleGenre(genre)}>
                  {genre}
                </Chip>
              ))}
              <Chip icon="tune" onSelect={() => {}}>All filters</Chip>
              <Chip disabled onSelect={() => {}}>Unavailable</Chip>
            </ChipRow>
            <div className="ckm-gallery__specimens">
              <Chip>Drama</Chip>
              <Chip tone="green">Published</Chip>
              <Chip tone="gold">Pending</Chip>
            </div>
          </div>
        </Row>

        <Row
          title="Segmented control — a radio group, not tabs"
          note="It changes what one list shows, so it is a real radio group: arrow keys and 'Sort, Recent, 1 of 3' come free."
        >
          <div className="ckm-gallery__stack">
            <SegmentedControl label="Sort scripts by" name="gallery-sort" options={SORTS} value={sort} onChange={setSort} />
            <SegmentedControl
              label="Availability"
              name="gallery-availability"
              options={[
                { value: "all", label: "Everything" },
                { value: "free", label: "Free to read" },
                { value: "paid", label: "Paid, including long labels" },
              ]}
              value="free"
              onChange={() => {}}
            />
          </div>
        </Row>

        <Row
          title="Tabs — one Tab stop, arrow keys, real panels"
          note="Focus the bar and press Left/Right/Home/End. Six tabs built as six buttons would cost a keyboard user six presses to get past."
        >
          <div className="ckm-gallery__stack">
            <div className="ckm-gallery__bleed">
              <Tabs tabsId="gallery" label="Project sections" tabs={PROJECT_TABS} value={tab} onChange={setTab} />
            </div>
            {PROJECT_TABS.map((t) => (
              <TabPanel key={t.id} tabsId="gallery" id={t.id} value={tab}>
                <p className="ckm-gallery__note">{`The ${t.label} panel. It is focusable, so Tab from the bar lands here rather than skipping past it.`}</p>
              </TabPanel>
            ))}
            <Tabs
              tabsId="gallery-fitted"
              label="Two sections"
              tabs={[{ id: "mine", label: "My scripts" }, { id: "shared", label: "Shared with me" }]}
              value="mine"
              onChange={() => {}}
              fitted
            />
          </div>
        </Row>

        <Row
          title="List — real <ul>, real <li>"
          note="A row can navigate and still carry its own switch: the link's ::after covers the row, and the action sits above it."
        >
          <div className="ckm-gallery__stack">
            <div className="ckm-gallery__bleed">
              <List heading="Recent activity" inset>
                <ListRow
                  leading="description"
                  title="The Last Scene"
                  subtitle="Draft · 118 pages · edited 2 hours ago"
                  trailing={<Badge tone="warning">In review</Badge>}
                  chevron
                  to="/dashboard"
                />
                <ListRow
                  leading="group"
                  title="Arshad Rahman wants to collaborate on a screenplay with an unreasonably long title"
                  subtitle="Sent you a request 4 days ago"
                  chevron
                  to="/dashboard"
                />
                <ListRow
                  leading="notifications"
                  title="Email notifications"
                  subtitle="A weekly digest of producer activity"
                  action={<Switch label="Email notifications" srOnlyLabel checked={notify} onChange={setNotify} />}
                />
                <ListRow leading="payments" title="Payouts" trailing="₹24,000" chevron current to="/dashboard" />
                <ListRow leading="lock" title="Archived scripts" subtitle="Not available on this plan" disabled chevron />
                <ListRow leading="delete" title="Delete account" tone="danger" onClick={() => {}} />
              </List>
            </div>

            <div className="ckm-gallery__bleed">
              <List label="Compact settings" inset bordered>
                <ListRow size="compact" title="Language" trailing="English" chevron onClick={() => {}} />
                <ListRow size="compact" title="Currency" trailing="INR ₹" chevron onClick={() => {}} />
                <ListRow size="compact" title="App version" trailing="2.14.0" />
              </List>
            </div>
          </div>
        </Row>

        <Row
          title="Card — whole surface tappable, one accessible name"
          note="The title is the only link; its ::after covers the card. The bookmark button sits above that overlay with its own name."
        >
          <div className="ckm-gallery__stack">
            <Card>
              <CardMedia
                overlay={(
                  <>
                    <Badge tone="accent" variant="solid" size="sm">Featured</Badge>
                    <Badge tone="neutral" variant="outline" size="sm">4.6 ★</Badge>
                  </>
                )}
              />
              <CardBody>
                <CardEyebrow>Feature film · Drama</CardEyebrow>
                <CardTitle to="/dashboard">The Last Scene</CardTitle>
                <CardText>
                  A screenwriter discovers the producer who optioned her script has been dead for a year.
                </CardText>
                <CardTags>
                  <Chip>Drama</Chip>
                  <Chip>118 pages</Chip>
                  <Chip tone="green">Available</Chip>
                </CardTags>
              </CardBody>
              <CardFooter>
                <span>₹2,400 · 18 reads</span>
                <CardActions>
                  <IconButton icon="bookmark" label="Save The Last Scene" size="sm" />
                  <IconButton icon="share" label="Share The Last Scene" size="sm" />
                </CardActions>
              </CardFooter>
            </Card>

            <Card>
              <CardBody>
                <CardTitle to="/dashboard">
                  An Unreasonably Long Screenplay Title That Has To Clamp At Two Lines Or It Pushes The Price Below The Fold
                </CardTitle>
                <CardText>No cover image: the placeholder holds the shape so a list of cards does not reflow as it loads.</CardText>
              </CardBody>
            </Card>
          </div>
        </Row>

        <Row
          title="Load more — a count, not an infinite scroll"
          note="'Showing 20 of 64' is a status message (SC 4.1.3): announced on change, and it never takes focus. Tap until the end to see the focus rescue."
        >
          <div className="ckm-gallery__stack">
            <LoadMore
              loaded={loaded}
              total={64}
              pageSize={20}
              pending={loadingMore}
              noun="scripts"
              endMessage="That is every script in this list."
              onLoadMore={loadMore}
            />
            <LoadMore
              loaded={20}
              total={64}
              pageSize={20}
              noun="scripts"
              error="We could not load the next page. Check your connection and try again."
              onRetry={() => {}}
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

        <Row
          title="Overlays"
          note="Open each and press Tab repeatedly: focus must never leave the surface, and Escape must return it to the button you opened it with."
        >
          <div className="ckm-gallery__stack">
            <Button fullWidth variant="secondary" onClick={() => setOverlay("sheet")}>
              Bottom sheet — short contextual task
            </Button>
            <Button fullWidth variant="secondary" onClick={() => setOverlay("dialog")}>
              Full-screen dialog — replaces the screen
            </Button>
            <Button fullWidth variant="secondary" onClick={() => setConfirm("plain")}>
              Confirm dialog — non-destructive
            </Button>
            <Button fullWidth variant="secondary" onClick={() => setConfirm("destructive")}>
              Confirm dialog — destructive (focus lands on Cancel)
            </Button>
            <Button
              fullWidth
              variant="secondary"
              aria-haspopup="dialog"
              aria-expanded={overlay === "actions"}
              onClick={() => setOverlay("actions")}
            >
              Action sheet — the mobile &ldquo;context menu&rdquo;
            </Button>
            {sheetNote && <p className="ckm-gallery__note" role="status">{sheetNote}</p>}
          </div>
        </Row>

        <Row
          title="Overlay — stacked"
          note="An action sheet whose destructive item opens a confirm dialog over it. Only the top surface takes Escape; the sheet below it is inert until the confirmation is answered."
        >
          <div className="ckm-gallery__stack">
            <Button fullWidth variant="secondary" onClick={() => setOverlay("actions")}>
              Open, then tap Delete
            </Button>
          </div>
        </Row>

        <Row
          title="Toast"
          note="One at a time; the rest queue. Watch the last two: an error and anything carrying an action refuse to auto-dismiss, because when the surface goes so does the chance to read or act on it."
        >
          <div className="ckm-gallery__stack">
            <Button fullWidth variant="secondary" onClick={() => toast.success("Draft saved")}>
              Success — fades after 5s
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => toast.info("Two more scripts to review", "You have until Friday to submit your notes.")}
            >
              Info with description — fades after 7s
            </Button>
            <Button fullWidth variant="secondary" onClick={() => toast.warning("Your plan expires in 3 days")}>
              Warning
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => toast.error("Upload failed", "The file was larger than 25 MB.")}
            >
              Error — stays until dismissed, announced assertively
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => toast.show({
                tone: "success",
                title: "Project deleted",
                action: { label: "Undo", onAction: () => setUndone(true) },
              })}
            >
              With an action — stays until dismissed
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => {
                toast.success("First");
                toast.success("Second");
                toast.error("Third — an error queued behind two acknowledgements");
              }}
            >
              Three at once — queue order
            </Button>
            {undone && <p className="ckm-gallery__note" role="status">Undo ran.</p>}
          </div>
        </Row>

        <Row
          title="Inline message"
          note="The durable half of the pair. A toast says something happened; this says something is still true, so it does not disappear — which is why a toast is never the only place an error is reported."
        >
          <div className="ckm-gallery__stack">
            <InlineMessage tone="error" title="We could not save your changes" onRetry={() => {}}>
              The server did not respond. Your draft is still on this device.
            </InlineMessage>
            <InlineMessage tone="warning" title="This script has no logline">
              Producers filter by logline, so this one will be missed by most searches.
            </InlineMessage>
            <InlineMessage tone="success" title="Payment received" />
            <InlineMessage tone="info" title="Reviews are hidden until you publish" />
            <InlineMessage tone="error" title={LONG_LABEL}>
              A message long enough to wrap on every supported width, to prove the icon column
              stays aligned with the first line rather than centring on the block.
            </InlineMessage>
          </div>
        </Row>

        <Row
          title="Failure panel and empty state"
          note="Same geometry, two different facts about the world: this region failed, versus this region has nothing in it yet. Only one of them is worth a retry."
        >
          <div className="ckm-gallery__stack">
            <InlineMessage
              variant="panel"
              tone="error"
              title="We could not load your projects"
              onRetry={() => {}}
            >
              Check your connection and try again.
            </InlineMessage>
            <EmptyState
              icon="draw"
              titleAs="h3"
              title="No projects yet"
              body="Your scripts will appear here once you create or upload one."
              actions={<Button icon="add">Create a project</Button>}
            />
          </div>
        </Row>

        <Row
          title="Skeletons"
          note="One status message for the whole group — 'Loading your projects' — and every shape hidden from assistive technology. A count is deliberately not announced: it is a guess about layout."
        >
          <div className="ckm-gallery__stack">
            <SkeletonGroup label="Loading your projects">
              <SkeletonRows rows={3} />
            </SkeletonGroup>
            <SkeletonGroup label="Loading the logline">
              <SkeletonText lines={3} />
            </SkeletonGroup>
          </div>
        </Row>

        <Row
          title="Role-aware chrome — the four audiences"
          note="Destinations are NOT declared in mobile code: they come from layouts/app-shell/navigation/presets, the same model the desktop rail reads, so a destination cannot exist in one bar and not the other. The selected tab comes from the URL, never a prop — these specimens are rendered outside their own routes, so none of them shows a selected tab, which is the correct answer for a URL that belongs to no tab."
        >
          <div className="ckm-gallery__stack">
            {AUDIENCE_SPECIMENS.map(({ label, user }) => (
              <div className="ckm-gallery__chrome" key={label}>
                <p className="ckm-gallery__note">{label}</p>
                <AppBar
                  user={user}
                  actions={(
                    <>
                      <AppBarAction glyph="notifications" label="Notifications" badge={3} />
                      <AppBarAvatar initials="AL" />
                    </>
                  )}
                />
                <NavBar user={user} msgCount={label === "Writer" ? 7 : 0} />
              </div>
            ))}
          </div>
        </Row>

        <Row
          title="Offline"
          note="Owned by the shell, so there is no button for it here. Toggle DevTools → Network → Offline: a gold bar appears under the app bar and pushes the screen down rather than covering it, then turns green with a retry when the device reports a network again. The copy says 'appear to be offline' and 'your device is back online' on purpose — navigator.onLine speaks for the network interface, not for whether Ckript can be reached."
        >
          <div className="ckm-gallery__stack">
            <p className="ckm-gallery__note">
              The banner renders above this scroll surface, not inside it.
            </p>
          </div>
        </Row>
      </div>
    </MobileShell>
  );
}
