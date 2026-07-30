import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "./OverlayScrollArea.css";

const MIN_THUMB_HEIGHT = 28;

/**
 * A visual overlay for a real browser scroll container. Scrolling remains
 * native; only the scrollbar UI is rendered here so its appearance is stable
 * across browsers.
 */
const OverlayScrollArea = ({
  children,
  className = "",
  viewportClassName = "",
  ariaLabel,
}) => {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const dragRef = useRef(null);
  const frameRef = useRef(null);
  const geometryRef = useRef({ maxScrollTop: 0, maxThumbTop: 0 });
  const [isOverflowing, setIsOverflowing] = useState(false);

  const updateThumb = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;

    if (!viewport || !track || !thumb) return;

    const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
    const overflowing = maxScrollTop > 1;
    setIsOverflowing((current) => (
      current === overflowing ? current : overflowing
    ));

    if (!overflowing) {
      geometryRef.current = { maxScrollTop: 0, maxThumbTop: 0 };
      return;
    }

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB_HEIGHT,
      (viewport.clientHeight / viewport.scrollHeight) * trackHeight,
    );
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = maxScrollTop
      ? (viewport.scrollTop / maxScrollTop) * maxThumbTop
      : 0;

    geometryRef.current = { maxScrollTop, maxThumbTop };
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }, []);

  const scheduleThumbUpdate = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      updateThumb();
    });
  }, [updateThumb]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return undefined;

    const observer = new ResizeObserver(scheduleThumbUpdate);
    observer.observe(viewport);
    observer.observe(content);
    updateThumb();

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [scheduleThumbUpdate, updateThumb]);

  const handleTrackPointerDown = (event) => {
    if (event.target !== event.currentTarget) return;

    const viewport = viewportRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    const { maxScrollTop, maxThumbTop } = geometryRef.current;
    if (!viewport || !track || !thumb || !maxThumbTop) return;

    const trackRect = track.getBoundingClientRect();
    const thumbHeight = thumb.getBoundingClientRect().height;
    const nextThumbTop = Math.min(
      maxThumbTop,
      Math.max(0, event.clientY - trackRect.top - (thumbHeight / 2)),
    );
    viewport.scrollTop = (nextThumbTop / maxThumbTop) * maxScrollTop;
  };

  const handleThumbPointerDown = (event) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    const { maxScrollTop, maxThumbTop } = geometryRef.current;
    if (!viewport || !maxThumbTop) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: viewport.scrollTop,
      scrollRatio: maxScrollTop / maxThumbTop,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleThumbPointerMove = (event) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) return;

    viewport.scrollTop = drag.startScrollTop
      + ((event.clientY - drag.startY) * drag.scrollRatio);
  };

  const endThumbDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className={`ck-overlay-scroll ${className}`}>
      <div
        ref={viewportRef}
        className={`ck-overlay-scroll__viewport ${viewportClassName}`}
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={scheduleThumbUpdate}
      >
        <div ref={contentRef} className="ck-overlay-scroll__content">
          {children}
        </div>
      </div>

      <div
        ref={trackRef}
        className={`ck-overlay-scroll__bar${isOverflowing ? " is-visible" : ""}`}
        aria-hidden="true"
        onPointerDown={handleTrackPointerDown}
      >
        <div
          ref={thumbRef}
          className="ck-overlay-scroll__thumb"
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={endThumbDrag}
          onPointerCancel={endThumbDrag}
        />
      </div>
    </div>
  );
};

export default OverlayScrollArea;
