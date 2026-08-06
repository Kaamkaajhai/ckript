import {
  ArrowLeftRight,
  ArrowRight,
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Film,
  FilterX,
  Flag,
  Heart,
  Info,
  Play,
  Search,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-react";

const ICONS = Object.freeze({
  arrowForward: ArrowRight,
  checkCircle: CircleCheck,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  close: X,
  emptyProjects: Film,
  error: CircleAlert,
  favorite: Heart,
  filterOff: FilterX,
  flag: Flag,
  info: Info,
  play: Play,
  promote: Zap,
  search: Search,
  spotlight: Award,
  swap: ArrowLeftRight,
  tune: SlidersHorizontal,
  verified: BadgeCheck,
});

const FeaturedIcon = ({ name, className = "", fill = false, strokeWidth = 1.8 }) => {
  const Icon = ICONS[name];
  if (!Icon) return null;

  return (
    <Icon
      className={`fbp-icon${className ? ` ${className}` : ""}`}
      fill={fill ? "currentColor" : "none"}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    />
  );
};

export default FeaturedIcon;
