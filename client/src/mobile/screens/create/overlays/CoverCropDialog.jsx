import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import SharedCoverCropDialog from "../../../components/media/CoverCropDialog";
import { THUMBNAIL_ASPECT } from "../../../../pages/CreateProject/lib/imageCrop";

/*
 * The wizard's binding for the shared cover cropper.
 *
 * The dialog itself lives in `mobile/components/media/CoverCropDialog.jsx` and
 * is prop-driven, because `/upload` needs the same surface and has no
 * `CreateProjectContext` to read (decision D12, 2026-08-09). This file is the
 * whole difference between the two routes: which orchestrator's state and which
 * orchestrator's `handleApplyThumbnail` the sliders drive.
 *
 * Everything that decides what the *file* becomes — the aspect, the blob work,
 * the quality step-down, the 5 MB ceiling — stays in `useThumbnailEditor` and
 * `lib/imageCrop`, which is why a cover cropped here is byte-identical to one
 * cropped on the desktop page.
 */
export default function CoverCropDialog() {
  const {
    isThumbnailEditorOpen, thumbnailSourceUrl, thumbnailCrop, setThumbnailCrop,
    thumbnailZoom, setThumbnailZoom, thumbnailRotation, setThumbnailRotation,
    setThumbnailCropPixels, thumbnailApplying, resetThumbnailEditor, handleApplyThumbnail,
  } = useCreateProject();

  return (
    <SharedCoverCropDialog
      open={isThumbnailEditorOpen}
      imageUrl={thumbnailSourceUrl}
      aspect={THUMBNAIL_ASPECT}
      crop={thumbnailCrop}
      zoom={thumbnailZoom}
      rotation={thumbnailRotation}
      applying={thumbnailApplying}
      onCropChange={setThumbnailCrop}
      onZoomChange={setThumbnailZoom}
      onRotationChange={setThumbnailRotation}
      onCropComplete={setThumbnailCropPixels}
      onCancel={resetThumbnailEditor}
      onApply={handleApplyThumbnail}
      description="Drag the image to choose what the marketplace card shows. Covers are 3:4."
    />
  );
}
