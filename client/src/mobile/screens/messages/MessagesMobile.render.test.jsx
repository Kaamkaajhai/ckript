// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MessagesMobile from "./MessagesMobile";
import { MESSAGE_LOAD_STATUS } from "./useMessagesMobile";

const mocks = vi.hoisted(() => ({ state: null }));

vi.mock("./useMessagesMobile", async (importOriginal) => ({
  ...(await importOriginal()),
  default: () => mocks.state,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const ready = (overrides = {}) => ({
  status: MESSAGE_LOAD_STATUS.READY,
  threadStatus: MESSAGE_LOAD_STATUS.READY,
  conversations: [],
  activeChat: null,
  messages: [],
  error: "",
  sendError: "",
  sending: false,
  attachmentUpload: null,
  actionError: "",
  reactionPending: "",
  deletionPending: "",
  reload: vi.fn(),
  refresh: vi.fn(),
  openConversation: vi.fn(),
  closeConversation: vi.fn(),
  retryThread: vi.fn(),
  chooseAttachment: vi.fn(),
  retryAttachment: vi.fn(),
  removeAttachment: vi.fn(),
  reactToMessage: vi.fn().mockResolvedValue({ ok: true }),
  removeMessage: vi.fn().mockResolvedValue({ ok: true }),
  send: vi.fn().mockResolvedValue({ ok: true }),
  ...overrides,
});

beforeEach(() => {
  mocks.state = ready({
    conversations: [{
      chatId: "investor-1_writer-1",
      user: { _id: "investor-1", name: "Dev Shah", role: "investor" },
      lastMessage: "I read the new pages",
      timestamp: "2026-08-21T10:00:00Z",
      unreadCount: 3,
    }],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
});

async function render(user = { _id: "writer-1", role: "writer", name: "Mira"}) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/messages"]}>
        <div className="ckm"><MessagesMobile user={user} /></div>
      </MemoryRouter>,
    );
    await Promise.resolve();
  });
}

describe("native messages", () => {
  it("renders an unread inbox row and opens it through the URL-backed state", async () => {
    await render();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Dev Shah");
    expect(container.textContent).toContain("I read the new pages");
    expect(container.querySelector('[aria-label="3 unread messages"]')).toBeTruthy();
    const row = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Dev Shah"));
    act(() => row.click());
    expect(mocks.state.openConversation).toHaveBeenCalledWith(mocks.state.conversations[0]);
  });

  it("renders the thread, attachments, and sends trimmed text", async () => {
    mocks.state = ready({
      activeChat: { chatId: "investor-1_writer-1", user: { _id: "investor-1", name: "Dev Shah", role: "investor" } },
      messages: [
        { _id: "m1", sender: "investor-1", receiver: "writer-1", text: "Hello", createdAt: "2026-08-21T10:00:00Z" },
        { _id: "m2", sender: "writer-1", receiver: "investor-1", fileUrl: "/draft.pdf", fileName: "Draft.pdf", fileType: "document", createdAt: "2026-08-21T10:01:00Z", read: true },
      ],
    });
    await render();
    expect(container.querySelector('a[href="/profile/investor-1"]')).toBeTruthy();
    expect(container.querySelector('a[href$="/draft.pdf"]')?.textContent).toContain("Draft.pdf");
    const textarea = container.querySelector("textarea");
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")
        .set.call(textarea, "  Sounds good  ");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const form = container.querySelector("form");
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(mocks.state.send).toHaveBeenCalledWith({ text: "Sounds good" });
  });

  it("offers touch reactions and confirms deletion of an own message", async () => {
    mocks.state = ready({
      activeChat: { chatId: "investor-1_writer-1", user: { _id: "investor-1", name: "Dev Shah" } },
      messages: [{
        _id: "m1",
        sender: "writer-1",
        receiver: "investor-1",
        text: "New draft",
        reactions: [{ emoji: "👍", userId: "writer-1" }],
        createdAt: "2026-08-21T10:00:00Z",
      }],
    });
    await render();
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toContain("1");
    const quickReaction = container.querySelector('[aria-label="React with ❤️"]');
    act(() => quickReaction.click());
    expect(mocks.state.reactToMessage).toHaveBeenCalledWith("m1", "❤️");

    const deleteButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Delete");
    act(() => deleteButton.click());
    expect(document.body.textContent).toContain("This removes the message for both people");
    const confirm = [...document.body.querySelectorAll("button")].find((button) => button.textContent === "Delete message");
    await act(async () => {
      confirm.click();
      await Promise.resolve();
    });
    expect(mocks.state.removeMessage).toHaveBeenCalledWith("m1");
  });

  it("shows attachment progress and a retry path", async () => {
    const file = new File(["draft"], "draft.txt", { type: "text/plain" });
    mocks.state = ready({
      activeChat: { chatId: "investor-1_writer-1", user: { _id: "investor-1", name: "Dev Shah" } },
      attachmentUpload: { file, status: "failed", progress: 0, error: "Network interrupted" },
    });
    await render();
    expect(container.textContent).toContain("draft.txt");
    expect(container.textContent).toContain("Network interrupted");
    const retry = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Retry upload"));
    act(() => retry.click());
    expect(mocks.state.retryAttachment).toHaveBeenCalledTimes(1);
  });

  it("opens shared project context and offers an authorized meeting request", async () => {
    mocks.state = ready({
      activeChat: { chatId: "producer-1_writer-1", user: { _id: "writer-1", name: "Mira", role: "creator" } },
      messages: [{
        _id: "m1",
        sender: "producer-1",
        receiver: "writer-1",
        text: "Let's discuss this.",
        script: { _id: "script-1", title: "The Long Road" },
        createdAt: "2026-08-21T10:00:00Z",
      }],
    });
    await render({
      _id: "producer-1",
      role: "producer",
      name: "Dev",
      googleCalendar: { connected: true },
      subscription: { accessTier: "film_industry_professional", accessStatus: "active" },
    });

    const details = container.querySelector('[aria-label="Conversation details"]');
    await act(async () => {
      details.click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("The Long Road");
    expect(document.body.textContent).toContain("No trailer has been shared yet");

    const meeting = [...document.body.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Request a meeting"));
    await act(async () => {
      meeting.click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("With Mira about The Long Road");
    expect(document.body.querySelector('input[value="Ckript meeting: The Long Road"]')).toBeTruthy();
  });

  it("renders durable empty and failed inbox states", async () => {
    mocks.state = ready();
    await render();
    expect(container.textContent).toContain("No conversations yet");

    mocks.state = ready({ status: MESSAGE_LOAD_STATUS.FAILED, error: "Offline" });
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/messages"]}>
          <div className="ckm"><MessagesMobile user={{ _id: "writer-1", role: "writer" }} /></div>
        </MemoryRouter>,
      );
    });
    expect(container.textContent).toContain("Could not load messages");
    expect(container.textContent).toContain("Offline");
  });
});
