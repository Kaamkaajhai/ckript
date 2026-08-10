import { useRef, useState } from "react";
import api from "../../../services/api";
import {
  AI_LOCKED_TOAST,
  AI_QUOTA_TOAST,
  aiImagesRemaining,
  describeAiError,
  userHasAiAccess,
} from "../../../config/aiEntitlements";

/**
 * Owns AI cover-image generation: request a cover from title/genre/logline,
 * set it as the thumbnail (via the parent's setThumbnailFile), and track the
 * remaining plan-period allowance + generated history. Also provides a standalone
 * client-side "download watermarked image" helper.
 *
 * The allowance is the SERVER's number, not ours. `aiCoverRemaining` starts from whatever the auth
 * user carries (full allowance if that field is absent) and is replaced by the authoritative count on
 * every response. It used to be `3 - aiCoverAttempts` over React state that a page reload reset,
 * against a server that counted nothing at all.
 */
export function useAiCover({ user, title, formData, showToast, openPricingModal, setThumbnailFile }) {
  // React's disabled state is not synchronous. Keep a request-level latch as well so two taps in
  // the same frame cannot spend two images and let out-of-order responses move the count backwards.
  const requestInFlightRef = useRef(false);
  const [isGeneratingAiCover, setIsGeneratingAiCover] = useState(false);
  const [aiCoverAttempts, setAiCoverAttempts] = useState(
    Number(user?.subscription?.aiImagesGeneratedTotal) || 0
  );
  const [aiCoverRemaining, setAiCoverRemaining] = useState(
    aiImagesRemaining(user?.subscription?.aiImagesGeneratedTotal)
  );
  const [aiCoverHistory, setAiCoverHistory] = useState([]);
  const [aiCoverIndex, setAiCoverIndex] = useState(-1);

  const generateAiCover = async () => {
    if (requestInFlightRef.current) return;
    if (!userHasAiAccess(user)) {
      showToast(
        AI_LOCKED_TOAST,
        "warning",
        { label: "Pricing Plan", onClick: () => openPricingModal("writer") }
      );
      return;
    }
    if (!title) {
      showToast("Please enter a title first to generate an AI cover.", "warning");
      return;
    }
    if (aiCoverRemaining <= 0) {
      // No upgrade action here: this writer already pays, they have spent the period's images.
      showToast(AI_QUOTA_TOAST, "warning");
      return;
    }
    try {
      requestInFlightRef.current = true;
      setIsGeneratingAiCover(true);
      const res = await api.post("/scripts/generate-ai-cover", {
        title: title,
        genre: formData.primaryGenre || "",
        logline: formData.logline || "",
        scriptText: ""
      });
      if (res.data && res.data.base64Image) {
        const resUrl = res.data.base64Image;
        const resFetch = await fetch(resUrl);
        const blob = await resFetch.blob();
        const file = new File([blob], `ai-cover-${Date.now()}.jpg`, { type: "image/jpeg" });
        setThumbnailFile(file);
        setAiCoverAttempts(res.data.attempts ?? (aiCoverAttempts + 1));
        setAiCoverRemaining(
          typeof res.data.remaining === "number" ? res.data.remaining : aiCoverRemaining - 1
        );
        const newHistory = [...aiCoverHistory.slice(0, aiCoverIndex + 1), file];
        setAiCoverHistory(newHistory);
        setAiCoverIndex(newHistory.length - 1);
      } else {
        showToast("Failed to generate AI cover. Please try again.", "error");
      }
    } catch (error) {
      console.error("AI cover generation failed:", error);
      const { kind, message, offerUpgrade } = describeAiError(error);
      if (kind === "quota") setAiCoverRemaining(0);
      showToast(
        message,
        "warning",
        offerUpgrade ? { label: "Pricing Plan", onClick: () => openPricingModal("writer") } : null
      );
    } finally {
      requestInFlightRef.current = false;
      setIsGeneratingAiCover(false);
    }
  };

  const downloadWatermarkedImage = (file) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add watermark
      ctx.font = "bold 120px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 1)"; // Fully opaque white for clarity
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";

      // Add a crisp black outline (stroke) instead of a blurry shadow
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.strokeText("ckript", canvas.width - 40, canvas.height - 40);

      // Draw the solid white text over the outline
      ctx.fillText("ckript", canvas.width - 40, canvas.height - 40);

      // Download
      const a = document.createElement("a");
      a.download = `watermarked-${file.name}`;
      a.href = canvas.toDataURL("image/jpeg");
      a.click();
      URL.revokeObjectURL(url);
    };
  };

  return {
    isGeneratingAiCover,
    setIsGeneratingAiCover,
    aiCoverAttempts,
    setAiCoverAttempts,
    aiCoverRemaining,
    setAiCoverRemaining,
    aiCoverHistory,
    setAiCoverHistory,
    aiCoverIndex,
    setAiCoverIndex,
    generateAiCover,
    downloadWatermarkedImage,
  };
}
