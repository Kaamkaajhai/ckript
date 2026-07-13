import StatusBar from "./StatusBar";
import "./Skeleton.css";

/*
 * Skeleton — the initial-load placeholder (reference screen 06). Shown for a
 * brief beat while the dashboard mounts so the first paint feels intentional
 * rather than blank. Mirrors the real layout: header, tab strip, hero and a
 * pair of stat tiles, all softly pulsing.
 */
export default function Skeleton({ time = "9:41" }) {
  return (
    <div className="ckm-skel">
      <StatusBar time={time} />
      <div className="ckm-skel__topbar">
        <div className="ckm-skel__logo" />
        <div className="ckm-skel__search" />
        <div className="ckm-skel__avatar" />
      </div>
      <div className="ckm-skel__tabs">
        <div className="ckm-skel__tab is-live" />
        <div className="ckm-skel__tab" />
        <div className="ckm-skel__tab" />
        <div className="ckm-skel__tab" />
      </div>
      <div className="ckm-skel__body">
        <div className="ckm-skel__block" style={{ height: 56, borderRadius: 14 }} />
        <div className="ckm-skel__block" style={{ height: 150, borderRadius: 16, marginTop: 16 }} />
        <div className="ckm-skel__block" style={{ height: 26, width: "60%", borderRadius: 8, marginTop: 22 }} />
        <div className="ckm-skel__row">
          <div className="ckm-skel__block" style={{ flex: 1, height: 70, borderRadius: 12 }} />
          <div className="ckm-skel__block" style={{ flex: 1, height: 70, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}
