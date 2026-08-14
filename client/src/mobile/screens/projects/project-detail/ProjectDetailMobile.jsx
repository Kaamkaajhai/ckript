/*
 * ProjectDetailMobile — the native authenticated project-detail screen (D28).
 *
 * It serves all THREE route forms — `/script/:id`, `/script/:heading/:writer` and the root-level
 * `/:heading/:writer` — because the server resolves all three to one payload and one canonical
 * path. The screen does not know which alias it was reached by; `useProjectDetail` does, and
 * rewrites the URL to the canonical one exactly as the desktop page always has.
 *
 * WHAT THIS SLICE COVERS, AND WHAT IT SAYS ABOUT THE REST
 * ------------------------------------------------------
 * D28 is "read the project": load and canonicalize, the three failure states, the header, the
 * role-aware recommended action, the five sections, the trailer, the reader, bookmark and public
 * share. The write half — requesting a purchase, approving one, reviewing, revealing a contact,
 * booking a meeting, deleting — is D29.
 *
 * The rule that keeps that boundary honest is that a missing BUTTON never means a missing FACT.
 * Every state the deferred actions operate on is rendered as text: an approved purchase request
 * says so and links to payment, a spent contact quota says so, a project awaiting admin approval
 * says so. The viewer is never left to infer their standing from an absence.
 *
 * WHAT IT DELIBERATELY DROPS FROM THE DESKTOP WORKBENCH
 * ----------------------------------------------------
 *   • The eight-tab rail. On a phone, tabs hide four fifths of a page the viewer is trying to
 *     read end to end; the sections are stacked and the recommended action scrolls to one.
 *   • The readiness meter and its five-stage journey chrome. `deriveScriptJourney` is still the
 *     source for what is readable and what is complete, but a writer-facing progress dial on a
 *     buyer's screen is desktop-era decoration.
 *   • AI-trailer purchase, the hold modal and the invoice tools: owner/finance surfaces with their
 *     own phases.
 */
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../../../../context/AuthContext";
import {
  deriveScriptJourney,
  getRecommendedAction,
  getViewerCapabilities,
} from "../../../../pages/script-detail/scriptDetailModel";
import {
  PROJECT_DETAIL_STATUS,
  useProjectDetail,
} from "../../../../pages/script-detail/useProjectDetail";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import { getProfileCanonicalPath } from "../../../../utils/profilePath";
import PageHeader from "../../../components/app-bars/PageHeader";
import Badge from "../../../components/badges/Badge";
import Button from "../../../components/buttons/Button";
import IconButton from "../../../components/buttons/IconButton";
import EmptyState from "../../../components/EmptyState";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import { useToast } from "../../../components/feedback/toastContext";
import TrailerDialog from "../../../components/media/TrailerDialog";
import MobileShell from "../../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";
import { shareProject } from "../../../data/shareProject";
import ProjectReaderDialog from "./components/ProjectReaderDialog";
import ProjectSection from "./components/ProjectSection";
import {
  PROJECT_SECTIONS,
  buildDealTerms,
  buildEvidence,
  buildStoryFacts,
  describeCompletionProgress,
  describeContactStanding,
  describeCredit,
  describeProjectStatus,
  describeReaderAccess,
  describeTransactionStanding,
  formatMoney,
  resolveRecommendedAction,
} from "./projectDetailModel";
import "./ProjectDetailMobile.css";

const has = (value) => String(value ?? "").trim().length > 0;

function ProjectDetailLoading() {
  return (
    <SkeletonGroup label="Loading this project" className="ckm-project__loading">
      <SkeletonShape height={180} radius="var(--ckm-r-lg)" />
      <SkeletonShape height={96} radius="var(--ckm-r-lg)" />
      <SkeletonShape height={220} radius="var(--ckm-r-lg)" />
    </SkeletonGroup>
  );
}

