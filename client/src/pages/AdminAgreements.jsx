import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { getApiBaseUrl } from "../utils/apiOrigin";

const API_BASE_URL = getApiBaseUrl();

const adminApi = axios.create({ baseURL: API_BASE_URL });
adminApi.interceptors.request.use((config) => {
  const adminSession = sessionStorage.getItem("admin-session");
  if (adminSession) {
    try {
      const { token } = JSON.parse(adminSession);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // Ignore malformed session payload.
    }
  }
  return config;
});

const STATUS_OPTIONS = ["", "active", "expired", "cancelled", "superseded", "draft"];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function AdminAgreements() {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    writerId: "",
    buyerId: "",
    scriptId: "",
  });

  const [currentTerms, setCurrentTerms] = useState(null);
  const [versions, setVersions] = useState([]);
  const [savingTerms, setSavingTerms] = useState(false);
  const [termsMessage, setTermsMessage] = useState("");
  const [newTerms, setNewTerms] = useState({
    version: "",
    title: "Ckript Marketplace Purchase Terms",
    content: "",
  });

  const fetchAgreementData = async (targetPage = page) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.get("/admin/agreements", {
        params: {
          page: targetPage,
          status: filters.status || undefined,
          writerId: filters.writerId.trim() || undefined,
          buyerId: filters.buyerId.trim() || undefined,
          scriptId: filters.scriptId.trim() || undefined,
        },
      });

      setAgreements(Array.isArray(data?.agreements) ? data.agreements : []);
      setTotalPages(Math.max(Number(data?.totalPages) || 1, 1));
      setPage(Number(data?.page) || targetPage);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load agreements.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async () => {
    try {
      const [currentRes, versionsRes] = await Promise.all([
        adminApi.get("/admin/legal/terms/current"),
        adminApi.get("/admin/legal/terms/versions"),
      ]);

      setCurrentTerms(currentRes?.data || null);
      setVersions(Array.isArray(versionsRes?.data?.versions) ? versionsRes.data.versions : []);
      setNewTerms((prev) => ({
        ...prev,
        content: prev.content || String(currentRes?.data?.content || ""),
      }));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load terms policies.");
    }
  };

  useEffect(() => {
    fetchAgreementData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.writerId, filters.buyerId, filters.scriptId]);

  useEffect(() => {
    fetchTerms();
  }, []);

  const hasAdminSession = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("admin-session");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.token);
    } catch {
      return false;
    }
  }, []);

  const handlePdfAction = async (agreementId, party, action = "open") => {
    try {
      const { data } = await adminApi.get(`/admin/agreements/${agreementId}/pdf`, {
        params: {
          party,
          ...(action === "download" ? { download: 1 } : {}),
        },
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      if (action === "download") {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `agreement-${agreementId}-${party}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }

      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to load ${party} PDF.`);
    }
  };

  const handleCreateTermsVersion = async (event) => {
    event.preventDefault();
    setTermsMessage("");

    if (!newTerms.version.trim() || !newTerms.content.trim()) {
      setTermsMessage("Version and content are required.");
      return;
    }

    try {
      setSavingTerms(true);
      const { data } = await adminApi.post("/admin/legal/terms/versions", {
        version: newTerms.version.trim(),
        title: newTerms.title.trim(),
        content: newTerms.content,
      });

      setTermsMessage(data?.message || "Terms version created.");
      setNewTerms((prev) => ({ ...prev, version: "" }));
      await fetchTerms();
    } catch (err) {
      setTermsMessage(err?.response?.data?.message || "Failed to create terms version.");
    } finally {
      setSavingTerms(false);
    }
  };

  if (!hasAdminSession) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Admin Agreements</h1>
          <p className="mt-2 text-sm text-slate-600">Admin session not found. Log in through the admin portal first.</p>
          <Link to="/admin" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rights Agreements & Legal Terms</h1>
              <p className="mt-1 text-sm text-slate-600">Manage transaction agreements and purchase terms versions.</p>
            </div>
            <Link to="/admin" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Back to Admin Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Agreement Records</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value || "all"} value={value}>{value || "All statuses"}</option>
              ))}
            </select>
            <input
              value={filters.writerId}
              onChange={(e) => setFilters((prev) => ({ ...prev, writerId: e.target.value }))}
              placeholder="Writer ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={filters.buyerId}
              onChange={(e) => setFilters((prev) => ({ ...prev, buyerId: e.target.value }))}
              placeholder="Buyer ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={filters.scriptId}
              onChange={(e) => setFilters((prev) => ({ ...prev, scriptId: e.target.value }))}
              placeholder="Script ID"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Script</th>
                  <th className="py-2 pr-3">Writer</th>
                  <th className="py-2 pr-3">Buyer</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Expires</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">Loading agreements...</td>
                  </tr>
                ) : agreements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">No agreements found for selected filters.</td>
                  </tr>
                ) : (
                  agreements.map((agreement) => (
                    <tr key={agreement._id} className="border-b border-slate-100">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-800">{agreement?.script_id?.title || "-"}</div>
                        <div className="text-xs text-slate-500">SID: {agreement?.script_id?.sid || "-"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-700">{agreement?.writer_id?.name || "-"}</div>
                        <div className="text-xs text-slate-500">{agreement?.writer_id?.sid || "-"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-slate-700">{agreement?.buyer_id?.name || "-"}</div>
                        <div className="text-xs text-slate-500">{agreement?.buyer_id?.sid || "-"}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {agreement?.status || "-"}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{formatDateTime(agreement?.createdAt)}</td>
                      <td className="py-3 pr-3 text-slate-600">{formatDateTime(agreement?.expires_at)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handlePdfAction(agreement._id, "writer", "open")}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Writer PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePdfAction(agreement._id, "buyer", "open")}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Buyer PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePdfAction(agreement._id, "buyer", "download")}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => fetchAgreementData(page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm text-slate-600">Page {page} of {totalPages}</p>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => fetchAgreementData(page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Current Purchase Terms</h2>
            <p className="mt-1 text-sm text-slate-600">Public legal baseline used when agreements are generated.</p>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-700"><span className="font-semibold">Version:</span> {currentTerms?.version || "-"}</div>
              <div className="mt-1 text-sm text-slate-700"><span className="font-semibold">Title:</span> {currentTerms?.title || "-"}</div>
              <div className="mt-1 text-sm text-slate-700"><span className="font-semibold">Effective:</span> {formatDateTime(currentTerms?.effectiveAt)}</div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{currentTerms?.content || "No current terms."}</p>
            </div>

            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-500">Version History</h3>
            <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Effective</th>
                    <th className="px-3 py-2">Current</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version._id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 font-semibold text-slate-700">{version.version}</td>
                      <td className="px-3 py-2 text-slate-600">{version.title}</td>
                      <td className="px-3 py-2 text-slate-600">{formatDateTime(version.effectiveAt)}</td>
                      <td className="px-3 py-2 text-slate-600">{version.isCurrent ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-900">Create New Terms Version</h2>
            <p className="mt-1 text-sm text-slate-600">Publishing a new version marks previous current version as non-current.</p>

            <form onSubmit={handleCreateTermsVersion} className="mt-4 space-y-3">
              <input
                value={newTerms.version}
                onChange={(e) => setNewTerms((prev) => ({ ...prev, version: e.target.value }))}
                placeholder="Version (example: 2026-05-01)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={newTerms.title}
                onChange={(e) => setNewTerms((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                value={newTerms.content}
                onChange={(e) => setNewTerms((prev) => ({ ...prev, content: e.target.value }))}
                rows={14}
                placeholder="Legal terms content"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />

              {termsMessage && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {termsMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={savingTerms}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingTerms ? "Saving..." : "Publish Terms Version"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
