import { useEffect } from "react";

const ConfirmDialog = ({
  open,
  title = "Confirm action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDarkMode = false,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div
        className={`relative w-[min(92vw,430px)] rounded-2xl border p-5 shadow-2xl ${
          isDarkMode
            ? "bg-[#141414]/95 border-[#242424] text-[#f5f2eb]"
            : "bg-white border-gray-200 text-gray-900"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4">
          <p className={`text-base font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{title}</p>
          <p className={`mt-1.5 text-sm leading-relaxed ${isDarkMode ? "text-[#cfccc5]" : "text-gray-600"}`}>
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              isDarkMode ? "text-[#cfccc5] hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {cancelText}
          </button>
          {/* Primary is ink, not coral — coral only reaches 4.35:1 and can't carry button text.
              This button had no light-mode branch at all, so it painted the old navy inside the
              warm dashboard shell; and on the dark card ink has to invert or it vanishes into the
              surface, the same trick challenge.css and MainLayout use. */}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              isDarkMode
                ? "bg-[#f5f2eb] text-[#12110f] hover:bg-white"
                : "bg-[#161513] text-white hover:bg-[#2c2a26]"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;