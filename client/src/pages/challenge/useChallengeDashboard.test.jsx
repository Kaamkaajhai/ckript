// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useChallengeDashboard from "./useChallengeDashboard";

const mocks = vi.hoisted(() => ({ main: vi.fn(), participants: vi.fn(), referrals: vi.fn(), editor: vi.fn(), follow: vi.fn(), certificate: vi.fn() }));
vi.mock("./challengeDashboard", async (importOriginal) => ({
  ...(await importOriginal()),
  loadChallengeDashboard: mocks.main,
  loadChallengeParticipants: mocks.participants,
  loadChallengeReferrals: mocks.referrals,
  openChallengeEditor: mocks.editor,
  updateChallengeParticipantFollow: mocks.follow,
  downloadDashboardCertificate: mocks.certificate,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };

function Probe({ slug = "48-hours", community = false }) {
  const dashboard = useChallengeDashboard({ slug, user: { _id: "u1" }, communityEnabled: community, poll: false });
  return <div data-status={dashboard.status} data-participants={dashboard.participants.status}><button type="button" onClick={dashboard.refresh}>Refresh</button>{dashboard.data?.competition?.name || ""}:{dashboard.participants.items.map((item) => item.name).join(",")}</div>;
}

let host;
let root;
beforeEach(() => {
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  mocks.main.mockResolvedValue({ ok: true, standing: "ready", data: { competition: { _id: "c1", name: "Ready challenge" }, entry: { eventId: "E1" } } });
  mocks.participants.mockResolvedValue({ ok: true, data: { items: [{ _id: "u2", name: "Rhea" }], page: 1, limit: 12, total: 1, hasMore: false } });
  mocks.referrals.mockResolvedValue({ ok: true, data: { items: [], page: 1, limit: 12, total: 0, hasMore: false, progress: { count: 0 }, referralCode: "CKR1" } });
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });

describe("useChallengeDashboard", () => {
  it("retains a ready dashboard during background phase refresh", async () => {
    const refresh = deferred();
    mocks.main.mockResolvedValueOnce({ ok: true, standing: "ready", data: { competition: { _id: "c1", name: "Ready challenge" }, entry: {} } }).mockReturnValueOnce(refresh.promise);
    await act(async () => root.render(<Probe />));
    await act(async () => host.querySelector("button").click());
    expect(host.firstElementChild.dataset.status).toBe("ready");
    expect(host.textContent).toContain("Ready challenge");
    await act(async () => refresh.resolve({ ok: true, standing: "ready", data: { competition: { _id: "c1", name: "Updated challenge" }, entry: {} } }));
    expect(host.textContent).toContain("Updated challenge");
  });

  it("aborts an obsolete slug request and never renders its result", async () => {
    const old = deferred(); const current = deferred();
    mocks.main.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await act(async () => root.render(<Probe slug="old" />));
    const oldSignal = mocks.main.mock.calls[0][0].signal;
    await act(async () => root.render(<Probe slug="current" />));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => current.resolve({ ok: true, standing: "ready", data: { competition: { _id: "c2", name: "Current" }, entry: {} } }));
    await act(async () => old.resolve({ ok: true, standing: "ready", data: { competition: { _id: "c1", name: "Obsolete" }, entry: {} } }));
    expect(host.textContent).toContain("Current");
    expect(host.textContent).not.toContain("Obsolete");
  });

  it("defers bounded community reads until the community tab is active", async () => {
    await act(async () => root.render(<Probe community={false} />));
    expect(mocks.participants).not.toHaveBeenCalled();
    await act(async () => root.render(<Probe community />));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    expect(mocks.participants).toHaveBeenCalledWith(expect.objectContaining({ competitionId: "c1", page: 1 }));
    expect(host.textContent).toContain("Rhea");
  });
});
