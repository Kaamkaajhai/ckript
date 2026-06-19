import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, LoaderCircle, FileText } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ScreenplayViewer from "./ScreenplayViewer";
import { formatScreenplayLikeText } from "../utils/screenplayText";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const clampPageRange = (startPage, endPage, totalPages) => {
  const safeStart = Math.max(1, Number(startPage || 1));
  const safeEnd = Math.max(safeStart, Number(endPage || safeStart));
  const safeTotal = Math.max(0, Number(totalPages || 0));

  if (!safeTotal) return [];

  const upperBound = Math.min(safeEnd, safeTotal);
  const pages = [];
  for (let pageNumber = safeStart; pageNumber <= upperBound; pageNumber += 1) {
    pages.push(pageNumber);
  }
  return pages;
};

const PdfPage = ({ pdfDocument, pageNumber }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setContainerWidth(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current || !containerWidth) return;

      const page = await pdfDocument.getPage(pageNumber);
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      renderTaskRef.current?.cancel?.();
      renderTaskRef.current = page.render({
        canvasContext: context,
        viewport,
      });

      try {
        await renderTaskRef.current.promise;
        if (!cancelled) {
          setPageHeight(Math.floor(viewport.height));
        }
      } catch (renderError) {
        if (!cancelled && renderError?.name !== "RenderingCancelledException") {
          throw renderError;
        }
      }
    };

    renderPage().catch((error) => {
      console.error(`[ScreenplayPdfViewer] Failed to render page ${pageNumber}:`, error);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel?.();
    };
  }, [containerWidth, pdfDocument, pageNumber]);

  return (
    <div ref={containerRef} className="mx-auto w-full">
      <div
        className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.14)]"
        style={pageHeight ? { minHeight: `${pageHeight}px` } : undefined}
      >
        <canvas ref={canvasRef} className="block w-full h-auto bg-white" />
      </div>
    </div>
  );
};

const FallbackPage = ({ pageNumber, totalPages, text }) => {
  const normalizedText = useMemo(() => formatScreenplayLikeText(text), [text]);

  return (
    <div className="mx-auto w-full max-w-[794px] rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.14)] overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4 sm:px-10 sm:py-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-bold">Page</p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {pageNumber} / {totalPages}
          </p>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">Structured fallback</span>
      </div>
      <div className="px-6 py-8 sm:px-12 sm:py-10">
        <div className="mx-auto max-w-[6.5in]">
          <ScreenplayViewer text={normalizedText} className="text-slate-900" />
        </div>
      </div>
    </div>
  );
};

const NativePdfPage = ({ sourceUrl, pageNumber }) => {
  const pageSrc = sourceUrl ? `${sourceUrl}#page=${pageNumber}&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0` : "";

  return (
    <div className="mx-auto w-full max-w-[794px]">
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.14)]">
        <object
          data={pageSrc}
          type="application/pdf"
          className="block w-full"
          style={{ minHeight: "1120px" }}
        >
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Your browser cannot display PDFs inline. Please use the Download button.
          </div>
        </object>
      </div>
    </div>
  );
};

