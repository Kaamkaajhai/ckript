import { useState, useContext, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import AiWritingAssistant from "../components/AiWritingAssistant";

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
- All payments are processed securely through Razorpay

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
  const { isDarkMode } = useDarkMode();
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
  const thumbnailInputRef = useRef(null);
  const trailerInputRef = useRef(null);

  // Thumbnail and Trailer states
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [trailerFile, setTrailerFile] = useState(null);
  const [trailerOption, setTrailerOption] = useState("none"); // "none", "ai", "upload"

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

  // Script pricing
  const PRICE_PRESETS = [5, 10, 15, 25, 50];
  const PLATFORM_FEE = 0.2;
  const [isPremium, setIsPremium] = useState(false);
  const [scriptPrice, setScriptPrice] = useState(10);
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const effectivePrice = isPremium ? (useCustomPrice ? Number(customPriceInput) || 0 : scriptPrice) : 0;
  const writerEarns = Math.round(effectivePrice * (1 - PLATFORM_FEE) * 100) / 100;
  const FORMAT_PRICE_GUIDE = {
    feature:      { label: "Feature Film",  min: 15, max: 50, suggest: 25 },
    tv_1hour:     { label: "TV 1-Hour",     min: 10, max: 30, suggest: 15 },
    tv_halfhour:  { label: "TV Half-Hour",  min: 5,  max: 20, suggest: 10 },
    short:        { label: "Short Film",    min: 5,  max: 15, suggest: 5  },
  };

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

  // Handle thumbnail selection
  const handleThumbnailSelect = (file) => {
    if (!file) return;
    
    console.log("Thumbnail file selected:", file.name, file.type, file.size);
    
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid image file (JPEG, PNG, WebP, or GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Thumbnail file size must be less than 5MB.");
      return;
    }

    setThumbnailFile(file);
    setError("");
    console.log("Thumbnail file set successfully");
  };

  // Handle trailer selection
  const handleTrailerSelect = (file) => {
    if (!file) return;
    
    console.log("Trailer file selected:", file.name, file.type, file.size);
    
    const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid video file (MP4, MPEG, MOV, or WebM).");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("Trailer file size must be less than 100MB.");
      return;
    }

    setTrailerFile(file);
    setTrailerOption("upload");
    setError("");
    console.log("Trailer file set successfully, trailerOption set to 'upload'");
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
    if (trailerOption === "ai") total += SERVICE_PRICES.aiTrailer; // Use trailerOption instead
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

    console.log("Starting script submission...");
    console.log("Thumbnail file:", thumbnailFile ? thumbnailFile.name : "none");
    console.log("Trailer file:", trailerFile ? trailerFile.name : "none");
    console.log("Trailer option:", trailerOption);

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
          aiTrailer: trailerOption === "ai",
        },
        legal: {
          agreedToTerms: legal.agreedToTerms,
          timestamp: new Date().toISOString(),
        },
        premium: isPremium && effectivePrice > 0,
        price: isPremium && effectivePrice > 0 ? effectivePrice : 0,
        // If this was created via the editor, attach the draftId so the backend updates/converts it
        ...(scriptId ? { scriptId } : {}),
      };

      if (editId) {
        await api.put(`/scripts/${editId}`, payload);
        
        // Upload thumbnail if provided
        if (thumbnailFile) {
          try {
            console.log("Uploading thumbnail for script:", editId);
            const thumbnailFormData = new FormData();
            thumbnailFormData.append("thumbnail", thumbnailFile);
            const thumbResponse = await api.post(`/scripts/${editId}/upload-thumbnail`, thumbnailFormData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
            console.log("Thumbnail uploaded successfully:", thumbResponse.data);
          } catch (thumbError) {
            console.error("Thumbnail upload failed:", thumbError);
            setError(`Script updated but thumbnail upload failed: ${thumbError.response?.data?.message || thumbError.message}`);
          }
        }

        // Upload trailer if provided (free)
        if (trailerFile && trailerOption === "upload") {
          try {
            console.log("Uploading trailer for script:", editId);
            const trailerFormData = new FormData();
            trailerFormData.append("trailer", trailerFile);
            const trailerResponse = await api.post(`/scripts/${editId}/upload-trailer`, trailerFormData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
            console.log("Trailer uploaded successfully:", trailerResponse.data);
          } catch (trailerError) {
            console.error("Trailer upload failed:", trailerError);
            setError(`Script updated but trailer upload failed: ${trailerError.response?.data?.message || trailerError.message}`);
          }
        }

        navigate(`/script/${editId}`);
      } else {
        const response = await api.post("/scripts/upload", payload);
        const newScriptId = response.data._id;
        console.log("Script created with ID:", newScriptId);
        
        // Upload thumbnail if provided
        if (thumbnailFile) {
          try {
            console.log("Uploading thumbnail for new script:", newScriptId);
            const thumbnailFormData = new FormData();
            thumbnailFormData.append("thumbnail", thumbnailFile);
            const thumbResponse = await api.post(`/scripts/${newScriptId}/upload-thumbnail`, thumbnailFormData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
            console.log("Thumbnail uploaded successfully:", thumbResponse.data);
          } catch (thumbError) {
            console.error("Thumbnail upload failed:", thumbError);
            setError(`Script created but thumbnail upload failed: ${thumbError.response?.data?.message || thumbError.message}`);
          }
        }

        // Upload trailer if provided (free)
        if (trailerFile && trailerOption === "upload") {
          try {
            console.log("Uploading trailer for new script:", newScriptId);
            const trailerFormData = new FormData();
            trailerFormData.append("trailer", trailerFile);
            const trailerResponse = await api.post(`/scripts/${newScriptId}/upload-trailer`, trailerFormData, {
              headers: { "Content-Type": "multipart/form-data" }
            });
            console.log("Trailer uploaded successfully:", trailerResponse.data);
          } catch (trailerError) {
            console.error("Trailer upload failed:", trailerError);
            setError(`Script created but trailer upload failed: ${trailerError.response?.data?.message || trailerError.message}`);
          }
        }

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

  const inputCls = isDarkMode
    ? "w-full p-2.5 border border-white/[0.08] rounded-xl text-sm text-white bg-white/[0.04] placeholder-neutral-600 focus:ring-2 focus:ring-white/30 focus:border-transparent transition"
    : "w-full p-2.5 border border-gray-200 rounded-xl text-sm text-[#1e3a5f] bg-white placeholder-gray-400 focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/50 transition";
  const chipCls = (selected) =>
    `px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer ${selected
      ? isDarkMode ? "bg-white text-black" : "bg-[#1e3a5f] text-white"
      : isDarkMode ? "bg-white/[0.08] text-neutral-300 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;
  const labelCls = isDarkMode ? "text-white" : "text-[#1e3a5f]";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? "text-white" : "text-[#1e3a5f]"}`}>{editId ? "Edit Your Project" : "Add Your Project"}</h1>
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
        <div className={`rounded-2xl border p-6 sm:p-8 ${isDarkMode ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200 shadow-sm"}`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                      <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                      <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-1.5`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
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
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
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
                      <label className={`block text-sm ${labelCls} font-medium`}>
                        Script File (PDF) & Editor *
                      </label>
                      {!fromDraft && (
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={loading}
                          className="text-xs font-bold text-white bg-white/[0.06] px-3 py-1.5 rounded-lg hover:bg-white/[0.08] transition disabled:opacity-50"
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
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${isExtracting ? 'border-[#1c2a3a] bg-[#0d1520] cursor-wait' : 'border-white/[0.12] cursor-pointer hover:border-white'}`}
                      >
                        <div className="text-3xl mb-2">{isExtracting ? "⏳" : "📄"}</div>
                        <p className={`text-sm font-medium ${labelCls} mb-1`}>
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

                    {/* ── AI Writing Assistant + Script Editor ── */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm text-neutral-300 font-medium">
                          Script Editor
                        </label>
                        <AiWritingAssistant
                          textContent={textContent}
                          onApply={(newText) => setTextContent(newText)}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        rows={18}
                        placeholder="Paste or write your script here... then use the AI Assistant above to improve it instantly."
                        className="w-full p-4 bg-white/[0.03] border border-white/[0.1] rounded-xl text-sm text-neutral-200 placeholder-neutral-600 focus:ring-2 focus:ring-purple-500/30 focus:border-transparent transition font-mono leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-neutral-600">
                          {textContent.length > 0
                            ? `${textContent.split(/\s+/).filter(Boolean).length} words · ${textContent.length} chars`
                            : "Start writing or upload a PDF above"}
                        </p>
                        <p className="text-[10px] text-purple-400/60">
                          🤖 Use AI Assistant to improve, polish & professionalize your script
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* ── Thumbnail Upload ── */}
                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
                      Script Thumbnail (Optional)
                    </label>
                    <p className="text-xs text-neutral-500 mb-3">
                      Upload a cover image for your script. This will be displayed on your script card.
                    </p>
                    
                    {!thumbnailFile ? (
                      <div
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="border-2 border-dashed border-white/[0.12] rounded-xl p-6 text-center cursor-pointer hover:border-white transition"
                      >
                        <div className="text-3xl mb-2">🖼️</div>
                        <p className={`text-sm font-medium ${labelCls} mb-1`}>
                          Upload Thumbnail Image
                        </p>
                        <p className="text-xs text-neutral-500">JPEG, PNG, WebP, or GIF (Max 5MB)</p>
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => handleThumbnailSelect(e.target.files[0])}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="border border-green-500/20 rounded-xl p-3 bg-green-500/10">
                        <div className="flex items-center gap-3">
                          <img 
                            src={URL.createObjectURL(thumbnailFile)} 
                            alt="Thumbnail preview" 
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-green-400">
                              {thumbnailFile.name}
                            </p>
                            <p className="text-xs text-green-400">
                              {(thumbnailFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setThumbnailFile(null)}
                            className="text-red-400 hover:text-red-400 text-sm font-bold px-2 py-1 bg-white/[0.08] rounded-md border border-red-500/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Trailer Upload or AI Generation ── */}
                  <div>
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
                      Trailer (Optional)
                    </label>
                    <p className="text-xs text-neutral-500 mb-3">
                      Choose to upload your own trailer (FREE) or generate one with AI (costs credits in next step).
                    </p>
                    
                    {/* Hidden file input - always rendered so ref works */}
                    <input
                      ref={trailerInputRef}
                      type="file"
                      accept="video/mp4,video/mpeg,video/quicktime,video/webm"
                      onChange={(e) => handleTrailerSelect(e.target.files[0])}
                      className="hidden"
                    />
                    
                    {/* Trailer Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTrailerOption("none");
                          setTrailerFile(null);
                        }}
                        className={`p-3 rounded-xl text-sm font-medium transition ${
                          trailerOption === "none"
                            ? isDarkMode ? "bg-white text-black" : "bg-[#1e3a5f] text-white"
                            : isDarkMode ? "bg-white/[0.08] text-neutral-300 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <div className="text-2xl mb-1">🚫</div>
                        No Trailer
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => trailerInputRef.current?.click()}
                        className={`p-3 rounded-xl text-sm font-medium transition ${
                          trailerOption === "upload"
                            ? isDarkMode ? "bg-white text-black" : "bg-[#1e3a5f] text-white"
                            : isDarkMode ? "bg-white/[0.08] text-neutral-300 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <div className="text-2xl mb-1">📤</div>
                        Upload (FREE)
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setTrailerOption("ai");
                          setTrailerFile(null);
                        }}
                        className={`p-3 rounded-xl text-sm font-medium transition relative ${
                          trailerOption === "ai"
                            ? isDarkMode ? "bg-white text-black" : "bg-[#1e3a5f] text-white"
                            : isDarkMode ? "bg-white/[0.08] text-neutral-300 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <div className="text-2xl mb-1">🤖</div>
                        AI Generate
                        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {SERVICE_PRICES.aiTrailer} credits
                        </span>
                      </button>
                    </div>

                    {/* Trailer File Upload Prompt */}
                    {trailerOption === "upload" && !trailerFile && (
                      <div
                        onClick={() => trailerInputRef.current?.click()}
                        className="border-2 border-dashed border-white/[0.12] rounded-xl p-6 text-center cursor-pointer hover:border-white transition"
                      >
                        <div className="text-3xl mb-2">🎬</div>
                        <p className={`text-sm font-medium ${labelCls} mb-1`}>
                          Click to Upload Your Trailer Video
                        </p>
                        <p className="text-xs text-neutral-500">MP4, MPEG, MOV, or WebM (Max 100MB)</p>
                      </div>
                    )}

                    {trailerFile && trailerOption === "upload" && (
                      <div className="border border-green-500/20 rounded-xl p-3 bg-green-500/10">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">✅</div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-green-400">
                              {trailerFile.name}
                            </p>
                            <p className="text-xs text-green-400">
                              {(trailerFile.size / 1024 / 1024).toFixed(2)} MB - Will be uploaded for FREE
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTrailerFile(null);
                              setTrailerOption("none");
                            }}
                            className="text-red-400 hover:text-red-400 text-sm font-bold px-2 py-1 bg-white/[0.08] rounded-md border border-red-500/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {trailerOption === "ai" && (
                      <div className="border border-[#1c2a3a] rounded-xl p-4 bg-[#0d1520]">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">🤖</div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-[#8896a7]">
                              AI Trailer Generation Selected
                            </p>
                            <p className="text-xs text-neutral-400">
                              {SERVICE_PRICES.aiTrailer} credits will be charged in the next step. Ready within 2 business days.
                            </p>
                          </div>
                        </div>
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
                    Set your script's price and select optional services.
                  </p>

                  {/* ── Pricing Panel ── */}
                  <div className="border border-white/[0.08] bg-white/[0.03] rounded-2xl p-5 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Script Access & Pricing</h3>
                        <p className="text-[11px] text-neutral-500">Decide whether your full script is freely readable or paid</p>
                      </div>
                    </div>

                    {/* Free / Premium toggle */}
                    <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-white/[0.04]">
                      <button
                        type="button"
                        onClick={() => setIsPremium(false)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          !isPremium ? "bg-white/[0.12] text-white shadow" : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        Free Access
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPremium(true)}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          isPremium
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm"
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        Premium (Paid)
                      </button>
                    </div>

                    {/* Free description */}
                    {!isPremium && (
                      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#8896a7]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                        <p className="text-[12px] leading-relaxed text-neutral-400">
                          Anyone can read your full script for free. Great for building your audience and getting discovered by more industry professionals.
                        </p>
                      </div>
                    )}

                    {/* Premium price picker */}
                    {isPremium && (
                      <div className="space-y-4">
                        {/* Suggested range */}
                        {FORMAT_PRICE_GUIDE[formData.format] && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                            <span><strong>Industry guide for {FORMAT_PRICE_GUIDE[formData.format].label}:</strong> ${FORMAT_PRICE_GUIDE[formData.format].min}–${FORMAT_PRICE_GUIDE[formData.format].max} · Suggested: ${FORMAT_PRICE_GUIDE[formData.format].suggest}</span>
                          </div>
                        )}

                        {/* Quick-select presets */}
                        <div>
                          <p className="text-[11px] font-semibold mb-2 text-neutral-500">QUICK SELECT</p>
                          <div className="flex flex-wrap gap-2">
                            {PRICE_PRESETS.map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => { setScriptPrice(p); setUseCustomPrice(false); setCustomPriceInput(""); }}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                  !useCustomPrice && scriptPrice === p
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                    : "border-white/[0.1] text-neutral-400 hover:border-emerald-500/50 hover:text-emerald-400"
                                }`}
                              >
                                ${p}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => { setUseCustomPrice(true); setCustomPriceInput(String(scriptPrice)); }}
                              className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                useCustomPrice
                                  ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                  : "border-white/[0.1] text-neutral-400 hover:border-emerald-500/50 hover:text-emerald-400"
                              }`}
                            >
                              Custom
                            </button>
                          </div>
                        </div>

                        {/* Custom input */}
                        {useCustomPrice && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-36">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">$</span>
                              <input
                                type="number" min="1" max="500" step="1"
                                value={customPriceInput}
                                onChange={e => setCustomPriceInput(e.target.value)}
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm font-bold border-2 outline-none bg-white/[0.04] border-emerald-500/50 text-white focus:border-emerald-500 transition-all"
                              />
                            </div>
                            <span className="text-[11px] text-neutral-500">Enter a value between $1 and $500</span>
                          </div>
                        )}

                        {/* Earnings preview */}
                        {effectivePrice > 0 && (
                          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                            <div className="text-center">
                              <p className="text-[11px] font-semibold mb-1 text-neutral-500">Buyer Pays</p>
                              <p className="text-xl font-black text-white">${effectivePrice}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-semibold mb-1 text-neutral-500">Platform Fee</p>
                              <p className="text-xl font-black text-neutral-400">${(effectivePrice * PLATFORM_FEE).toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-semibold mb-1 text-emerald-400">You Earn</p>
                              <p className="text-xl font-black text-emerald-400">${writerEarns}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <span className={`text-xs ${labelCls}`}>Selected (Required)</span>
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
                        <span className={`text-xs ${labelCls}`}>
                          {services.evaluation ? "Selected" : "Optional"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trailer Selection Display */}
                  <div className="bg-white/[0.04] rounded-xl p-4 mt-4 border border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">
                        {trailerOption === "none" && "🚫"}
                        {trailerOption === "upload" && "📤"}
                        {trailerOption === "ai" && "🤖"}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">Trailer Option</h3>
                        {trailerOption === "none" && (
                          <p className="text-sm text-neutral-400">No trailer selected</p>
                        )}
                        {trailerOption === "upload" && (
                          <p className="text-sm text-green-400">
                            {trailerFile ? `Uploaded: ${trailerFile.name}` : "Custom trailer to be uploaded"} (FREE)
                          </p>
                        )}
                        {trailerOption === "ai" && (
                          <p className="text-sm text-[#8896a7]">
                            AI Trailer Generation - {SERVICE_PRICES.aiTrailer} credits
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="text-xs text-neutral-400 hover:text-white underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Total Preview */}
                  <div className="bg-white/[0.04] rounded-xl p-4 mt-6">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${labelCls}`}>Total Credits Required:</span>
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
                      {trailerOption === "ai" && (
                        <span>
                          {services.hosting || services.evaluation ? " + " : ""}
                          {SERVICE_PRICES.aiTrailer} credits AI trailer
                        </span>
                      )}
                      {trailerOption === "upload" && trailerFile && (
                        <span>
                          {services.hosting || services.evaluation ? " + " : ""}
                          Trailer upload (FREE)
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
                  <div className="bg-[#0d1520] border border-[#1c2a3a] rounded-xl p-4">
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
                    <label className={`block text-sm ${labelCls} font-medium mb-2`}>
                      Submission Release Agreement *
                    </label>
                    <div
                      ref={agreementRef}
                      className={`rounded-xl p-4 h-64 overflow-y-auto text-xs leading-relaxed ${isDarkMode ? "border border-white/[0.08] text-neutral-300" : "border border-gray-200 text-[#1e3a5f]"}`}
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
                      className={`text-sm ${agreementScrolled ? labelCls : "text-neutral-500"
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
