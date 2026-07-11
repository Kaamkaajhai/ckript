import { useEffect, useRef, useState } from "react";
import { MAX_TRAILER_SIZE } from "../constants";

/**
 * Owns the two client-side video uploads on the wizard: the trailer and the
 * pitch video. Each has a File, an object-URL preview, and probed metadata
 * (duration/width/height) loaded off an offscreen <video>. Validation is
 * per-video (trailer <= 250MB any video; pitch <= 90MB, specific types, and
 * <= 90s). The parent still consumes trailerFile/pitchVideoFile at save.
 */
export function useVideoUploads({ setError }) {
  const [trailerFile, setTrailerFile] = useState(null);
  const [trailerPreviewUrl, setTrailerPreviewUrl] = useState("");
  const [trailerMeta, setTrailerMeta] = useState(null);
  const [trailerMetaLoading, setTrailerMetaLoading] = useState(false);
  const [pitchVideoFile, setPitchVideoFile] = useState(null);
  const [pitchVideoPreviewUrl, setPitchVideoPreviewUrl] = useState("");
  const [pitchVideoMeta, setPitchVideoMeta] = useState(null);
  const [pitchVideoMetaLoading, setPitchVideoMetaLoading] = useState(false);
  const trailerInputRef = useRef(null);
  const pitchVideoInputRef = useRef(null);

  const handleTrailerSelect = (file) => {
    if (!file) return;

    if (!file.type?.startsWith("video/")) {
      setError("Please select a valid video file for trailer.");
      return;
    }

    if (file.size > MAX_TRAILER_SIZE) {
      setError("Trailer must be under 250MB for high-quality upload.");
      return;
    }

    setTrailerFile(file);
    setError("");
  };

  useEffect(() => {
    // Syncs derived preview URL + probed video metadata to the selected File
    // (an external-system effect); the synchronous resets here are intentional.
    if (!trailerFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrailerPreviewUrl("");
      setTrailerMeta(null);
      setTrailerMetaLoading(false);
      return;
    }

    const previewUrl = URL.createObjectURL(trailerFile);
    setTrailerPreviewUrl(previewUrl);
    setTrailerMeta(null);
    setTrailerMetaLoading(true);

    let active = true;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;

    video.onloadedmetadata = () => {
      if (!active) return;
      setTrailerMeta({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
      setTrailerMetaLoading(false);
    };

    video.onerror = () => {
      if (!active) return;
      setTrailerMetaLoading(false);
      setTrailerMeta(null);
    };

    return () => {
      active = false;
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(previewUrl);
    };
  }, [trailerFile]);

  const handlePitchVideoSelect = (file) => {
    if (!file) return;
    const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm", "video/x-m4v"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a valid video file (MP4, MPEG, MOV, or WebM) for the pitch video.");
      return;
    }
    if (file.size > 90 * 1024 * 1024) {
      setError("Pitch video must be under 90MB.");
      return;
    }
    setPitchVideoFile(file);
    setError("");
  };

  useEffect(() => {
    if (!pitchVideoFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPitchVideoPreviewUrl("");
      setPitchVideoMeta(null);
      setPitchVideoMetaLoading(false);
      return;
    }
    const previewUrl = URL.createObjectURL(pitchVideoFile);
    setPitchVideoPreviewUrl(previewUrl);
    setPitchVideoMeta(null);
    setPitchVideoMetaLoading(true);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;
    video.onloadedmetadata = () => {
      if (video.duration > 90) {
        setError("Pitch video must be 1 minute 30 seconds (90 seconds) or less.");
        setPitchVideoFile(null);
        setPitchVideoPreviewUrl("");
        setPitchVideoMeta(null);
        setPitchVideoMetaLoading(false);
        URL.revokeObjectURL(previewUrl);
        return;
      }
      setPitchVideoMeta({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
      });
      setPitchVideoMetaLoading(false);
    };
    video.onerror = () => {
      setPitchVideoMetaLoading(false);
      setPitchVideoMeta(null);
    };
    return () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(previewUrl);
    };
  }, [pitchVideoFile, setError]);

  return {
    trailerFile,
    setTrailerFile,
    trailerPreviewUrl,
    setTrailerPreviewUrl,
    trailerMeta,
    setTrailerMeta,
    trailerMetaLoading,
    setTrailerMetaLoading,
    trailerInputRef,
    handleTrailerSelect,
    pitchVideoFile,
    setPitchVideoFile,
    pitchVideoPreviewUrl,
    setPitchVideoPreviewUrl,
    pitchVideoMeta,
    setPitchVideoMeta,
    pitchVideoMetaLoading,
    setPitchVideoMetaLoading,
    pitchVideoInputRef,
    handlePitchVideoSelect,
  };
}
