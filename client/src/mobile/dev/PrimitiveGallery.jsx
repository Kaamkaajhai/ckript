import { useEffect, useState } from "react";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import PageHeader from "../components/app-bars/PageHeader";
import Button from "../components/buttons/Button";
import IconButton from "../components/buttons/IconButton";
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

export default function PrimitiveGallery() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 0 : window.innerWidth));
  const [pending, setPending] = useState(false);

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
      </div>
    </MobileShell>
  );
}
