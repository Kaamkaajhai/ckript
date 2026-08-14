import { forwardRef } from "react";

/*
 * ProjectSection — one labelled band of the project page.
 *
 * It is a real `<section>` with a real `<h2>` and an `aria-labelledby` pointing at it, so the five
 * sections are five landmarks a screen-reader user can jump between. That is the replacement for
 * the desktop rail: the tabs were the navigation, and removing them without giving the sections
 * headings would have removed the navigation too.
 *
 * `tabIndex={-1}` is what lets the recommended action move FOCUS here and not just the scroll
 * position — a section that is scrolled to but not focused leaves the next Tab press back at the
 * top of the page, which on a long project page is a worse place than where the reader started.
 */
const ProjectSection = forwardRef(function ProjectSection({ section, children }, ref) {
  const headingId = `ckm-project-${section.id}-title`;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      className="ckm-project__section"
      aria-labelledby={headingId}
      data-section={section.id}
    >
      <h2 id={headingId} className="ckm-project__section-title">
        <span className="material-symbols-outlined" aria-hidden="true">{section.icon}</span>
        {section.title}
      </h2>
      {children}
    </section>
  );
});

export default ProjectSection;
