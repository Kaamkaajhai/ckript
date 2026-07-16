/**
 * WriterModelBadge
 *
 * Displays a badge for writers based on their subscription plan.
 */

import darkSilverBadge from "../assets/darksilver-badge-writer.png";
import goldenBadge from "../assets/bettergolden-badge-writer.png";

// Map the plan names to the custom badge images uploaded by the user
const BADGE_IMAGES = {
  silver: darkSilverBadge,
  gold: goldenBadge,
  premium: goldenBadge, // Fallback to gold if premium badge is not present
};

const WriterModelBadge = ({ plan, size = "md", dark = false }) => {
  const normalizedPlan = String(plan || "silver").toLowerCase();
  const badgeSrc = BADGE_IMAGES[normalizedPlan] || BADGE_IMAGES.silver;

  // Render the badge using the user-provided images
  // The images are likely pre-styled with their own luxury aesthetic
  return (
    <span className="relative inline-flex items-center select-none ml-2">
      <img
        src={badgeSrc}
        alt={`${normalizedPlan} badge`}
        className="object-contain"
        style={{
          height: size === "sm" ? "20px" : size === "md" ? "24px" : "28px", // Adjust height to scale properly
          filter: dark ? "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))" : "drop-shadow(0px 1px 3px rgba(0,0,0,0.2))",
        }}
      />
    </span>
  );
};

export default WriterModelBadge;
