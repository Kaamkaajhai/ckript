// @vitest-environment happy-dom
import { act, createRef, forwardRef, useImperativeHandle } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAiGeneration } from "./useAiGeneration";

const post = vi.fn();
vi.mock("../../../services/api", () => ({ default: { post: (...args) => post(...args) } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let probeRef;

const Probe = forwardRef(function Probe(props, ref) {
  const value = useAiGeneration(props);
  useImperativeHandle(ref, () => value, [value]);
  return null;
});

const baseProps = (overrides = {}) => ({
  editor: {},
  getEditorPlainText: () => "A sufficiently long screenplay passage. ".repeat(4),
  scriptId: "script-1",
  title: "The Four O'Clock Train",
  formData: { primaryGenre: "Drama", format: "film" },
  setFormData: vi.fn(),
  setRoles: vi.fn(),
  setPublishingDetails: vi.fn(),
  setSaved: vi.fn(),
  setError: vi.fn(),
  user: { subscription: { plan: "gold" } },
  showToast: vi.fn(),
  openPricingModal: vi.fn(),
  ...overrides,
});

const mount = (props) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  probeRef = createRef();
  act(() => root.render(<Probe ref={probeRef} {...props} />));
};

beforeEach(() => post.mockReset());

afterEach(() => {
  if (root) act(() => root.unmount());
  document.body.innerHTML = "";
  probeRef = undefined;
});

describe("metadata AI entitlement", () => {
  it("locks a free writer locally and offers the pricing action", async () => {
    const props = baseProps({ user: { subscription: { plan: "free" } } });
    mount(props);

    await act(async () => { await probeRef.current.handleGenerateMetadata("logline"); });

    expect(post).not.toHaveBeenCalled();
    const [, tone, action] = props.showToast.mock.calls[0];
    expect(tone).toBe("warning");
    action.onClick();
    expect(props.openPricingModal).toHaveBeenCalledWith("writer");
  });

  it.each(["silver", "gold", "diamond", "pro", "enterprise"])(
    "allows metadata generation for the %s paid plan",
    async (plan) => {
      post.mockResolvedValue({ data: { logline: "A generated logline." } });
      const props = baseProps({ user: { subscription: { plan } } });
      mount(props);

      await act(async () => { await probeRef.current.handleGenerateMetadata("logline"); });

      expect(post).toHaveBeenCalledWith("/ai/generate-metadata", expect.objectContaining({
        fields: ["logline"],
      }));
      expect(props.setFormData).toHaveBeenCalledTimes(1);
      expect(props.setSaved).toHaveBeenCalledWith(false);
    }
  );
});
