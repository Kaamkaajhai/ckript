import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Download,
  Eye,
  FileText,
  Italic,
  PenLine,
  Redo2,
  Rocket,
  Save,
  Undo2,
} from "lucide-react";
import api from "../services/api";

const EVENT_SLUG = "ckript-global-scriptathon-2026";
const GENRES = ["Thriller", "Drama", "Sci-Fi", "Romance", "Horror", "Fantasy", "Anime", "Comedy", "Action", "Other"];
const WORDS_PER_PAGE = 250;

const stripHtml = (html = "") => String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const countWords = (text = "") => {
  const normalized = String(text || "").trim();
  return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
};

const getDurationParts = (targetMs, nowMs) => {
  const diff = Math.max(0, targetMs - nowMs);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { hours, minutes, seconds };
};

const formatClock = ({ hours, minutes, seconds }) =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

const formatSessionTime = (startedAt) => {
  const diff = Math.max(0, Date.now() - startedAt);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatLastSaved = (value) => {
  if (!value) return "Not saved yet";
  const savedAt = new Date(value).getTime();
  if (Number.isNaN(savedAt)) return "Not saved yet";
  const seconds = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (seconds < 60) return `Saved ${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Saved ${minutes} min ago`;
  return `Saved ${Math.floor(minutes / 60)}h ago`;
};

const toolbarButtonClass = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-2 text-xs font-semibold text-white transition hover:border-[#38bdf8]/60 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40";

const ToolbarButton = ({ children, onClick, disabled, active, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`${toolbarButtonClass} ${active ? "border-[#38bdf8]/70 bg-[#0ea5e9]/20 text-[#7dd3fc]" : ""}`}
  >
    {children}
  </button>
);

const EmptyPanel = ({ children }) => (
  <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4 text-sm text-[#9fb2cc]">{children}</div>
);

const EventEditor = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const sessionStartedAt = useRef(Date.now());
  const saveTimerRef = useRef(null);
  const hydratedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [logline, setLogline] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [initialWordCount, setInitialWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Idle");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [syncPoint, setSyncPoint] = useState({ serverMs: Date.now(), clientMs: Date.now() });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [submitChecks, setSubmitChecks] = useState({
    confirmedOriginal: false,
    acceptedEditLock: false,
    acceptedRules: false,
  });
  const [feedback, setFeedback] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your story here...\n\nINT. DARK ROOM - NIGHT\n\nThe rain taps softly against the glass.\n\nA man sits alone, staring at a photograph.",
      }),
    ],
    editorProps: {
      attributes: {
        class: "event-screenplay-editor min-h-[70vh] focus:outline-none px-6 py-8 sm:px-10 sm:py-10 text-[15px] leading-[1.8] text-[#121826]",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const text = currentEditor.getText({ blockSeparator: "\n" });
      setWordCount(countWords(text));
      setSaveStatus("Unsaved changes");
    },
  });

  useEffect(() => {
    let cancelled = false;

    const loadEditor = async () => {
      if (slug !== EVENT_SLUG) {
        setError("Event not found");
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/events/${slug}/editor`);
        if (cancelled) return;
        const submission = data?.submission || {};
        const serverMs = new Date(data?.serverTime || Date.now()).getTime();
        setPayload(data);
        setSyncPoint({
          serverMs: Number.isNaN(serverMs) ? Date.now() : serverMs,
          clientMs: Date.now(),
        });
        setTitle(submission.title || "");
        setGenre(submission.genre || "");
        setLogline(submission.logline || "");
        setLastSavedAt(submission.updatedAt || "");
        const text = submission.contentText || stripHtml(submission.contentHtml || "");
        const words = countWords(text);
        setWordCount(words);
        setInitialWordCount(words);
        setError("");
        if (editor && !hydratedRef.current) {
          editor.commands.setContent(submission.contentHtml || "");
          hydratedRef.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Unable to load event editor");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEditor();

    return () => {
      cancelled = true;
    };
  }, [slug, editor]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const submissionLocked = payload?.submission?.status === "submitted";

  const buildDraftPayload = useCallback(() => ({
    title,
    genre,
    logline,
    contentHtml: editor?.getHTML() || "",
    contentText: editor?.getText({ blockSeparator: "\n" }) || "",
  }), [editor, genre, logline, title]);

  const saveDraft = useCallback(async ({ quiet = false } = {}) => {
    if (!editor || submissionLocked) return null;
    setSaveStatus("Saving...");
    try {
      const { data } = await api.put(`/events/${EVENT_SLUG}/editor`, buildDraftPayload());
      const submission = data?.submission || null;
      setPayload((current) => ({ ...(current || {}), submission }));
      setLastSavedAt(submission?.updatedAt || new Date().toISOString());
      setSaveStatus("Saved");
      if (!quiet) setFeedback("Draft saved.");
      return submission;
    } catch (err) {
      setSaveStatus("Save failed");
      setFeedback(err?.response?.data?.message || "Failed to save draft.");
      return null;
    }
  }, [buildDraftPayload, editor, submissionLocked]);

  useEffect(() => {
    if (!editor || loading || submissionLocked) return undefined;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveDraft({ quiet: true });
    }, 1200);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [editor, loading, saveDraft, submissionLocked, wordCount]);

  useEffect(() => {
    const handler = (event) => {
      if (saveStatus === "Unsaved changes" || saveStatus === "Saving...") {
        event.preventDefault();
        event.returnValue = "Your progress is auto-saved. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStatus]);

  const syncedNowMs = syncPoint.serverMs + (tick - syncPoint.clientMs);
  const event = payload?.event || {};
  const endMs = new Date(event.endAt || 0).getTime();
  const startMs = new Date(event.startAt || 0).getTime();
  const eventStatus = syncedNowMs < startMs ? "upcoming" : syncedNowMs <= endMs ? "live" : "completed";
  const timeLeft = useMemo(() => getDurationParts(eventStatus === "upcoming" ? startMs : endMs, syncedNowMs), [eventStatus, startMs, endMs, syncedNowMs]);
  const pageCount = Math.ceil(wordCount / WORDS_PER_PAGE);
  const sessionMinutes = Math.max(1, (Date.now() - sessionStartedAt.current) / 60000);
  const writingSpeed = Math.max(0, Math.round((wordCount - initialWordCount) / sessionMinutes));
  const participantCount = event.participantCount ?? 0;
  const plainText = editor?.getText({ blockSeparator: "\n\n" }) || "";
  const hasStarted = wordCount > 0 || Boolean(title || logline);
  const reward = pageCount >= 20
    ? "Strong momentum."
    : pageCount >= 10
      ? "You're building serious pace."
      : pageCount >= 5
        ? "Nice start. Keep writing."
        : "";

  const exportDraft = () => {
    const content = `${title || "Untitled Script"}\n${genre ? `Genre: ${genre}\n` : ""}${logline ? `Logline: ${logline}\n` : ""}\n${plainText}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(title || "event-script").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitFinal = async () => {
    setFeedback("");
    const saved = await saveDraft({ quiet: true });
    if (!saved && !payload?.submission) return;
    try {
      const { data } = await api.post(`/events/${EVENT_SLUG}/submit`, submitChecks);
      setPayload((current) => ({ ...(current || {}), submission: data?.submission || current?.submission }));
      setShowSubmitModal(false);
      setFeedback("Final script submitted.");
    } catch (err) {
      setFeedback(err?.response?.data?.message || "Failed to submit final script.");
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-400">Loading editor...</div>;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-white">Editor unavailable</h1>
        <p className="text-sm text-[#9fb2cc]">{error}</p>
        <Link to={`/events/${EVENT_SLUG}`} className="rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black">
          Go to event page
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-6 min-h-screen bg-[#05070b] pb-24 text-white sm:-mx-6 lg:-mx-8">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 text-sm sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className={eventStatus === "live" ? "font-semibold text-emerald-300" : "font-semibold text-sky-300"}>
            {eventStatus === "live" ? "Event Live" : eventStatus === "upcoming" ? "Event Starts Soon" : "Event Completed"}
          </div>
          <div className="text-center">
            <span className="text-[#7f96b7]">{eventStatus === "upcoming" ? "Starts In" : "Time Remaining"} </span>
            <span className="font-mono text-lg font-semibold text-white">{formatClock(timeLeft)}</span>
          </div>
          <div className="text-left text-[#9fb2cc] sm:text-right">
            Registered writers: <span className="font-semibold text-white">{participantCount}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:px-8">
        <section className="min-w-0 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_12rem]">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={submissionLocked}
                placeholder="Enter your script title"
                className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-lg font-semibold text-white outline-none placeholder:text-[#52657f] focus:border-[#38bdf8]/60 disabled:opacity-60"
              />
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                disabled={submissionLocked}
                className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#38bdf8]/60 disabled:opacity-60"
              >
                <option value="">Genre</option>
                {GENRES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <textarea
              value={logline}
              onChange={(event) => setLogline(event.target.value)}
              disabled={submissionLocked}
              rows={2}
              maxLength={300}
              placeholder="Describe your story in one line..."
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white outline-none placeholder:text-[#52657f] focus:border-[#38bdf8]/60 disabled:opacity-60"
            />
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#f8fafc] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-[#0a1220] px-3 py-2">
              <ToolbarButton title="Bold" active={editor?.isActive("bold")} disabled={!editor || submissionLocked} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton title="Italic" active={editor?.isActive("italic")} disabled={!editor || submissionLocked} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton title="Scene Heading" disabled={!editor || submissionLocked} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Scene</ToolbarButton>
              <ToolbarButton title="Character" disabled={!editor || submissionLocked} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>Character</ToolbarButton>
              <ToolbarButton title="Dialogue" disabled={!editor || submissionLocked} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Dialogue</ToolbarButton>
              <ToolbarButton title="Action" disabled={!editor || submissionLocked} onClick={() => editor.chain().focus().setParagraph().run()}>Action</ToolbarButton>
              <ToolbarButton title="Undo" disabled={!editor || submissionLocked || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
              <ToolbarButton title="Redo" disabled={!editor || submissionLocked || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
            </div>
            {!hasStarted && (
              <div className="border-b border-black/10 bg-[#eef6ff] px-6 py-4 text-sm font-semibold text-[#0f3b5f]">
                Every blockbuster begins with one page. Start writing.
              </div>
            )}
            <div className="[&_.ProseMirror]:min-h-[70vh] [&_.ProseMirror_h2]:mt-8 [&_.ProseMirror_h2]:text-sm [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:uppercase [&_.ProseMirror_h2]:tracking-[0.18em] [&_.ProseMirror_h3]:mt-6 [&_.ProseMirror_h3]:text-center [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:uppercase [&_.ProseMirror_blockquote]:mx-auto [&_.ProseMirror_blockquote]:max-w-xl [&_.ProseMirror_blockquote]:border-0 [&_.ProseMirror_blockquote]:text-center [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:whitespace-pre-line [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-[4.75rem] lg:self-start">
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">Your Progress</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-[#9fb2cc]">Page Count</span><span className="font-semibold">{pageCount} / 100 Pages</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#9fb2cc]">Word Count</span><span className="font-semibold">{wordCount} Words</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#9fb2cc]">Writing Speed</span><span className="font-semibold">{writingSpeed} WPM</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#9fb2cc]">Session Time</span><span className="font-semibold">{formatSessionTime(sessionStartedAt.current)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-[#9fb2cc]">Last Saved</span><span className="font-semibold">{formatLastSaved(lastSavedAt)}</span></div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#0ea5e9]" style={{ width: `${Math.min(100, pageCount)}%` }} />
            </div>
            {reward && <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">{reward}</p>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">Your Rank</h2>
            <EmptyPanel>Ranking is not available until real scoring and leaderboard data are connected.</EmptyPanel>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">AI Story Analysis</h2>
            <EmptyPanel>No AI analysis has been generated for this event draft yet.</EmptyPanel>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">Writing Integrity</h2>
            <p className="mt-3 rounded-2xl border border-white/10 bg-[#070b12] p-3 text-sm text-[#d5e2f4]">
              Registration verified. Draft activity is being saved to your event account.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">What’s Happening</h2>
            <EmptyPanel>No live event feed has been published yet.</EmptyPanel>
          </div>
        </aside>
      </main>

      <div className="fixed bottom-4 right-4 z-40 rounded-full border border-white/10 bg-[#07111f] px-4 py-2 text-xs font-semibold text-white shadow-2xl">
        {saveStatus === "Saved" ? "Saved ✓" : saveStatus}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#07111f]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-[#9fb2cc]">{feedback || (submissionLocked ? "Final submission is locked." : "Your progress is auto-saved.")}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => saveDraft()} disabled={submissionLocked} className={toolbarButtonClass}><Save className="mr-2 h-4 w-4" />Save Draft</button>
            <button type="button" onClick={() => setShowPreview(true)} className={toolbarButtonClass}><Eye className="mr-2 h-4 w-4" />Preview Script</button>
            <button type="button" onClick={exportDraft} className={toolbarButtonClass}><Download className="mr-2 h-4 w-4" />Export Draft</button>
            <button type="button" onClick={() => setShowSubmitModal(true)} disabled={submissionLocked} className="inline-flex h-9 items-center justify-center rounded-lg bg-[#0ea5e9] px-4 text-xs font-semibold text-black transition hover:bg-[#38bdf8] disabled:cursor-not-allowed disabled:opacity-50"><Rocket className="mr-2 h-4 w-4" />Submit Final Script</button>
            <button type="button" onClick={() => navigate(`/events/${EVENT_SLUG}/dashboard`)} className={toolbarButtonClass}>Exit</button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a1220]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold">Preview Script</h2>
              <button type="button" onClick={() => setShowPreview(false)} className="text-sm text-[#9fb2cc]">Close</button>
            </div>
            <div className="max-h-[70vh] overflow-auto whitespace-pre-wrap p-6 text-sm leading-7 text-[#d5e2f4]">
              <p className="mb-4 text-xl font-semibold text-white">{title || "Untitled Script"}</p>
              {plainText || "No script content yet."}
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a1220] p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-[#38bdf8]" />
              <h2 className="text-xl font-semibold">Final Submission</h2>
            </div>
            <p className="mt-3 text-sm text-[#9fb2cc]">Before submitting, confirm these rules. Editing will be locked after final submission.</p>
            <div className="mt-5 space-y-3">
              {[
                ["confirmedOriginal", "This script is original"],
                ["acceptedEditLock", "I understand editing will be locked"],
                ["acceptedRules", "I agree to competition rules"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#070b12] p-4 text-sm text-[#d5e2f4]">
                  <input
                    type="checkbox"
                    checked={submitChecks[key]}
                    onChange={(event) => setSubmitChecks((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setShowSubmitModal(false)} className={toolbarButtonClass}>Continue Writing</button>
              <button type="button" onClick={submitFinal} className="rounded-lg bg-[#0ea5e9] px-5 py-2 text-sm font-semibold text-black hover:bg-[#38bdf8]">Submit My Script</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventEditor;
