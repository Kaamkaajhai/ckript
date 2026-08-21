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
  reload: vi.fn(),
  refresh: vi.fn(),
  openConversation: vi.fn(),
  closeConversation: vi.fn(),
  retryThread: vi.fn(),
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

async function render() {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/messages"]}>
        <div className="ckm"><MessagesMobile user={{ _id: "writer-1", role: "writer", name: "Mira" }} /></div>
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
    expect(mocks.state.send).toHaveBeenCalledWith("Sounds good");
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
