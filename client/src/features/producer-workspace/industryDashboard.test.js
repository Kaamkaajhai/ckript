import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  loadIndustryDashboard,
  normalizeIndustryDashboardPayload,
  readIndustryDashboardQuery,
  writeIndustryDashboardQuery,
} from "./industryDashboard";

vi.mock("../../services/api", () => ({ default: { get: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("industry dashboard contract", () => {
  it("owns compact section navigation in the URL", () => {
    expect(readIndustryDashboardQuery("?section=finance")).toEqual({ section: "finance" });
    expect(readIndustryDashboardQuery("?section=writers")).toEqual({ section: "overview" });
    expect(writeIndustryDashboardQuery("?keep=1", { section: "matches" }).toString()).toBe("keep=1&section=matches");
  });

  it("normalizes legacy arrays and transaction envelopes", () => {
    expect(normalizeIndustryDashboardPayload({ transactions: { transactions: [{ _id: "t1" }] }, requests: null }))
      .toMatchObject({ transactions: [{ _id: "t1" }], purchaseRequests: [], watchlist: [] });
  });

  it("loads five bounded legs and preserves partial success", async () => {
    api.get.mockImplementation((path, options) => {
      if (path === "/dashboard/investor") return Promise.reject({ response: { data: { message: "dash down" } } });
      if (path === "/transactions") expect(options.params).toEqual({ limit: 6 });
      if (path === "/scripts/purchase-requests/mine") expect(options.params).toEqual({ limit: 12 });
      if (path === "/users/watchlist") expect(options.params).toEqual({ limit: 8 });
      return Promise.resolve({ data: path === "/transactions" ? { transactions: [{ _id: "t1" }] } : [] });
    });
    const result = await loadIndustryDashboard();
    expect(result).toMatchObject({ ok: true, data: { failures: { dash: "dash down" }, transactions: [{ _id: "t1" }] } });
    expect(api.get).toHaveBeenCalledTimes(5);
  });

  it("keeps discovery-only roles away from finance, deal, and watchlist endpoints", async () => {
    api.get.mockResolvedValue({ data: { matchedScripts: [] } });

    await expect(loadIndustryDashboard({ professional: false })).resolves.toMatchObject({
      ok: true,
      data: { dash: { matchedScripts: [] }, transactions: [], purchaseRequests: [], watchlist: [] },
    });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith("/dashboard/investor", { signal: undefined });
  });

  it("fails only when every dashboard leg fails", async () => {
    api.get.mockRejectedValue(new Error("offline"));
    await expect(loadIndustryDashboard()).resolves.toMatchObject({ ok: false, failures: expect.any(Object) });
  });

  it("names wallet and transaction failures independently so finance never invents a zero or empty ledger", async () => {
    api.get.mockImplementation((path) => {
      if (path.includes("/transactions")) return Promise.reject({ response: { data: { message: `${path} down` } } });
      return Promise.resolve({ data: [] });
    });
    await expect(loadIndustryDashboard()).resolves.toMatchObject({
      ok: true,
      data: {
        failures: {
          wallet: "/transactions/wallet/balance down",
          transactions: "/transactions down",
        },
      },
    });
  });
});
