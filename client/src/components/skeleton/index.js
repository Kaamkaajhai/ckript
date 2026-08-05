/*
 * Skeleton system — public surface for the writer section.
 *
 * Primitives:   Skeleton, SkeletonText, SkeletonCircle, SkeletonButton,
 *               SkeletonScreen  (build any new page skeleton from these).
 * Page screens: ready-made, structure-matched placeholders per writer page.
 *
 * One "shade of white", one shimmer, theme + reduced-motion aware. See
 * ./skeleton.css for the visual tokens.
 */
export {
  default as Skeleton,
  Skeleton as SkeletonBone,
  SkeletonText,
  SkeletonCircle,
  SkeletonButton,
  SkeletonScreen,
} from "./Skeleton";

export { default as RouteFallback } from "./RouteFallback";
export { default as MessagesSkeleton } from "./MessagesSkeleton";
export { default as SearchSkeleton } from "./SearchSkeleton";
export { default as CollaborationHubSkeleton } from "./CollaborationHubSkeleton";
export { default as ScriptWorkbenchSkeleton } from "./ScriptWorkbenchSkeleton";
