/*
 * SaveButton — the one watchlist control on this page, in three shapes.
 *
 * Wraps the shared useScriptBookmark hook so the lead, the shelf cards and the
 * detail sheet all toggle through the same request, the same optimistic
 * AuthContext update and the same `bookmarkUpdated` event. The page listens for
 * that event to raise its toast, which is why nothing here takes a callback.
 *
 * The hook reports `canBookmark: false` for a signed-out visitor and for a
 * writer looking at their own project; in both cases the control is not
 * rendered rather than shown disabled.
 */
import useScriptBookmark from "../../../hooks/useScriptBookmark";
import FeaturedIcon from "./FeaturedIcon";

const SaveButton = ({ script, variant = "card" }) => {
  const { isBookmarked, canBookmark, pending, toggleBookmark } = useScriptBookmark(script);

  if (!canBookmark) return null;

  const label = isBookmarked ? "Remove from watchlist" : "Add to watchlist";

  if (variant === "text") {
    return (
      <button
        type="button"
        className="fbp-btn fbp-btn--quiet"
        onClick={toggleBookmark}
        aria-pressed={isBookmarked}
        disabled={pending}
      >
        {isBookmarked ? "Saved" : "Save"}
      </button>
    );
  }

  const className = variant === "lead"
    ? `fbp-iconbtn fbp-iconbtn--lg${isBookmarked ? " is-on" : ""}`
    : `fbp-card__save${isBookmarked ? " is-on" : ""}`;

  return (
    <button
      type="button"
      className={className}
      onClick={toggleBookmark}
      aria-pressed={isBookmarked}
      aria-label={label}
      title={label}
      disabled={pending}
    >
      <FeaturedIcon name="favorite" fill={isBookmarked} />
    </button>
  );
};

export default SaveButton;
