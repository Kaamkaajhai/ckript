import { Component, Suspense } from "react";
import { useLocation } from "react-router-dom";
import "./MobileRouteBoundary.css";

/*
 * MobileRouteBoundary — the route-level suspense + error contract (plan §11,
 * Phase 0). Every lazily loaded mobile screen mounts inside one of these so:
 *
 *   • a chunk that is still downloading shows a stable, non-shifting pending
 *     state instead of a blank frame or a boot skeleton that reads as a stall;
 *   • a screen that throws degrades to a recoverable error *inside* the shell
 *     — the app chrome survives, and the user gets a real retry rather than a
 *     white page;
 *   • navigating to another URL clears a previous failure, because a broken
 *     screen must not poison the next route.
 */

class MobileErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // resetKey is the pathname: a new route always starts clean.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
    if (import.meta.env?.DEV) {
      console.error("[mobile] screen failed to render", error, info);
    }
  }

  retry() {
    this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="ckm-shell__failure" role="alert">
        <span className="material-symbols-outlined ckm-shell__failure-icon" aria-hidden="true">
          error
        </span>
        <h1 className="ckm-shell__failure-title">This screen didn’t load</h1>
        <p className="ckm-shell__failure-body">
          Something went wrong on our side. Your work is safe — try again.
        </p>
        <button type="button" className="ckm-shell__failure-action" onClick={this.retry}>
          Try again
        </button>
      </div>
    );
  }
}

/* Pending state: chrome-shaped blocks, sized so the real screen swapping in
   causes no layout shift. Never animated under reduced motion (base.css). */
export function MobileRoutePending() {
  return (
    <div className="ckm-shell__pending" role="status" aria-live="polite">
      <span className="ckm-shell__pending-label">Loading…</span>
      <div className="ckm-shell__pending-bar ckm-shell__pending-bar--wide" aria-hidden="true" />
      <div className="ckm-shell__pending-bar" aria-hidden="true" />
      <div className="ckm-shell__pending-block" aria-hidden="true" />
      <div className="ckm-shell__pending-block" aria-hidden="true" />
    </div>
  );
}

export default function MobileRouteBoundary({ children, fallback, onError }) {
  const { pathname } = useLocation();

  return (
    <MobileErrorBoundary resetKey={pathname} onError={onError}>
      <Suspense fallback={fallback ?? <MobileRoutePending />}>{children}</Suspense>
    </MobileErrorBoundary>
  );
}
