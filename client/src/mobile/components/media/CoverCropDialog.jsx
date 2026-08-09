import Cropper from "react-easy-crop";
import Button from "../buttons/Button";
import Dialog from "../overlays/Dialog";
import "./Media.css";

/*
 * CoverCropDialog — framing the cover image (prefix: ckm-media, surface:
 * ckm-dialog).
 *
 * Shared by `/create-project` and `/upload`, which crop the same asset to the
 * same aspect against the same 5 MB ceiling. Written for the wizard on
 * 2026-08-09 and made prop-driven the same day (decision D12): it used to read
 * `CreateProjectContext` directly, which is why it could not be mounted on a
 * route that has no such context. The create-project caller now passes the same
 * twelve values through a four-line adapter, so nothing about the wizard's
 * behaviour changed — only where the values come from.
 *
 * The cropping itself is never re-implemented on either route: the *caller's*
 * `onApply` does the blob work, the quality step-down and the size ceiling, so a
 * cover produced on a phone is the same file a cover produced on a laptop is.
 *
 * WHAT IS DIFFERENT FROM DESKTOP, AND WHY
 * ---------------------------------------
 * 1. It is full-screen. Desktop gives the cropper a 380px box inside a 3xl
 *    modal; at 320px the same layout leaves the image about 180px tall, which is
 *    not enough of a face to judge a crop by. The dialog gives it the frame.
 *
 * 2. The two sliders are ordinary `<input type="range">`. That is deliberate,
 *    not a shortcut: a range input is draggable AND arrow-key operable AND
 *    announced with its value, which is three things a custom zoom control would
 *    have to rebuild. They are labelled and their live values are text, because
 *    "1.42x" read aloud is the only feedback a non-sighted user gets — though
 *    the honest note is that framing an image is a visual task and this surface
 *    cannot make it otherwise. The escape from that is Cancel, which is always
 *    available and always keeps the original file.
 *
 * 3. The pinch gesture is left to the library. `react-easy-crop` binds its own
 *    touch handlers, and the dialog's scroll lock (Phase 1's `useScrollLock`) is
 *    what stops a two-finger drag scrolling the page behind it instead.
 *
 * WHY IT CANNOT BE SKIPPED. Both routes open this for *every* chosen image —
 * there is no "use as-is" path on either platform, because the marketplace grid
 * needs a fixed-ratio cover and an un-cropped photo would be letterboxed into
 * it. Cancel therefore means "no cover", not "uncropped cover".
 */
export default function CoverCropDialog({
  open = false,
  imageUrl = "",
  aspect = 3 / 4,
  crop = { x: 0, y: 0 },
  zoom = 1,
  rotation = 0,
  applying = false,
  onCropChange = null,
  onZoomChange = null,
  onRotationChange = null,
  onCropComplete = null,
  onCancel = null,
  onApply = null,
  description = "Drag the image to choose what the marketplace card shows.",
}) {
  const isOpen = Boolean(open && imageUrl);

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      closeLabel="Cancel and keep no cover"
      title="Frame your cover"
      description={description}
      className="ckm-media__crop"
      bodyClassName="ckm-media__crop-body"
      footer={(
        <div className="ckm-media__crop-actions">
          <Button variant="secondary" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button pending={applying} onClick={onApply}>
            {applying ? "Saving cover…" : "Use this cover"}
          </Button>
        </div>
      )}
    >
      <div className="ckm-media__crop-stage">
        {/* Only mounted while open. The cropper measures its container on mount,
            and a hidden container measures zero — which is how a cropper opens
            showing a one-pixel image. */}
        {isOpen && (
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={0.1}
            rotation={rotation}
            aspect={aspect}
            showGrid
            objectFit="cover"
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            onCropComplete={(_, croppedAreaPixels) => onCropComplete?.(croppedAreaPixels)}
            /*
             * The crop area is `tabIndex={0}` with arrow-key handlers — it IS
             * keyboard-operable — but it ships unnamed, so a keyboard or switch
             * user reaches a focus stop that announces nothing. Found by the
             * 2026-08-09 sweep's unnamed-control leg. `cropperProps` is spread
             * onto that div last, which is the library's supported way in.
             */
            cropperProps={{
              "aria-label": "Cover crop area. Drag, or use the arrow keys, to choose what the cover shows.",
              role: "group",
            }}
          />
        )}
      </div>

      <div className="ckm-media__crop-controls">
        <label className="ckm-media__crop-control">
          <span className="ckm-media__crop-label">
            Zoom
            <output className="ckm-media__crop-value">{Number(zoom).toFixed(2)}×</output>
          </span>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => onZoomChange?.(Number(event.target.value))}
          />
        </label>

        <label className="ckm-media__crop-control">
          <span className="ckm-media__crop-label">
            Rotation
            <output className="ckm-media__crop-value">{Math.round(Number(rotation) || 0)}°</output>
          </span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(event) => onRotationChange?.(Number(event.target.value))}
          />
        </label>
      </div>
    </Dialog>
  );
}
