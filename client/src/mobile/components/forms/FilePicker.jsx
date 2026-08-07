import { useId, useRef } from "react";
import Icon from "../Icon";
import IconButton from "../buttons/IconButton";
import { formatFileSize } from "./formatFileSize";
import "./FilePicker.css";

/*
 * FilePicker — choose one or more files (prefix: ckm-file-picker).
 *
 * Three things make this different from the desktop control:
 *
 *  1. The native <input type="file"> button is unstyleable and, on a phone,
 *     tiny. So the input is visually hidden but kept focusable, and a real
 *     labelled trigger sits on top of it — the label's `for` binding is what
 *     opens the picker, so no click is synthesised.
 *  2. On iOS and Android the picker offers Camera / Photo Library / Files
 *     based on `accept`. Passing a precise `accept` is therefore a UX
 *     decision, not just validation — it decides which of those the user is
 *     offered.
 *  3. A chosen file must be removable. On desktop a user re-opens the dialog;
 *     on a phone, having to reselect to correct a mistake is a dead end, so
 *     each selection gets its own remove control.
 *
 * Size and type validation belong to the caller (the same rules the desktop
 * upload already enforces) — this primitive reports the selection and renders
 * whatever error it is handed.
 */
export default function FilePicker({
  label,
  hint = "",
  error = "",
  required = false,
  accept = undefined,
  multiple = false,
  capture = undefined,
  files = [],
  onSelect = undefined,
  onRemove = undefined,
  buttonLabel = "Choose file",
  disabled = false,
  className = "",
  ...rest
}) {
  const id = useId();
  const inputRef = useRef(null);
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const handleChange = (event) => {
    onSelect?.(Array.from(event.target.files || []), event);
  };

  const handleRemove = (file, index) => {
    // The input keeps its own FileList, which would otherwise re-submit a file
    // the user just removed and refuse to re-fire change for the same name.
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.(file, index);
  };

  return (
    <div className={["ckm-file-picker", error ? "is-invalid" : "", className].filter(Boolean).join(" ")}>
      <span className="ckm-field__label">
        <span className="ckm-field__label-text">{label}</span>
        {required && <span className="ckm-field__flag">Required</span>}
      </span>

      <label className="ckm-file-picker__trigger" htmlFor={id}>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="ckm-file-picker__input"
          accept={accept}
          multiple={multiple}
          capture={capture}
          required={required && files.length === 0}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={handleChange}
          {...rest}
        />
        <Icon className="ckm-file-picker__trigger-icon" name="upload_file" size={22} />
        <span className="ckm-file-picker__trigger-text">{buttonLabel}</span>
      </label>

      {files.length > 0 && (
        <ul className="ckm-file-picker__list">
          {files.map((file, index) => (
            <li className="ckm-file-picker__item" key={`${file.name}-${index}`}>
              <Icon className="ckm-file-picker__item-icon" name="description" size={20} />
              <span className="ckm-file-picker__item-text">
                <span className="ckm-file-picker__item-name">{file.name}</span>
                {typeof file.size === "number" && (
                  <span className="ckm-file-picker__item-size">{formatFileSize(file.size)}</span>
                )}
              </span>
              {onRemove && (
                <IconButton
                  icon="close"
                  label={`Remove ${file.name}`}
                  size="sm"
                  onClick={() => handleRemove(file, index)}
                  disabled={disabled}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {hint && !error && <p className="ckm-field__hint" id={hintId}>{hint}</p>}
      {error && (
        <p className="ckm-field__error" id={errorId} role="alert">
          <span className="material-symbols-outlined ckm-field__error-icon" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  );
}
