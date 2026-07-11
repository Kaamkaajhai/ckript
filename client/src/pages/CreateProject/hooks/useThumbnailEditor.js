import { useCallback, useState } from "react";
import { MAX_THUMBNAIL_SIZE, MAX_THUMBNAIL_SOURCE_SIZE } from "../constants";
import { getCroppedThumbnailBlob } from "../lib/imageCrop";

/**
 * Owns the thumbnail crop/rotate/zoom editor modal: its open state, the crop
 * transform, and the select -> crop -> apply flow. The parent still owns the
 * resulting thumbnailFile (consumed by save/publish); this hook hands the
 * processed File to it via setThumbnailFile.
 */
export function useThumbnailEditor({ showToast, setError, setThumbnailFile }) {
  const [isThumbnailEditorOpen, setIsThumbnailEditorOpen] = useState(false);
  const [thumbnailSourceUrl, setThumbnailSourceUrl] = useState("");
  const [thumbnailCrop, setThumbnailCrop] = useState({ x: 0, y: 0 });
  const [thumbnailZoom, setThumbnailZoom] = useState(1);
  const [thumbnailRotation, setThumbnailRotation] = useState(0);
  const [thumbnailCropPixels, setThumbnailCropPixels] = useState(null);
  const [thumbnailApplying, setThumbnailApplying] = useState(false);
  const [thumbnailSourceName, setThumbnailSourceName] = useState("thumbnail");
  const [thumbnailSourceType, setThumbnailSourceType] = useState("image/jpeg");

  const resetThumbnailEditor = useCallback(() => {
    setIsThumbnailEditorOpen(false);
    setThumbnailCrop({ x: 0, y: 0 });
    setThumbnailZoom(1);
    setThumbnailRotation(0);
    setThumbnailCropPixels(null);
    setThumbnailSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const openThumbnailEditor = useCallback((file) => {
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      showToast("Please select an image file for thumbnail.", "error");
      return;
    }
    if (file.size > MAX_THUMBNAIL_SOURCE_SIZE) {
      showToast("Thumbnail source image is too large. Please choose an image under 25MB.", "error");
      return;
    }

    setError("");
    setThumbnailSourceName(file.name || "thumbnail");
    setThumbnailSourceType(file.type || "image/jpeg");
    const sourceUrl = URL.createObjectURL(file);
    setThumbnailSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return sourceUrl;
    });
    setThumbnailCrop({ x: 0, y: 0 });
    setThumbnailZoom(1);
    setThumbnailRotation(0);
    setThumbnailCropPixels(null);
    setIsThumbnailEditorOpen(true);
  }, [showToast, setError]);

  const handleThumbnailSelect = (file) => {
    if (!file) return;
    openThumbnailEditor(file);
  };

  const handleApplyThumbnail = async () => {
    if (!thumbnailSourceUrl || !thumbnailCropPixels) {
      setError("Adjust thumbnail and try again.");
      return;
    }

    setThumbnailApplying(true);
    try {
      const preferredType = ["image/png", "image/webp", "image/gif", "image/jpeg", "image/jpg"].includes(thumbnailSourceType)
        ? thumbnailSourceType.replace("image/jpg", "image/jpeg")
        : "image/jpeg";

      let outputType = preferredType;
      let croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, outputType);

      if (!croppedBlob && outputType !== "image/jpeg") {
        outputType = "image/jpeg";
        croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, outputType);
      }

      if (!croppedBlob) throw new Error("thumbnail-processing-failed");

      if (croppedBlob.size > MAX_THUMBNAIL_SIZE && outputType !== "image/jpeg") {
        outputType = "image/jpeg";
        croppedBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, outputType, 0.9);
      }

      if (croppedBlob?.size > MAX_THUMBNAIL_SIZE && outputType === "image/jpeg") {
        for (let quality = 0.82; quality >= 0.6; quality -= 0.08) {
          const retryBlob = await getCroppedThumbnailBlob(thumbnailSourceUrl, thumbnailCropPixels, thumbnailRotation, "image/jpeg", quality);
          if (retryBlob) croppedBlob = retryBlob;
          if (croppedBlob?.size <= MAX_THUMBNAIL_SIZE) break;
        }
      }

      if (croppedBlob.size > MAX_THUMBNAIL_SIZE) {
        setError("Processed thumbnail is still above 5MB. Crop a smaller area and retry.");
        return;
      }

      const baseName = (thumbnailSourceName || "thumbnail").replace(/\.[^/.]+$/, "");
      const ext = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : outputType === "image/gif" ? "gif" : "jpg";
      const processedFile = new File([croppedBlob], `${baseName}-cover.${ext}`, { type: outputType });
      setThumbnailFile(processedFile);
      setError("");
      resetThumbnailEditor();
    } catch (err) {
      setError(err?.message || "Could not process thumbnail. Please try another image.");
    } finally {
      setThumbnailApplying(false);
    }
  };

  return {
    isThumbnailEditorOpen,
    thumbnailSourceUrl,
    thumbnailCrop,
    setThumbnailCrop,
    thumbnailZoom,
    setThumbnailZoom,
    thumbnailRotation,
    setThumbnailRotation,
    thumbnailCropPixels,
    setThumbnailCropPixels,
    thumbnailApplying,
    resetThumbnailEditor,
    openThumbnailEditor,
    handleThumbnailSelect,
    handleApplyThumbnail,
  };
}
