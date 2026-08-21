// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import publicApi from "../../services/publicApi";
import { PUBLIC_PROFILE_STATUS, usePublicProfile } from "./usePublicProfile";

vi.mock("../../services/publicApi", () => ({
  default: { get: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

function Probe({ id }) {
  const result = usePublicProfile({ id });
  return (
    <div data-status={result.status}>
      <span>{result.profile?.name || ""}</span>
      <button type="button" onClick={result.retry}>Retry</button>
    </div>
  );
}

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.clearAllMocks();
});

describe("usePublicProfile", () => {
  it("does not expose the previous profile while a changed route id loads", async () => {
    const first = deferred();
    const second = deferred();
    publicApi.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root.render(<Probe id="mira" />));
    expect(container.firstElementChild.dataset.status).toBe(PUBLIC_PROFILE_STATUS.LOADING);

    await act(async () => first.resolve({ data: { user: { name: "Mira" }, scripts: [] } }));
    expect(container.textContent).toContain("Mira");

    await act(async () => root.render(<Probe id="dev" />));
    expect(container.firstElementChild.dataset.status).toBe(PUBLIC_PROFILE_STATUS.LOADING);
    expect(container.textContent).not.toContain("Mira");

    await act(async () => second.resolve({ data: { user: { name: "Dev" }, scripts: [] } }));
    expect(container.firstElementChild.dataset.status).toBe(PUBLIC_PROFILE_STATUS.READY);
    expect(container.textContent).toContain("Dev");
    expect(publicApi.get).toHaveBeenNthCalledWith(
      2,
      "/users/public/dev",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it.each([
    [400, PUBLIC_PROFILE_STATUS.NOT_FOUND],
    [403, PUBLIC_PROFILE_STATUS.PRIVATE],
    [503, PUBLIC_PROFILE_STATUS.FAILED],
  ])("maps a %s response to %s", async (statusCode, expectedStatus) => {
    publicApi.get.mockRejectedValueOnce({ response: { status: statusCode } });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => root.render(<Probe id="missing" />));

    expect(container.firstElementChild.dataset.status).toBe(expectedStatus);
  });
});
