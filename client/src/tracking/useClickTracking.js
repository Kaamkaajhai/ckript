import { useEffect } from "react";
import { sendTrackEvent } from "./analyticsClient";
import { hasConsent } from "./storage";
import { getUserContext } from "./userContext";

const normalizeText = (value, max = 120) => String(value || "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, max);

const firstNonEmpty = (...values) => values.find((item) => normalizeText(item));

const getNodeLabel = (node) => {
  if (!(node instanceof Element)) return "";

  const svgTitle = node.querySelector?.("svg title")?.textContent;
  return normalizeText(
    firstNonEmpty(
      node.getAttribute("data-track-label"),
      node.getAttribute("aria-label"),
      node.getAttribute("title"),
      node.getAttribute("name"),
      node.getAttribute("value"),
      node.getAttribute("alt"),
      svgTitle,
      node.textContent
    ),
    140
  );
};

const getSectionLabel = (target) => {
  if (!(target instanceof Element)) return "General";

  const sectionNode = target.closest("[data-track-section], section, article, main, nav, aside, header, footer, form, dialog");
  if (!sectionNode) return "General";

  const heading = sectionNode.querySelector?.("h1, h2, h3, h4, legend, [data-section-title]")?.textContent;
  const sectionLabel = firstNonEmpty(
    sectionNode.getAttribute("data-track-section"),
    heading,
    sectionNode.getAttribute("aria-label"),
    sectionNode.id ? `#${sectionNode.id}` : "",
    sectionNode.classList?.[0] ? `.${sectionNode.classList[0]}` : ""
  );

  return normalizeText(sectionLabel || "General", 120) || "General";
};

const getElementDescriptor = (target) => {
  if (!(target instanceof Element)) {
    return {
      element: "unknown",
      text: "",
      buttonLabel: "Unknown",
      section: "General",
    };
  }

  const interactive = target.closest("button, a, [role='button'], [data-track-action], input, textarea");
  const node = interactive || target;

  const tag = node.tagName?.toLowerCase() || "element";
  const id = node.id ? `#${node.id}` : "";
  const className = node.classList?.[0] ? `.${node.classList[0]}` : "";
  const action = node.getAttribute("data-track-action");
  const role = node.getAttribute("role");
  const nameHint = node.getAttribute("name") || node.getAttribute("aria-label") || node.getAttribute("title") || "";

  const text = normalizeText(
    firstNonEmpty(node.textContent, node.getAttribute("aria-label"), node.getAttribute("title")),
    120
  );

  const buttonLabel = getNodeLabel(node) || normalizeText(`${tag}${id}${className}`) || "Unknown";
  const section = getSectionLabel(target);

  const labelParts = [`${tag}${id}${className}`];
  if (action) labelParts.push(`action:${action}`);
  if (role) labelParts.push(`role:${role}`);
  if (nameHint) labelParts.push(`name:${String(nameHint).trim().slice(0, 40)}`);

  return {
    element: labelParts.join(" | "),
    text,
    buttonLabel,
    section,
  };
};

export const useClickTracking = ({ user, enabled = false } = {}) => {
  useEffect(() => {
    if (!enabled || !hasConsent()) return;

    let lastTrackAt = 0;

    const onClick = (event) => {
      const now = Date.now();
      if (now - lastTrackAt < 160) return;
      lastTrackAt = now;

      const { element, text, buttonLabel, section } = getElementDescriptor(event.target);
      const path = `${window.location.pathname}${window.location.search}`;

      void sendTrackEvent({
        eventType: "click",
        path,
        element,
        elementText: text,
        clickLabel: buttonLabel,
        sectionLabel: section,
        x: event.clientX,
        y: event.clientY,
        action: "ui_click",
        userContext: getUserContext(user),
      });
    };

    document.addEventListener("click", onClick, { capture: true });

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [enabled, user?._id]);
};
