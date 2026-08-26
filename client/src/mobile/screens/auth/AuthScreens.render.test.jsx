// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../context/AuthContext";
import { ToastContext } from "../../components/feedback/toastContext";
import AcceptInviteMobile from "./AcceptInviteMobile";
import ForgotPasswordMobile from "./ForgotPasswordMobile";
import RoleChooserMobile from "./RoleChooserMobile";

/*
 * The three smaller account-entry screens. The behaviour worth pinning on each:
 *
 *   RoleChooser   the roles it offers (and the two it deliberately does not),
 *                 and that it carries a return path and a Google email onward.
 *   ForgotPassword that it drives the already-shared headless flow and reports
 *                 through the MOBILE toast host rather than the desktop one.
 *   AcceptInvite  that a signed-out invitee is SENT to sign in with this URL as
 *                 the return path — the behaviour the desktop page's own
 *                 comment says it wanted and could not have.
 */

const post = vi.fn().mockResolvedValue({ data: { resendCooldownSeconds: 60 } });
vi.mock("../../../services/api", () => ({
  default: { get: vi.fn(), put: vi.fn(), post: (...args) => post(...args) },
}));

const acceptInvite = vi.fn();
vi.mock("../../../components/collab/collaborationRequests", () => ({
  acceptCollabInvite: (...args) => acceptInvite(...args),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const noop = vi.fn();
const toast = { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(), show: noop, dismiss: noop };

let host;
let root;

const mount = async (element, { entry, user = null, loading = false, path } = {}) => {
  const auth = {
    user, loading,
    login: noop, join: noop, googleSignIn: noop, logout: noop,
    setUser: noop, updateSessionUser: noop, adoptSession: vi.fn((data) => data),
  };
  await act(async () => root.render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthContext.Provider value={auth}>
        <ToastContext.Provider value={toast}>
          <Routes>
            <Route path={path} element={element} />
            <Route path="/login" element={<p>login-landed</p>} />
            <Route path="/signup" element={<p>signup-landed</p>} />
            <Route path="/dashboard" element={<p>dashboard-landed</p>} />
            <Route path="/profile" element={<p>settings-landed</p>} />
          </Routes>
        </ToastContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  ));
  return host;
};

const linkWith = (el, text) => [...el.querySelectorAll("a")].find((a) => a.textContent.includes(text));
const buttonWith = (el, text) => [...el.querySelectorAll("button")].find((b) => b.textContent.includes(text));

beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });

describe("RoleChooserMobile", () => {
  const open = (entry = "/join") => mount(<RoleChooserMobile />, { entry, path: "/join" });

  it("offers exactly the three roles a phone can create today", async () => {
    const el = await open();
    expect(el.textContent).toContain("Writer");
    expect(el.textContent).toContain("Producer or Director");
    expect(el.textContent).toContain("Industry professional");
    // Reader and actor are a recorded follow-up, not an oversight.
    expect(el.textContent).not.toContain("Reader");
    expect(el.querySelectorAll(".ckm-auth__role")).toHaveLength(3);
  });

  it("sends each role to the one stepper with its own ?as=", async () => {
    const el = await open();
    const hrefs = [...el.querySelectorAll(".ckm-auth__role")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([
      "/signup?as=writer",
      "/signup?as=producer",
      "/signup?as=industry",
    ]);
  });

  it("carries a return path onto every role and onto sign-in", async () => {
    const el = await open("/join?redirect=%2Fupload");
    const writer = el.querySelector(".ckm-auth__role");
    expect(writer.getAttribute("href")).toContain("redirect=%2Fupload");
    expect(linkWith(el, "Sign in").getAttribute("href")).toContain("redirect=%2Fupload");
  });

  it("explains the Google hand-off rather than showing a bare form", async () => {
    const el = await open("/join?email=mira%40example.com");
    expect(el.textContent).toContain("There's no Ckript account for mira@example.com yet");
    expect(el.querySelector(".ckm-auth__role").getAttribute("href")).toContain("email=mira%40example.com");
  });

  it("sends a signed-in visitor to their workspace instead of a chooser", async () => {
    await mount(<RoleChooserMobile />, { entry: "/join", path: "/join", user: { _id: "u1", role: "creator" } });
    expect(host.textContent).toContain("dashboard-landed");
  });
});

describe("ForgotPasswordMobile", () => {
  const open = (entry = "/forgot-password") => mount(<ForgotPasswordMobile />, { entry, path: "/forgot-password" });

  it("starts on the email step in the public shell", async () => {
    const el = await open();
    expect(el.querySelector('[data-shell-mode="public"]')).not.toBeNull();
    expect(el.querySelector('[data-screen-id="forgot-password"]')).not.toBeNull();
    expect(el.querySelector("h1").textContent).toContain("Reset your password");
  });

  it("answers an unknown email non-committally, through the mobile toast host", async () => {
    // The wording must not confirm whether an account exists, and the message
    // must reach the toast layer inside .ckm — a desktop toast would render
    // outside the phone frame entirely.
    const el = await open();
    const input = el.querySelector("input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    await act(async () => {
      setter.call(input, "mira@example.com");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await act(async () => buttonWith(el, "Send reset code").click());

    expect(post).toHaveBeenCalledWith("/auth/forgot-password", { email: "mira@example.com" });
    expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/if an account exists/i));
    expect(el.querySelectorAll(".ckm-auth__otp-box")).toHaveLength(6);
  });

  it("sends a signed-in visitor to their settings, not a 'who are you' form", async () => {
    await mount(<ForgotPasswordMobile />, {
      entry: "/forgot-password", path: "/forgot-password", user: { _id: "u1", role: "creator" },
    });
    expect(host.textContent).toContain("settings-landed");
  });
});