export default function ProjectDetailMobile({ user: userProp = undefined, previewData = null }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const auth = useContext(AuthContext);
  const user = userProp ?? auth?.user ?? null;

  const detail = useProjectDetail({
    id: params.id,
    projectHeading: params.projectHeading,
    writerUsername: params.writerUsername,
    user,
    pathname: location.pathname,
    onCanonicalPath: (path) => navigate(path, { replace: true }),
    // The harness supplies a settled project so a five-width sweep measures the same screen twice.
    enabled: !previewData,
  });

  const script = previewData ?? detail.script;
  const status = previewData ? PROJECT_DETAIL_STATUS.READY : detail.status;

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const sectionRefs = useRef({});

  const capabilities = useMemo(() => getViewerCapabilities({ script: script || {}, user: user || {} }), [script, user]);
  const journey = useMemo(() => deriveScriptJourney({ script: script || {}, capabilities }), [script, capabilities]);
  const recommended = useMemo(
    () => getRecommendedAction({ script: script || {}, capabilities, journey }),
    [script, capabilities, journey],
  );

  const reader = useMemo(
    () => describeReaderAccess({ script: script || {}, capabilities, journey }),
    [script, capabilities, journey],
  );
  const projectStatus = useMemo(() => describeProjectStatus(script || {}), [script]);
  const transaction = useMemo(
    () => describeTransactionStanding({ script: script || {}, capabilities }),
    [script, capabilities],
  );
  const contact = useMemo(
    () => describeContactStanding({ script: script || {}, capabilities }),
    [script, capabilities],
  );
  const action = useMemo(
    () => resolveRecommendedAction({ recommended, reader, script: script || {} }),
    [recommended, reader, script],
  );

  const scrollToSection = useCallback((sectionId) => {
    const node = sectionRefs.current[sectionId];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    // Moving the viewport is not moving focus. A section reached by the recommended action has to
    // become the keyboard's position too, or the next Tab returns to the top of the page.
    node.focus?.({ preventScroll: true });
  }, []);

  const onShare = useCallback(async () => {
    const outcome = await shareProject(script);
    if (outcome === "copied") toast.success("Link copied", script?.title);
    if (outcome === "failed") toast.error("Could not share this project", "Copy the link from your browser instead.");
  }, [script, toast]);

  const runAction = useCallback(() => {
    if (action.kind === "reader") setReaderOpen(true);
    else if (action.kind === "trailer") setTrailerOpen(true);
    else if (action.kind === "link") navigate(action.to);
    else scrollToSection(action.section);
  }, [action, navigate, scrollToSection]);

  const header = (
    <PageHeader
      title={script?.title || (status === PROJECT_DETAIL_STATUS.LOADING ? "Loading project" : "Project")}
      eyebrow={script ? describeCredit(script) : ""}
      backTo="/search"
      backLabel="Back"
      actions={script ? (
        <>
          {detail.canBookmark && (
            <IconButton
              icon={detail.isBookmarked ? "bookmark" : "bookmark_add"}
              label={`${detail.isBookmarked ? "Remove" : "Save"} ${script.title || "this project"}`}
              active={detail.isBookmarked}
              disabled={detail.bookmarkPending}
              onClick={detail.toggleBookmark}
            />
          )}
          <IconButton icon="ios_share" label={`Share ${script.title || "this project"}`} onClick={onShare} />
        </>
      ) : null}
    />
  );

  const shell = (children, overlays = null) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.DETAIL}
      screenId="project-detail"
      className="ckm-project"
      scrollClassName="ckm-project__scroll"
      appBar={header}
      onConnectionRestored={detail.reload}
      overlays={overlays}
    >
      {children}
    </MobileShell>
  );

  if (status === PROJECT_DETAIL_STATUS.LOADING) return shell(<ProjectDetailLoading />);

  /*
   * BLOCKED is not an error and does not offer a retry.
   *
   * The viewer's account is the reason, so the two ways forward are the two the desktop page
   * offers — sign up with a business email, or buy the plan — and pressing "try again" on a
   * decision the server will keep making is the trap this state exists to avoid.
   */
  if (status === PROJECT_DETAIL_STATUS.BLOCKED) {
    return shell(
      <EmptyState
        icon="lock"
        titleAs="h2"
        title="This project needs a verified industry account"
        body={detail.failure?.message || "You need a business email or a plan to open this project."}
        actions={(
          <>
            <Button variant="primary" to="/pricing">See industry plans</Button>
            <Button variant="secondary" to="/search">Browse projects</Button>
          </>
        )}
      />,
    );
  }

  if (status === PROJECT_DETAIL_STATUS.ERROR || !script) {
    const notFound = Boolean(detail.failure?.notFound);
    return shell(
      notFound ? (
        <EmptyState
          icon="search_off"
          titleAs="h2"
          title="This project is not here"
          body="The link may be out of date, or the writer may have removed the project."
          actions={<Button variant="secondary" to="/search">Browse projects</Button>}
        />
      ) : (
        <InlineMessage
          variant="panel"
          title="This project could not be loaded"
          onRetry={detail.reload}
        >
          {detail.failure?.message || "Check your connection and try again."}
        </InlineMessage>
      ),
    );
  }

  const cover = resolveMediaUrl(script.trailerThumbnail || script.coverImage || "");
  const storyFacts = buildStoryFacts(script);
  const evidence = buildEvidence(script);
  const dealTerms = buildDealTerms(script);
  const completion = describeCompletionProgress(script);
  const registerSection = (id) => (node) => { sectionRefs.current[id] = node; };

  return shell(
    <>
      <div className="ckm-project__hero">
        {cover
          ? <img className="ckm-project__cover" src={cover} alt="" />
          : <div className="ckm-project__cover ckm-project__cover--empty" aria-hidden="true"><span className="material-symbols-outlined">movie</span></div>}
        <div className="ckm-project__hero-meta">
          <Badge tone={projectStatus.tone}>{projectStatus.label}</Badge>
          <Badge tone="neutral" variant="outline">{formatMoney(script.price)}</Badge>
          {journey.hasTrailer && (
            <Button variant="tertiary" icon="play_circle" onClick={() => setTrailerOpen(true)}>
              Trailer
            </Button>
          )}
        </div>
        <p className="ckm-project__status-detail">{projectStatus.detail}</p>
      </div>

      {/*
        * The recommended action is one control and it is always honest about where it goes: it
        * either opens the reader, opens the trailer, leaves for payment or the editor, or scrolls
        * to the section that explains the situation. It is never a disabled button.
        */}
      <div className="ckm-project__action">
        <Button variant="primary" onClick={runAction} className="ckm-project__action-button">
          {action.label}
        </Button>
        <p className="ckm-project__standing" data-tone={transaction.tone}>
          <b>{transaction.headline}.</b> {transaction.note}
        </p>
      </div>

      {has(script.logline) && <p className="ckm-project__logline">{script.logline}</p>}

      <ProjectSection
        section={PROJECT_SECTIONS[0]}
        ref={registerSection("story")}
      >
        {has(script.synopsis)
          ? <p className="ckm-project__prose">{script.synopsis}</p>
          : <p className="ckm-project__muted">The writer has not added a synopsis yet.</p>}
        {completion && <p className="ckm-project__note">{completion}</p>}
        {storyFacts.length > 0 && (
          <dl className="ckm-project__facts">
            {storyFacts.map((fact) => (
              <div key={fact.key}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {Array.isArray(script.tags) && script.tags.length > 0 && (
          <ul className="ckm-project__tags">
            {script.tags.slice(0, 12).map((tag) => (
              <li key={String(tag)}><Badge size="sm">{String(tag)}</Badge></li>
            ))}
          </ul>
        )}
      </ProjectSection>

      <ProjectSection section={PROJECT_SECTIONS[1]} ref={registerSection("read")}>
        <p className="ckm-project__prose">{reader.note}</p>
        {reader.canOpen ? (
          <Button variant="secondary" icon="auto_stories" onClick={() => setReaderOpen(true)}>
            {reader.label}
          </Button>
        ) : (
          <p className="ckm-project__muted">Nothing to open yet.</p>
        )}
      </ProjectSection>

      <ProjectSection section={PROJECT_SECTIONS[2]} ref={registerSection("evidence")}>
        {evidence.length > 0 ? (
          <ul className="ckm-project__evidence">
            {evidence.map((row) => (
              <li key={row.key}>
                <span className="ckm-project__evidence-value">{row.value}</span>
                <span className="ckm-project__evidence-label">{row.label}</span>
                <span className="ckm-project__evidence-note">{row.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ckm-project__muted">
            This project has not been evaluated or reviewed yet, so there is nothing here to weigh.
          </p>
        )}
      </ProjectSection>

      <ProjectSection section={PROJECT_SECTIONS[3]} ref={registerSection("deal")}>
        <dl className="ckm-project__facts ckm-project__facts--deal">
          {dealTerms.map((term) => (
            <div key={term.key}>
              <dt>{term.label}</dt>
              <dd>{term.value}</dd>
            </div>
          ))}
        </dl>
        {has(script?.legal?.customInvestorTerms) && capabilities.canPurchase && (
          <>
            <h3 className="ckm-project__subhead">The writer&apos;s own conditions</h3>
            <p className="ckm-project__prose">{script.legal.customInvestorTerms}</p>
          </>
        )}
      </ProjectSection>

      <ProjectSection section={PROJECT_SECTIONS[4]} ref={registerSection("contact")}>
        <p className="ckm-project__prose">{contact.headline}.</p>
        <p className="ckm-project__note">{contact.note}</p>
        {contact.available && contact.contact && (
          <dl className="ckm-project__facts">
            {contact.contact.email && (
              <div><dt>Email</dt><dd><a href={`mailto:${contact.contact.email}`}>{contact.contact.email}</a></dd></div>
            )}
            {contact.contact.phone && (
              <div><dt>Phone</dt><dd><a href={`tel:${contact.contact.phone}`}>{contact.contact.phone}</a></dd></div>
            )}
          </dl>
        )}
        <Button
          variant="secondary"
          to={getProfileCanonicalPath(script.creator || {}, { viewerId: user?._id, viewerRole: user?.role })}
        >
          Open writer profile
        </Button>
      </ProjectSection>
    </>,
    <>
      <TrailerDialog
        key={script._id || "no-trailer"}
        open={trailerOpen}
        project={script}
        onClose={() => setTrailerOpen(false)}
      />
      <ProjectReaderDialog
        open={readerOpen}
        script={script}
        reader={reader}
        onClose={() => setReaderOpen(false)}
      />
    </>,
  );
}
