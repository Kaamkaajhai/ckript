import {
  ArrowDown,
  Check,
  ChevronDown,
  CircleAlert,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Search,
  SlidersHorizontal,
  UserSearch,
  Users,
  X,
} from "lucide-react";

const ICONS = Object.freeze({
  arrowDown: ArrowDown,
  check: Check,
  chevronDown: ChevronDown,
  close: X,
  error: CircleAlert,
  filters: SlidersHorizontal,
  hideFilters: PanelLeftClose,
  hideProfile: PanelRightClose,
  lock: Lock,
  refresh: RefreshCw,
  search: Search,
  showFilters: PanelLeftOpen,
  showProfile: PanelRightOpen,
  userSearch: UserSearch,
  users: Users,
});

const RosterIcon = ({ name, className = "", size, strokeWidth = 1.8 }) => {
  const Icon = ICONS[name];
  if (!Icon) return null;

  return (
    <Icon
      className={`ckr-icon${className ? ` ${className}` : ""}`}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
    />
  );
};

export default RosterIcon;
