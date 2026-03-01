import { useState, useContext, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

// Format options
const formats = [
  { value: "feature", label: "Feature" },
  { value: "tv_1hour", label: "TV 1hr" },
  { value: "tv_halfhour", label: "TV 1/2hr" },
  { value: "short", label: "Short" },
];

// Genre options
const genres = [
  "Action", "Comedy", "Drama", "Horror", "Thriller",
  "Romance", "Sci-Fi", "Fantasy", "Mystery", "Adventure",
  "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political",
  "Legal", "Medical", "Supernatural", "Psychological", "Noir",
  "Family", "Teen", "Satire", "Dark Comedy", "Mockumentary"
];

// Classification options
const toneOptions = [
  "Dark", "Quirky", "Fast-Paced", "Slow-Burn", "Feel-Good",
  "Gritty", "Lighthearted", "Noir", "Uplifting", "Tragic",
  "Suspenseful", "Whimsical", "Intense", "Edgy", "Heartwarming",
  "Cynical", "Hopeful", "Melancholic", "Surreal", "Cerebral",
  "Raw", "Poetic", "Epic", "Isolation", "Atmospheric"
];

const themeOptions = [
  "Revenge", "Coming of Age", "Artificial Intelligence", "Survival",
  "Redemption", "Love Triangle", "Betrayal", "Family Drama",
  "Social Justice", "Identity Crisis", "Power Struggle", "Forbidden Love",
  "Loss & Grief", "Ambition", "Good vs Evil", "Man vs Nature",
  "Isolation", "Corruption", "Second Chance", "Underdog Story",
  "Fish Out of Water", "Chosen One", "Quest", "Transformation",
  "Sacrifice", "Justice", "Freedom", "Grief", "Hope"
];

const settingOptions = [
  "New York", "Space", "High School", "Dystopia", "Isolated",
  "Los Angeles", "Urban", "Rural", "Suburban", "Historical",
  "Contemporary", "Post-Apocalyptic", "Small Town", "Big City",
  "Wilderness", "Ocean/Sea", "Desert", "Jungle", "Medieval",
  "Future", "Alternate Reality", "Virtual Reality", "Underground",
  "Prison", "Hospital", "School/College", "Military Base"
];

// Service pricing (in credits)
const SERVICE_PRICES = {
  hosting: 0, // Free
  evaluation: 10, // 10 credits for AI evaluation
  aiTrailer: 15, // 15 credits for AI trailer
};

// Legal agreement text (placeholder - replace with actual legal text)
const LEGAL_AGREEMENT = `
SUBMISSION RELEASE AGREEMENT

By submitting your script ("Work") to Ckript ("Platform"), you agree to the following terms:

1. REPRESENTATIONS AND WARRANTIES
You represent and warrant that:
- You are the sole owner of the Work or have full authority to submit it
- The Work is original and does not infringe upon any third-party rights
- You have the right to grant the licenses set forth herein

2. LICENSE GRANT
You grant Ckript a non-exclusive, worldwide, royalty-free license to:
- Display, distribute, and promote your Work on the Platform
- Use your Work for marketing and promotional purposes
- Allow industry professionals to view and evaluate your Work

3. PAYMENT TERMS
- Hosting fees are charged monthly and are non-refundable
- One-time service fees (evaluation, AI trailer) are non-refundable once processing begins
- All payments are processed securely through Stripe

4. INTELLECTUAL PROPERTY
You retain all ownership rights to your Work. Ckript does not claim ownership of your script.

5. LIMITATION OF LIABILITY
Ckript shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.

6. TERMINATION
You may remove your Work from the Platform at any time. Ckript reserves the right to remove content that violates our terms of service.

By clicking "I Agree" and proceeding with payment, you acknowledge that you have read, understood, and agree to be bound by these terms.

Last Updated: ${new Date().toLocaleDateString()}
`.trim();

const ScriptUpload = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const editId = searchParams.get("edit");
  const [step, setStep] = useState(1);
  const [fromDraft, setFromDraft] = useState(false);
  const [scriptId, setScriptId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [agreementScrolled, setAgreementScrolled] = useState(true);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const agreementRef = useRef(null);
  const fileInputRef = useRef(null);

  // Form data
  const [formData, setFormData] = useState({
    title: "",
    format: "feature",
    pageCount: "",
    primaryGenre: "",
    logline: "",
    description: "",
  });

  // Classification data
  const [classification, setClassification] = useState({
    tones: [],
    themes: [],
    settings: [],
  });

  // Services data
  const [services, setServices] = useState({
    hosting: true,
    evaluation: false,
    aiTrailer: false,
  });

  // Legal data
  const [legal, setLegal] = useState({
    agreedToTerms: false,
  });

  // Tags as comma-separated input
  const [tagsInput, setTagsInput] = useState("");

  // Fetch credits balance on mount
  useEffect(() => {
    const fetchCreditsBalance = async () => {
      try {
        const { data } = await api.get("/credits/balance");
        setCreditsBalance(data.balance || 0);
      } catch {
        setCreditsBalance(0);
      }
    };
    if (user) {
      fetchCreditsBalance();
    }
  }, [user]);

  // Load existing published script when entering edit mode
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/scripts/${editId}`);
        setTextContent(data.textContent || "");
        setFormData({
          title: data.title || "",
          logline: data.logline || "",
          format: data.format || "feature",
          pageCount: data.pageCount ? String(data.pageCount) : "",
          primaryGenre: data.classification?.primaryGenre || data.primaryGenre || data.genre || "",
          description: data.description || data.logline || "",
        });
        setTagsInput((data.tags || []).join(", "));
        setClassification({
          tones: data.classification?.tones || [],
          themes: data.classification?.themes || [],
          settings: data.classification?.settings || [],
        });
        setServices({
          hosting: data.services?.hosting ?? true,
          evaluation: data.services?.evaluation ?? false,
          aiTrailer: data.services?.aiTrailer ?? false,
        });
        setLegal({ agreedToTerms: true });
      } catch {
        // proceed normally
      }
    };
    load();
  }, [editId]);

  // Load draft when coming from Create Project editor
  useEffect(() => {
    if (!draftId) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/scripts/${draftId}`);
        setScriptId(data._id);
        setTextContent(data.textContent || "");
        setFormData((prev) => ({
          ...prev,
          title: data.title || "",
          logline: data.logline || "",
          format: data.format || "feature",
          pageCount: data.pageCount ? String(data.pageCount) : "",
          primaryGenre: data.classification?.primaryGenre || data.primaryGenre || "",
          description: data.description || data.logline || "",
        }));
        setFromDraft(true);
      } catch {
        // Draft not found, proceed normally
      }
    };
    load();
  }, [draftId]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Validate page count against format
    if (name === "pageCount" || name === "format") {
      validatePageCount();
    }
  };

  // Validate page count based on format
  const validatePageCount = () => {
    const pageCount = Number(formData.pageCount);
    const format = formData.format;

    if (format === "feature" && pageCount > 0 && pageCount < 70) {
      setError("Feature films typically require at least 70 pages. Please adjust your page count or format.");
      return false;
    }
    return true;
  };

  // Toggle classification chips (max 3 per category)
  const toggleClassification = (category, value) => {
    setClassification((prev) => {
      const current = prev[category] || [];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((v) => v !== value) };
      } else if (current.length < 3) {
        return { ...prev, [category]: [...current, value] };
      } else {
        setError(`You can only select up to 3 ${category}. Please deselect one first.`);
        return prev;
      }
    });
  };

  // Handle file upload and text extraction
  const handleFileSelect = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only.");
      return;
    }

    setUploadProgress(0);
    setUploadedFile(null);
    setTextContent("");
    setIsExtracting(true);
    setError("");

    // Simulate upload progress while we process
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      // Call our new backend extraction endpoint
      const { data } = await api.post("/scripts/extract-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      clearInterval(interval);
      setUploadProgress(100);

      setUploadedFile({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });

      // Populate the editor with extracted text
      if (data.text) {
        setTextContent(data.text);
      }
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.message || "Failed to extract text from PDF.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle agreement scroll
  useEffect(() => {
    if (step !== 5) return;

    const agreementElement = agreementRef.current;
    if (!agreementElement) return;

    const updateAgreementScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = agreementElement;
      const isScrollable = scrollHeight - clientHeight > 8;

      if (!isScrollable) {
        setAgreementScrolled(true);
        return;
      }

      setAgreementScrolled(scrollTop + clientHeight >= scrollHeight - 10);
    };

    updateAgreementScrollState();
    agreementElement.addEventListener("scroll", updateAgreementScrollState);
    window.addEventListener("resize", updateAgreementScrollState);

    return () => {
      agreementElement.removeEventListener("scroll", updateAgreementScrollState);
      window.removeEventListener("resize", updateAgreementScrollState);
    };
  }, [step]);

  // Calculate total price
  const calculateTotal = () => {
    let total = 0;
    if (services.hosting) total += SERVICE_PRICES.hosting;
    if (services.evaluation) total += SERVICE_PRICES.evaluation;
    if (services.aiTrailer) total += SERVICE_PRICES.aiTrailer;
    return total;
  };

  // Validate step
  const validateStep = (stepNum) => {
    setError("");

    switch (stepNum) {
      case 1:
        if (!formData.title) {
          setError("Title is required.");
          return false;
        }
        if (!formData.format) {
          setError("Format is required.");
          return false;
        }
        if (!formData.pageCount || Number(formData.pageCount) <= 0) {
          setError("Page count is required.");
          return false;
        }
        if (!validatePageCount()) return false;
        if (!formData.primaryGenre) {
          setError("Primary genre is required.");
          return false;
        }
        if (!formData.logline || formData.logline.length > 300) {
          setError("Logline is required and must be 300 characters or less.");
          return false;
        }
        return true;

      case 2:
        // Step 2 is optional, but we can validate if needed
        return true;

      case 3:
        // If coming from the Create Project editor or in edit mode, content is already provided — skip validation
        if ((fromDraft || editId) && textContent.trim()) return true;
        if (!uploadedFile && !textContent.trim()) {
          setError("Please either upload a PDF or write your script in the editor.");
          return false;
        }
        return true;

      case 4:
        // Services are already set, no validation needed
        return true;

      case 5:
        if (!agreementScrolled) {
          setError("Please scroll to the bottom of the agreement.");
          return false;
        }
        if (!legal.agreedToTerms) {
          setError("You must agree to the terms to continue.");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < 5) {
      setStep(step + 1);
      setError("");
    }
  };

  // Handle back step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  // Handle saving a draft
  const handleSaveDraft = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = {
        title: formData.title || "Untitled Draft",
        logline: formData.logline,
        format: formData.format,
        pageCount: Number(formData.pageCount) || 0,
        textContent: textContent,
        classification: {
          primaryGenre: formData.primaryGenre,
          tones: classification.tones,
          themes: classification.themes,
          settings: classification.settings,
        }
      };

      await api.post("/scripts/draft", payload);
      // We don't navigate away, just show success
      // In a real app we'd use a toast notification
      alert("Draft saved successfully! You can resume it from your dashboard.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save draft.");
    } finally {
      setLoading(false);
    }
  };

  // Handle final submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateStep(5)) return;

    // Check credits before submitting
    const creditsNeeded = calculateTotal();
    if (creditsNeeded > creditsBalance) {
      setError(`Insufficient credits. You need ${creditsNeeded} credits but have ${creditsBalance}. Please purchase more credits.`);
      return;
    }

    setLoading(true);

    try {
      const tagsArr = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

      // Build payload according to specification
      const payload = {
        title: formData.title,
        logline: formData.logline,
        description: formData.description || formData.logline,
        synopsis: formData.description || formData.logline,
        format: formData.format,
        pageCount: Number(formData.pageCount),
        textContent: textContent,
        tags: tagsArr,
        classification: {
          primaryGenre: formData.primaryGenre,
          secondaryGenre: null,
          tones: classification.tones,
          themes: classification.themes,
          settings: classification.settings,
        },
        // Only send scriptUrl if a real file was uploaded; skip to preserve existing fileUrl on edits
        ...(uploadedFile?.url ? { scriptUrl: uploadedFile.url } : {}),
        services: {
          hosting: services.hosting,
          evaluation: services.evaluation,
          aiTrailer: services.aiTrailer,
        },
        legal: {
          agreedToTerms: legal.agreedToTerms,
          timestamp: new Date().toISOString(),
        },
        // If this was created via the editor, attach the draftId so the backend updates/converts it
        ...(scriptId ? { scriptId } : {}),
      };

      if (editId) {
        await api.put(`/scripts/${editId}`, payload);
        navigate(`/script/${editId}`);
      } else {
        const response = await api.post("/scripts/upload", payload);
        // Refresh credits balance after successful upload
        const { data: creditsData } = await api.get("/credits/balance");
        setCreditsBalance(creditsData.balance || 0);
        // Delete the draft now that it's published
        if (scriptId) {
          try { await api.delete(`/scripts/${scriptId}`); } catch { /* ok */ }
        }
        navigate("/dashboard");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to upload script. Please try again.";
      setError(errorMsg);

      // If insufficient credits error, refresh balance
      if (err.response?.data?.requiresCredits) {
        try {
          const { data: creditsData } = await api.get("/credits/balance");
          setCreditsBalance(creditsData.balance || 0);
        } catch { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  };

  // Access control
  if (user?.role !== "creator") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 sm:p-10 max-w-sm text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-neutral-400">Only creators can upload scripts. Switch to a creator account.</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full p-2.5 border border-white/[0.08] rounded-xl text-sm text-white bg-white/[0.04] placeholder-neutral-600 focus:ring-2 focus:ring-white/30 focus:border-transparent transition";
  const chipCls = (selected) =>
    `px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer ${selected
      ? "bg-white text-black"
      : "bg-white/[0.08] text-neutral-300 hover:bg-white/[0.12]"
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🎬</span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{editId ? "Edit Your Project" : "Add Your Project"}</h1>
            <p className="text-sm text-neutral-500">{editId ? "Update your script details and republish" : "Complete the 5-step wizard to publish your script"}</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => s < step && setStep(s)}
              className={`flex-1 h-2 rounded-full transition ${step >= s ? "bg-white" : "bg-white/[0.08]"
                } ${s < step ? "cursor-pointer hover:bg-neutral-200" : ""}`}
            />
          ))}
        </div>
        <p className="text-xs text-neutral-500 mb-6">
          Step {step} of 5 —{" "}
          {step === 1
            ? "Project Essentials"
            : step === 2
              ? "Deep Classification"
              : step === 3
                ? "File Upload"
                : step === 4
                  ? "Services & Strategy"
                  : "Legal & Checkout"}
        </p>

        {/* Main form container */}
        <div className="bg-[#0d1829] rounded-2xl border border-white/[0.06] p-6 sm:p-8">
          {error && (
            <div className="mb-5 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* ── Step 1: Project Essentials ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      placeholder="Enter your script title"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                        Format *
                      </label>
                      <select
                        name="format"
                        value={formData.format}
                        onChange={handleChange}
                        required
                        className={inputCls}
                      >
                        {formats.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                        Page Count *
                      </label>
                      <input
                        type="number"
                        name="pageCount"
                        value={formData.pageCount}
                        onChange={handleChange}
                        required
                        min="1"
                        placeholder="110"
                        className={inputCls}
                      />
                      {formData.format === "feature" && Number(formData.pageCount) > 0 && Number(formData.pageCount) < 70 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Feature films typically require at least 70 pages
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                      Primary Genre *
                    </label>
                    <select
                      name="primaryGenre"
                      value={formData.primaryGenre}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    >
                      <option value="">Select a genre</option>
                      {genres.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                      Logline * <span className="text-neutral-500">(Max 300 characters)</span>
                    </label>
                    <textarea
                      name="logline"
                      value={formData.logline}
                      onChange={handleChange}
                      required
                      rows={3}
                      maxLength={300}
                      placeholder="A one-line hook that sells your concept..."
                      className={inputCls}
                    />
                    <p className="text-xs text-neutral-500 mt-1 text-right">
                      {formData.logline.length}/300
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                      Description <span className="text-neutral-500">(shown on your project page)</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="A short description of your project..."
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-1.5">
                      Tags <span className="text-neutral-500">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="thriller, detective, serial-killer"
                      className={inputCls}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Deep Classification ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <p className="text-sm text-neutral-400 mb-4">
                    Select up to 3 options per category to power the Smart Match algorithm.
                  </p>

                  {/* Tones */}
                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-2">
                      Tone ({classification.tones.length}/3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {toneOptions.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => toggleClassification("tones", tone)}
                          className={chipCls(classification.tones.includes(tone))}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Themes */}
                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-2">
                      Theme ({classification.themes.length}/3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {themeOptions.map((theme) => (
                        <button
                          key={theme}
                          type="button"
                          onClick={() => toggleClassification("themes", theme)}
                          className={chipCls(classification.themes.includes(theme))}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Settings */}
                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-2">
                      Setting ({classification.settings.length}/3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {settingOptions.map((setting) => (
                        <button
                          key={setting}
                          type="button"
                          onClick={() => toggleClassification("settings", setting)}
                          className={chipCls(classification.settings.includes(setting))}
                        >
                          {setting}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: File Upload ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-neutral-300 font-medium">
                        Script File (PDF) & Editor *
                      </label>
                      {!fromDraft && (
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={loading}
                          className="text-xs font-bold text-white bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-white/[0.08] transition disabled:opacity-50"
                        >
                          {loading ? "Saving..." : "💾 Save Draft"}
                        </button>
                      )}
                    </div>

                    {fromDraft && textContent ? (
                      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
                        <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-green-400 font-semibold">Script content loaded from editor</p>
                          <p className="text-xs text-neutral-500 mt-0.5">Your draft has been imported. You can optionally replace it with a PDF below.</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500 mb-4">
                        Upload your PDF to automatically extract the text. You can then edit it directly in the editor below.
                      </p>
                    )}

                    {/* PDF Uploader */}
                    {!uploadedFile ? (
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => !isExtracting && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${isExtracting ? 'border-blue-500/20 bg-blue-500/10 cursor-wait' : 'border-white/[0.12] cursor-pointer hover:border-white'}`}
                      >
                        <div className="text-3xl mb-2">{isExtracting ? "⏳" : "📄"}</div>
                        <p className="text-sm font-medium text-neutral-300 mb-1">
                          {isExtracting ? "Extracting text from PDF..." : "Drag & drop your PDF here to auto-fill editor"}
                        </p>
                        <p className="text-xs text-neutral-500">{isExtracting ? "Please wait..." : "or click to browse"}</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileSelect(e.target.files[0])}
                          className="hidden"
                          disabled={isExtracting}
                        />
                      </div>
                    ) : (
                      <div className="border border-green-500/20 rounded-xl p-3 bg-green-500/10 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">✅</div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-green-400">
                              {uploadedFile.name} (Text Extracted)
                            </p>
                            <p className="text-xs text-green-400">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null);
                              setUploadProgress(0);
                              setTextContent("");
                            }}
                            className="text-red-400 hover:text-red-400 text-sm font-bold px-2 py-1 bg-white/[0.08] rounded-md border border-red-500/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="my-4">
                        <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden relative">
                          <div
                            className="bg-white h-2 rounded-full transition-all duration-300 relative"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 text-center font-medium animate-pulse">
                          Processing file... {uploadProgress}%
                        </p>
                      </div>
                    )}


                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Services & Strategy ── */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-neutral-400 mb-4">
                    Select the services you'd like to include with your project.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Hosting Card */}
                    <div
                      className={`border-2 rounded-xl p-5 cursor-pointer transition ${services.hosting
                        ? "border-white bg-white/[0.08]"
                        : "border-white/[0.08] hover:border-white/[0.12]"
                        }`}
                      onClick={() => {
                        // Hosting is required, so we don't allow toggling off
                        setError("Hosting is required for your script to be searchable.");
                      }}
                    >
                      <div className="text-3xl mb-3">☁️</div>
                      <h3 className="font-semibold text-white mb-1">Hosting</h3>
                      <p className="text-2xl font-bold text-green-400 mb-2">
                        FREE
                      </p>
                      <p className="text-xs text-neutral-400 mb-3">
                        Required to be searchable by industry professionals.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={services.hosting}
                          readOnly
                          className="w-4 h-4 text-white rounded"
                        />
                        <span className="text-xs text-neutral-300">Selected (Required)</span>
                      </div>
                    </div>

                    {/* Evaluation Card */}
                    <div
                      className={`border-2 rounded-xl p-5 cursor-pointer transition ${services.evaluation
                        ? "border-white bg-white/[0.08]"
                        : "border-white/[0.08] hover:border-white/[0.12]"
                        }`}
                      onClick={() =>
                        setServices({ ...services, evaluation: !services.evaluation })
                      }
                    >
                      <div className="text-3xl mb-3">⭐</div>
                      <h3 className="font-semibold text-white mb-1">
                        Professional Evaluation
                      </h3>
                      <p className="text-2xl font-bold text-white mb-2">
                        {SERVICE_PRICES.evaluation} credits
                      </p>
                      <p className="text-xs text-neutral-400 mb-3">
                        Get a scorecard and written feedback from a vetted reader.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={services.evaluation}
                          readOnly
                          className="w-4 h-4 text-white rounded"
                        />
                        <span className="text-xs text-neutral-300">
                          {services.evaluation ? "Selected" : "Optional"}
                        </span>
                      </div>
                    </div>

                    {/* AI Trailer Card */}
                    <div
                      className={`border-2 rounded-xl p-5 cursor-pointer transition relative ${services.aiTrailer
                        ? "border-white bg-white/[0.08]"
                        : "border-white/[0.08] hover:border-white/[0.12]"
                        }`}
                      onClick={() =>
                        setServices({ ...services, aiTrailer: !services.aiTrailer })
                      }
                    >
                      <div className="absolute top-2 right-2">
                        <span className="bg-amber-500/100 text-white text-xs font-bold px-2 py-0.5 rounded">
                          BETA
                        </span>
                      </div>
                      <div className="text-3xl mb-3">🎬</div>
                      <h3 className="font-semibold text-white mb-1">AI Concept Trailer</h3>
                      <p className="text-2xl font-bold text-white mb-2">
                        {SERVICE_PRICES.aiTrailer} credits
                      </p>
                      <p className="text-xs text-neutral-400 mb-3">
                        Generate a 60-second cinematic teaser using AI voiceover & stock footage.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={services.aiTrailer}
                          readOnly
                          className="w-4 h-4 text-white rounded"
                        />
                        <span className="text-xs text-neutral-300">
                          {services.aiTrailer ? "Selected" : "Optional"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total Preview */}
                  <div className="bg-white/[0.04] rounded-xl p-4 mt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-neutral-300">Total Credits Required:</span>
                      <span className="text-2xl font-bold text-white">
                        {calculateTotal()} credits
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                      {services.hosting && (
                        <span>Hosting (FREE)</span>
                      )}
                      {services.evaluation && (
                        <span>
                          {services.hosting ? " + " : ""}{SERVICE_PRICES.evaluation} credits evaluation
                        </span>
                      )}
                      {services.aiTrailer && (
                        <span>
                          {services.hosting || services.evaluation ? " + " : ""}
                          {SERVICE_PRICES.aiTrailer} credits AI trailer
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition"
                    >
                      Next →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 5: Legal & Checkout ── */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  {/* Credits Balance Display */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-400">Your Credits Balance</p>
                        <p className="text-2xl font-bold text-white">{creditsBalance} credits</p>
                      </div>
                      {calculateTotal() > creditsBalance && (
                        <div className="text-right">
                          <p className="text-sm text-red-400 font-medium">Insufficient credits</p>
                          <p className="text-xs text-neutral-400">Need {calculateTotal() - creditsBalance} more</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agreement */}
                  <div>
                    <label className="block text-sm text-neutral-300 font-medium mb-2">
                      Submission Release Agreement *
                    </label>
                    <div
                      ref={agreementRef}
                      className="border border-white/[0.08] rounded-xl p-4 h-64 overflow-y-auto text-xs text-neutral-300 leading-relaxed"
                    >
                      <pre className="whitespace-pre-wrap font-sans">{LEGAL_AGREEMENT}</pre>
                    </div>
                    {!agreementScrolled && (
                      <p className="text-xs text-amber-600 mt-1">
                        Please scroll to the bottom of the agreement to continue.
                      </p>
                    )}
                  </div>

                  {/* Agreement Checkbox */}
                  <div className="flex items-start gap-3 p-4 bg-white/[0.04] rounded-xl">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={legal.agreedToTerms}
                      onChange={(e) =>
                        setLegal({ ...legal, agreedToTerms: e.target.checked })
                      }
                      disabled={!agreementScrolled}
                      className="w-5 h-5 text-white rounded mt-0.5 disabled:opacity-50"
                    />
                    <label
                      htmlFor="agreeTerms"
                      className={`text-sm ${agreementScrolled ? "text-neutral-300" : "text-neutral-500"
                        }`}
                    >
                      I have read and agree to the Submission Release Agreement
                    </label>
                  </div>

                  {/* Receipt Summary */}
                  <div className="bg-white/[0.04] rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-white mb-3">
                      Order Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      {services.hosting && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Hosting & Discovery</span>
                          <span className="font-medium text-green-400">FREE</span>
                        </div>
                      )}
                      {services.evaluation && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Professional Evaluation</span>
                          <span className="font-medium">{SERVICE_PRICES.evaluation} credits</span>
                        </div>
                      )}
                      {services.aiTrailer && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">AI Concept Trailer</span>
                          <span className="font-medium">{SERVICE_PRICES.aiTrailer} credits</span>
                        </div>
                      )}
                      <div className="border-t border-white/[0.08] pt-2 mt-2 flex justify-between">
                        <span className="font-semibold text-white">Total Credits</span>
                        <span className="text-xl font-bold text-white">
                          {calculateTotal()} credits
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-6 py-2.5 border border-white/[0.08] text-neutral-400 rounded-xl text-sm hover:bg-white/[0.05] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !legal.agreedToTerms}
                      className="flex-1 px-6 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-black/30"
                    >
                      {loading ? "Processing..." : "✨ Use Credits & Publish"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default ScriptUpload;
