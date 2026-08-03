/**
 * The admin UI kit — the one import surface for every redesigned admin screen.
 *
 *   import { Button, Field, Input, DataTable, useToast } from "../admin/ui";
 *
 * The two stylesheets load here, once, so a screen can never import a component without its styles
 * — the cold-load unstyled-component bug the /challenges page hit is structurally impossible.
 */
import "./tokens.css";
import "./primitives.css";
import "./datatable.css";

export { default as Button } from "./Button";
export { default as DataTable } from "./DataTable";
export { default as SectionHeader } from "./SectionHeader";
export { Field, Input, Textarea, Select, SearchInput } from "./fields";
export { Badge, StatusPill } from "./Badge";
export { Dialog, ConfirmDialog, Drawer } from "./overlays";
export { ToastProvider } from "./Toast";
export { useToast } from "./toastContext";
export {
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonText,
  SkeletonTable,
  Spinner,
} from "./feedback";