describe("AcceptInviteMobile", () => {
  const open = (opts = {}) => mount(<AcceptInviteMobile />, {
    entry: "/invite/tok-123", path: "/invite/:token", ...opts,
  });

  it("sends a signed-out invitee to sign in and back to this exact URL", async () => {
    // The defect pages/AcceptInvite.jsx documents and could not fix: /login was
    // <Navigate to="/"> and nothing read a return param, so an invitee landed
    // on the homepage and the invite was lost.
    const el = await open();
    const signIn = [...el.querySelectorAll("a")].find((a) => a.textContent.includes("Sign in to accept"));
    expect(signIn.getAttribute("href")).toBe("/login?redirect=%2Finvite%2Ftok-123");

    const create = [...el.querySelectorAll("a")].find((a) => a.textContent.includes("Create an account"));
    expect(create.getAttribute("href")).toBe("/join?redirect=%2Finvite%2Ftok-123");
  });

  it("does not accept on mount — it asks first", async () => {
    // Accepting adds someone to another person's screenplay; doing it because a
    // link was opened is the wrong default.
    const el = await open({ user: { _id: "u1", role: "creator" } });
    expect(acceptInvite).not.toHaveBeenCalled();
    expect(el.textContent).toContain("Accepting adds you to this screenplay");
    expect(buttonWith(el, "Accept invitation")).toBeDefined();
  });

  it("accepts on request and offers the project it unlocked", async () => {
    acceptInvite.mockResolvedValue({ message: "Invitation accepted", script: { id: "s1", title: "Nightfall" } });
    const el = await open({ user: { _id: "u1", role: "creator" } });
    await act(async () => buttonWith(el, "Accept invitation").click());

    expect(acceptInvite).toHaveBeenCalledWith("tok-123", expect.anything());
    expect(el.querySelector("h1").textContent).toContain("You're in.");
    expect(el.textContent).toContain("Nightfall");
  });

  it("lets a failed acceptance be retried, because most failures here are not final", async () => {
    acceptInvite.mockRejectedValue({ response: { status: 500, data: { message: "Could not accept" } } });
    const el = await open({ user: { _id: "u1", role: "creator" } });
    await act(async () => buttonWith(el, "Accept invitation").click());

    expect(el.textContent).toContain("Could not accept");
    expect(buttonWith(el, "Try again")).toBeDefined();
  });

  it("explains an incomplete link rather than failing silently", async () => {
    const el = await mount(<AcceptInviteMobile />, {
      entry: "/invite/", path: "/invite/:token?", user: { _id: "u1", role: "creator" },
    });
    expect(el.textContent).toContain("invitation link is incomplete");
  });
});
