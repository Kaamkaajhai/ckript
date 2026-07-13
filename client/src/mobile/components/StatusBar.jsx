import Icon from "./Icon";
import "./StatusBar.css";

/*
 * StatusBar — the faux iOS status row (time + signal/wifi/battery).
 * On a real device the OS draws this behind the notch; we render our own so
 * the design reads as a self-contained "app" in the browser too. The live
 * clock keeps it feeling native rather than frozen at 9:41.
 */
export default function StatusBar({ time }) {
  return (
    <div className="ckm-statusbar">
      <span className="ckm-statusbar__time">{time}</span>
      <div className="ckm-statusbar__icons">
        <Icon name="signal_cellular_alt" size={17} />
        <Icon name="wifi" size={17} />
        <Icon name="battery_full" size={19} />
      </div>
    </div>
  );
}