export default function ScreenplayPdfViewer({
  pdfUrl = "",
  pdfFile = null,
  title = "Script",
  showHeader = true,
  showPager = true,
  startPage = 1,
  endPage = 1,
  fallbackPages = [],
  fallbackText = "",
  onDownload,
  showAllPages = false,
  className = "",
}) {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfError, setPdfError] = useState("");
  const [loading, setLoading] = useState(Boolean(pdfUrl));
  const [nativePdfUrl, setNativePdfUrl] = useState("");
  const [activePageIndex, setActivePageIndex] = useState(0);
  const requestedPages = useMemo(() => {
    const safeStart = Math.max(1, Number(startPage || 1));
    const safeEnd = Math.max(safeStart, Number(endPage || safeStart));
    return { safeStart, safeEnd };
  }, [endPage, startPage]);

  const fallbackPreviewPages = useMemo(() => {
    if (fallbackPages.length) return fallbackPages;
    const text = String(fallbackText || "").trim();
    if (!text) return [];
    return [{ pageNumber: requestedPages.safeStart, text }];
  }, [fallbackPages, fallbackText, requestedPages.safeStart]);

  useEffect(() => {
    let cancelled = false;
    setPdfError("");
    setPdfDocument(null);

    if (!pdfUrl && !pdfFile) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let activeLoadingTask = null;

    const loadPdf = async () => {
      try {
        let data = null;
        if (pdfFile) {
          data = new Uint8Array(await pdfFile.arrayBuffer());
        } else if (pdfUrl) {
          const requestUrl = String(pdfUrl || "");
          const headers = {};
          if (requestUrl.includes("/api/")) {
            try {
              const stored = typeof window !== "undefined" ? window.localStorage.getItem("user") : "";
              const token = stored ? JSON.parse(stored)?.token : "";
              if (token) headers.Authorization = `Bearer ${token}`;
            } catch {
              // Ignore token parsing issues and fall back to unauthenticated fetch.
            }
          }

          const response = await fetch(pdfUrl, {
            credentials: "include",
            headers,
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF preview (${response.status})`);
          }
          data = new Uint8Array(await response.arrayBuffer());
        }

        if (cancelled || !data) return;

        activeLoadingTask = getDocument({ data });
        const doc = await activeLoadingTask.promise;
        if (cancelled) {
          doc.destroy();
          return;
        }
        setPdfDocument(doc);
      } catch (error) {
        if (cancelled) return;
        console.error("[ScreenplayPdfViewer] PDF load failed:", error);
        setPdfError(error?.message || "Failed to load PDF preview");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      activeLoadingTask?.destroy?.();
    };
  }, [pdfFile, pdfUrl]);

  useEffect(() => {
    if (pdfFile) {
      const objectUrl = URL.createObjectURL(pdfFile);
      setNativePdfUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setNativePdfUrl(pdfUrl || "");
    return undefined;
  }, [pdfFile, pdfUrl]);

  const previewPages = useMemo(() => {
    if (pdfDocument && !pdfError) {
      if (showAllPages) {
        return Array.from({ length: pdfDocument.numPages }, (_, index) => index + 1);
      }
      return clampPageRange(requestedPages.safeStart, requestedPages.safeEnd, pdfDocument.numPages);
    }
    if (showAllPages && fallbackPages.length) {
      return fallbackPages.map((page, index) => ({
        pageNumber: Number(page?.pageNumber || index + 1),
        text: String(page?.text || "").trim(),
      }));
    }
    return fallbackPreviewPages.map((page, index) => ({
      pageNumber: Number(page?.pageNumber || requestedPages.safeStart + index),
      text: String(page?.text || "").trim(),
    }));
  }, [fallbackPages, fallbackPreviewPages, pdfDocument, pdfError, requestedPages.safeEnd, requestedPages.safeStart, showAllPages]);

  const usingPdfRenderer = Boolean(pdfDocument && !pdfError);
  const totalPages = usingPdfRenderer ? previewPages.length : Math.max(previewPages.length, 1);
  const usingNativePdfRenderer = !usingPdfRenderer && Boolean(nativePdfUrl);
  const hasPager = showPager && previewPages.length > 1;
  const activePreviewEntry = previewPages[Math.min(activePageIndex, Math.max(previewPages.length - 1, 0))];
  const activePreviewPageNumber = usingPdfRenderer
    ? Number(activePreviewEntry || requestedPages.safeStart)
    : Number(activePreviewEntry?.pageNumber || requestedPages.safeStart);
  const activePreviewText = usingPdfRenderer
    ? ""
    : String(activePreviewEntry?.text || "").trim();
  const visiblePages = hasPager ? [activePreviewEntry].filter(Boolean) : previewPages;

  useEffect(() => {
    setActivePageIndex(0);
  }, [pdfDocument, pdfError, fallbackPages, fallbackText, pdfFile, pdfUrl, showAllPages, startPage, endPage]);

  useEffect(() => {
    if (!hasPager) return undefined;
    const maxIndex = Math.max(previewPages.length - 1, 0);
    if (activePageIndex > maxIndex) {
      setActivePageIndex(maxIndex);
    }
    return undefined;
  }, [activePageIndex, hasPager, previewPages.length]);

  return (
    <div className={className}>
      {showHeader && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {requestedPages.safeStart === requestedPages.safeEnd
              ? `Page ${requestedPages.safeStart}`
              : `Pages ${requestedPages.safeStart} - ${requestedPages.safeEnd}`}{pdfError ? " · fallback view" : ""}
          </p>
        </div>

        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Preview
          </button>
        )}
      </div>}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_18px_48px_rgba(0,0,0,0.10)]">
          <LoaderCircle className="w-5 h-5 mx-auto animate-spin text-slate-500" />
          <p className="text-sm text-slate-500 mt-3">Loading PDF pages...</p>
        </div>
      )}

      {!loading && pdfError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            PDF rendering failed, so the screenplay is shown with a structured fallback.
          </div>
        </div>
      )}

      {visiblePages.length ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              onClick={() => setActivePageIndex((index) => Math.max(0, index - 1))}
              disabled={!hasPager || activePageIndex === 0}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/20 bg-slate-900 px-4 py-2 text-xs font-semibold text-white opacity-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:opacity-100"
            >
              <span className="!text-white">Prev</span>
            </button>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 font-bold">Preview Page</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {activePreviewPageNumber} / {totalPages}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePageIndex((index) => Math.min(Math.max(previewPages.length - 1, 0), index + 1))}
              disabled={!hasPager || activePageIndex >= previewPages.length - 1}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700/20 bg-slate-900 px-4 py-2 text-xs font-semibold text-white opacity-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:opacity-100"
            >
              <span className="!text-white">Next</span>
            </button>
          </div>

          {usingPdfRenderer ? (
            <PdfPage
              pdfDocument={pdfDocument}
              pageNumber={activePreviewPageNumber}
            />
          ) : usingNativePdfRenderer ? (
            <NativePdfPage
              sourceUrl={nativePdfUrl}
              pageNumber={activePreviewPageNumber}
            />
          ) : (
            <FallbackPage
              pageNumber={activePreviewPageNumber}
              totalPages={totalPages}
              text={activePreviewText}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_18px_48px_rgba(0,0,0,0.10)]">
          <p className="text-sm text-slate-500">The writer has not added a viewable excerpt yet.</p>
        </div>
      )}
    </div>
  );
}
