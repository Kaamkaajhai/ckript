import { useCallback } from "react";

const KEYBOARD_STEP = 16;

const PanelResizeHandle = ({
  label,
  min,
  max,
  onResize,
  side,
  value,
}) => {
  const direction = side === "left" ? 1 : -1;

  const beginResize = useCallback((event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    const originX = event.clientX;
    const originWidth = value;
    const body = document.body;

    const finish = () => {
      body.classList.remove("ckr-is-resizing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };

    const move = (moveEvent) => {
      onResize(originWidth + ((moveEvent.clientX - originX) * direction));
    };

    body.classList.add("ckr-is-resizing");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }, [direction, onResize, value]);

  const onKeyDown = useCallback((event) => {
    let next;

    if (event.key === "Home") next = min;
    if (event.key === "End") next = max;
    if (event.key === "ArrowLeft") next = value - (KEYBOARD_STEP * direction);
    if (event.key === "ArrowRight") next = value + (KEYBOARD_STEP * direction);
    if (next === undefined) return;

    event.preventDefault();
    onResize(next);
  }, [direction, max, min, onResize, value]);

  return (
    <div
      className={`ckr-resizer ckr-resizer--${side}`}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      title={`${label}. Drag or use the arrow keys.`}
      tabIndex={0}
      onPointerDown={beginResize}
      onKeyDown={onKeyDown}
    >
      <span aria-hidden="true" />
    </div>
  );
};

export default PanelResizeHandle;
