// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonButton,
  SkeletonScreen,
  RouteFallback,
  MessagesSkeleton,
  SearchSkeleton,
  CollaborationHubSkeleton,
  ScriptWorkbenchSkeleton,
} from "./index";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(el) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
  return container;
}

describe("skeleton primitives", () => {
  it("renders a base bone with px dimensions and decorative aria", () => {
    const el = mount(<Skeleton w={120} h={12} />);
    const bone = el.querySelector(".ck-sk");
    expect(bone).toBeTruthy();
    expect(bone.getAttribute("aria-hidden")).toBe("true");
    expect(bone.style.width).toBe("120px");
    expect(bone.style.height).toBe("12px");
  });

  it("passes through CSS-length strings verbatim", () => {
    const el = mount(<Skeleton w="80%" h="2rem" radius={4} />);
    const bone = el.querySelector(".ck-sk");
    expect(bone.style.width).toBe("80%");
    expect(bone.style.height).toBe("2rem");
  });

  it("renders SkeletonText with the requested number of lines", () => {
    const el = mount(<SkeletonText lines={4} />);
    expect(el.querySelectorAll(".ck-sk").length).toBe(4);
  });

  it("renders circle and button helpers", () => {
    const el = mount(
      <div>
        <SkeletonCircle size={48} />
        <SkeletonButton />
      </div>
    );
    expect(el.querySelector(".ck-sk--circle")).toBeTruthy();
    expect(el.querySelectorAll(".ck-sk").length).toBe(2);
  });
});

describe("SkeletonScreen", () => {
  it("owns the aria-busy + polite live status and supports a custom tag", () => {
    const el = mount(
      <SkeletonScreen as="main" tone="cool" label="Loading things…">
        <Skeleton w={10} h={10} />
      </SkeletonScreen>
    );
    const main = el.querySelector("main.ck-sk-screen");
    expect(main).toBeTruthy();
    expect(main.getAttribute("aria-busy")).toBe("true");
    expect(main.classList.contains("ck-sk-tone-cool")).toBe(true);
    const status = main.querySelector('[role="status"][aria-live="polite"]');
    expect(status.textContent).toBe("Loading things…");
  });
});

describe("page skeletons render without error and announce loading", () => {
  const cases = [
    ["RouteFallback", <RouteFallback key="r" />],
    ["MessagesSkeleton", <MessagesSkeleton key="m" dark={false} />],
    ["MessagesSkeleton dark", <MessagesSkeleton key="md" dark />],
    ["SearchSkeleton", <SearchSkeleton key="s" />],
    ["CollaborationHubSkeleton", <CollaborationHubSkeleton key="c" dark={false} />],
    ["ScriptWorkbenchSkeleton", <ScriptWorkbenchSkeleton key="w" dark />],
  ];

  it.each(cases)("%s mounts with aria-busy and bones", (_name, element) => {
    const el = mount(element);
    expect(el.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    expect(el.querySelectorAll(".ck-sk").length).toBeGreaterThan(4);
  });
});
