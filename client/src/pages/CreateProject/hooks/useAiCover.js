import { useState } from "react";
import api from "../../../services/api";

/**
 * Owns AI cover-image generation: request a cover from title/genre/logline,
 * set it as the thumbnail (via the parent's setThumbnailFile), and track the
 * per-script attempt count + generated history. Also provides a standalone
 * client-side "download watermarked image" helper.
 */
export function useAiCover({ user, title, formData, showToast, openPricingModal, setThumbnailFile }) {
  const [isGeneratingAiCover, setIsGeneratingAiCover] = useState(false);
  const [aiCoverAttempts, setAiCoverAttempts] = useState(0);
  const [aiCoverHistory, setAiCoverHistory] = useState([]);
  const [aiCoverIndex, setAiCoverIndex] = useState(-1);

  const generateAiCover = async () => {
    const plan = user?.subscription?.plan || "free";
    if (plan === "free") {
      showToast(
        "Purchase a plan to use AI thumbnail generation.",
        "warning",
        { label: "Pricing Plan", onClick: () => openPricingModal("writer") }
      );
      return;
    }
    if (!title) {
      showToast("Please enter a title first to generate an AI cover.", "warning");
      return;
    }
    if (aiCoverAttempts >= 3) {
      showToast("You have reached the limit of 3 AI cover generations for this script.", "warning");
      return;
    }
    try {
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
        setAiCoverAttempts(res.data.attempts || (aiCoverAttempts + 1));
        const newHistory = [...aiCoverHistory.slice(0, aiCoverIndex + 1), file];
        setAiCoverHistory(newHistory);
        setAiCoverIndex(newHistory.length - 1);
      } else {
        showToast("Failed to generate AI cover. Please try again.", "error");
      }
    } catch (error) {
      console.error("AI cover generation failed:", error);
      const errMsg = error.response?.data?.message || error.message;
      showToast(errMsg, "error");
    } finally {
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
    aiCoverHistory,
    setAiCoverHistory,
    aiCoverIndex,
    setAiCoverIndex,
    generateAiCover,
    downloadWatermarkedImage,
  };
}
