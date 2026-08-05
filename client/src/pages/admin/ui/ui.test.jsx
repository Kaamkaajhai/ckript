// @vitest-environment happy-dom
//
// Smoke-mounts every primitive in the admin UI kit through the barrel, exactly as a screen will
// import it. Nothing in the app imports the kit yet, so WITHOUT this file the build would not even
// compile these modules — lint passing is not proof they render. Beyond mounting, it pins the
// contracts the kit exists for: the a11y wiring in Field, the width-stable loading button, the
// focus behaviour of dialogs, and the error-vs-status split in toasts.
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const {
  Button, Field, Input, Select, SearchInput, Badge, StatusPill,
  Dialog, ConfirmDialog, Drawer, ToastProvider, useToast,
  Card, EmptyState, ErrorState, Skeleton, SkeletonTable, Spinner,
} = await import("./index.js");

let root;
let host;

const mount = (node) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(node));
};

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
});

describe("buttons", () => {
  it("renders each variant as a real button with type=button", () => {
    mount(
      <div>
        {["primary", "secondary", "ghost", "danger", "success"].map((v) => (
          <Button key={v} variant={v}>{v}</Button>
        ))}
      </div>,
    );
    const buttons = host.querySelectorAll("button");
    expect(buttons.length).toBe(5);
    // An unqualified <button> inside a form submits it — the kit must default to type="button".
    buttons.forEach((b) => expect(b.type).toBe("button"));
  });

  it("loading disables, announces busy, and keeps the label mounted", () => {
    mount(<Button loading>Save changes</Button>);
    const b = host.querySelector("button");
    expect(b.disabled).toBe(true);
    expect(b.getAttribute("aria-busy")).toBe("true");
    // The label must stay in the DOM so the button cannot change width mid-request.
    expect(b.textContent).toContain("Save changes");
  });

  it("iconOnly keeps an accessible name", () => {
    mount(<Button iconOnly icon={<span>✕</span>}>Close panel</Button>);
    expect(host.querySelector(".ckad-sr-only").textContent).toBe("Close panel");
  });
});

describe("fields", () => {
  it("wires label, error and description ids to the control", () => {
    mount(
      <Field label="Email" required error="Email is required">
        {(props) => <Input {...props} />}
      </Field>,
    );
    const input = host.querySelector("input");
    const label = host.querySelector("label");
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const errorEl = document.getElementById(input.getAttribute("aria-describedby"));
    expect(errorEl.textContent).toBe("Email is required");
    expect(errorEl.getAttribute("role")).toBe("alert");
  });

  it("renders select and search as native controls", () => {
    mount(
      <div>
        <Field label="Status">{(p) => <Select {...p}><option>All</option></Select>}</Field>
        <SearchInput placeholder="Search users" />
      </div>,
    );
    expect(host.querySelector("select")).toBeTruthy();
    expect(host.querySelector("input[type=search]")).toBeTruthy();
  });
});

describe("status pills", () => {
  it("maps domain statuses to tones and survives unknown ones", () => {
    mount(
      <div>
        <StatusPill status="approved" />
        <StatusPill status="pending" />
        <StatusPill status="rejected" />
        <StatusPill status="brand_new_backend_state" />
        <Badge tone="gold">Winner</Badge>
      </div>,
    );
    expect(host.querySelector(".adg--success")).toBeTruthy();
    expect(host.querySelector(".adg--warn")).toBeTruthy();
    expect(host.querySelector(".adg--danger")).toBeTruthy();
    // A status the backend grew yesterday must render neutral, never crash.
    expect(host.querySelector(".adg--neutral")).toBeTruthy();
    expect(host.textContent).toContain("brand new backend state");
  });
});

describe("overlays", () => {
  it("dialog renders on body with aria-modal and a labelled title", () => {
    mount(<Dialog open onClose={() => {}} title="Edit user">Body</Dialog>);
    const dialog = document.body.querySelector("[role=dialog]");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent).toBe("Edit user");
  });

  it("dialog closes on Escape", () => {
    const onClose = vi.fn();
    mount(<Dialog open onClose={onClose} title="T">Body</Dialog>);
    act(() => {
      document.body.querySelector(".ado").dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("destructive confirm focuses Cancel, so Enter cannot destroy", () => {
    mount(
      <ConfirmDialog open danger onClose={() => {}} onConfirm={() => {}} title="Delete user" confirmLabel="Delete" />,
    );
    expect(document.activeElement.textContent).toBe("Cancel");
  });

  it("drawer mounts as a labelled dialog and unmounts cleanly", () => {
    mount(<Drawer open onClose={() => {}} title="Details">Content</Drawer>);
    expect(document.body.querySelector(".ado--drawer [role=dialog]")).toBeTruthy();
    act(() => root.unmount());
    expect(document.body.querySelector(".ado--drawer")).toBeNull();
  });
});

describe("toasts", () => {
  function Pusher() {
    const toast = useToast();
    return (
      <div>
        <button type="button" onClick={() => toast.success("Saved")}>ok</button>
        <button type="button" onClick={() => toast.error("Broke", { description: "Server said no" })}>bad</button>
      </div>
    );
  }

  it("success announces politely, error interrupts", () => {
    vi.useFakeTimers();
    mount(<ToastProvider><Pusher /></ToastProvider>);
    const [ok, bad] = host.querySelectorAll("button");
    act(() => { ok.click(); bad.click(); });

    const status = document.body.querySelector("[role=status]");
    const alert = document.body.querySelector("[role=alert]");
    expect(status.textContent).toContain("Saved");
    expect(alert.textContent).toContain("Broke");
    expect(alert.textContent).toContain("Server said no");

    // Success auto-dismisses; the error outlives it.
    act(() => { vi.advanceTimersByTime(4000); });
    expect(document.body.textContent).not.toContain("Saved");
    expect(document.body.textContent).toContain("Broke");
    vi.useRealTimers();
  });

  it("useToast outside the provider fails loudly, not silently", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      mount(<Pusher />);
    }).toThrow(/inside <ToastProvider>/);
    spy.mockRestore();
  });
});

describe("feedback", () => {
  it("mounts card, empty, error, skeletons and spinner", () => {
    const onRetry = vi.fn();
    mount(
      <div>
        <Card title="Revenue" description="This month" actions={<Button size="sm">Export</Button>}>x</Card>
        <EmptyState title="No competitions yet" body="Create one to see it here." actionLabel="Create" onAction={() => {}} />
        <ErrorState title="Failed to load" onRetry={onRetry} />
        <Skeleton width={120} />
        <SkeletonTable rows={2} columns={3} />
        <Spinner />
      </div>,
    );
    expect(host.querySelector(".adc-title").textContent).toBe("Revenue");
    expect(host.querySelector(".ade-title").textContent).toBe("No competitions yet");
    // The error surface must interrupt and offer the retry.
    expect(host.querySelector(".ade--error").getAttribute("role")).toBe("alert");
    host.querySelectorAll("button")[2].click();
    expect(onRetry).toHaveBeenCalled();
    expect(host.querySelectorAll(".ads-row").length).toBe(2);
    expect(host.querySelector(".adsp").getAttribute("role")).toBe("status");
  });
});
