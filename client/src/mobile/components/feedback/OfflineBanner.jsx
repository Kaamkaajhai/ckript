import Icon from "../Icon";
import useOnlineStatus from "../../hooks/useOnlineStatus";
import "./OfflineBanner.css";

/*
 * OfflineBanner — connectivity as a condition, not an event (prefix: ckm-offline).
 *
 * Rendered by MobileShell, so every screen inherits it by adopting the shell —
 * the same contract §5.6 already uses for scroll-depth analytics. A screen never
 * mounts this itself, and there is therefore never a second one.
 *
 * Why this is a banner and not a toast: the toast/inline split is that a toast
 * reports something that HAPPENED and an inline message reports something that
 * IS. Losing connectivity is a state that persists, so a surface that fades
 * after five seconds is the wrong shape for it — the user would be told once,
 * at the moment they were least likely to be looking, and then left to guess.
 *
 * The wording is chosen to match what is actually known (see useOnlineStatus):
 * "appear to be offline" because `navigator.onLine === false` is a strong hint
 * and not a proof, and "your device is back online" rather than "you're
 * reconnected", because the property speaks for the device's network interface
 * and says nothing about whether Ckript's server can be reached. The retry is
 * offered rather than performed for the same reason.
 */
export default function OfflineBanner({ onRetry = null }) {
  const { online, recovered, acknowledge } = useOnlineStatus();

  const state = !online ? "offline" : recovered ? "recovered" : null;

  const handleRetry = () => {
    acknowledge();
    onRetry?.();
  };

  return (
    /*
     * The region is always here and usually empty. A live region that is created
     * at the same moment its content arrives is routinely missed by screen
     * readers; one that already existed and then changed is not. role="status"
     * rather than "alert" — losing signal is not the user's error and does not
     * deserve to cut off whatever is being read aloud.
     */
    <div className="ckm-offline" role="status">
      {state && (
        <div className={`ckm-offline__bar ckm-offline__bar--${state}`}>
          <span className="ckm-offline__icon">
            <Icon name={state === "offline" ? "cloud_off" : "cloud_done"} size={20} />
          </span>

          <p className="ckm-offline__text">
            {state === "offline"
              ? "You appear to be offline. Recent changes may not have been saved."
              : "Your device is back online."}
          </p>

          {state === "recovered" && (
            <button type="button" className="ckm-offline__action" onClick={handleRetry}>
              {onRetry ? "Retry" : "Dismiss"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
