import { Link } from "react-router-dom";
import ProjectRailCard from "./ProjectRailCard";

/*
 * A titled shelf: accent icon, serif heading, count pill, italic caption and a
 * horizontally scrolling rail of ranked columns. "View all" hands the shelf's
 * subject to the real search route rather than to a dead link.
 */
const ShelfRail = ({ icon, title, caption, items, viewAllTo, viewAllLabel = "View all", onBlockedOpen }) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="idp-shelf">
      <div className="idp-shelf__head">
        <span className="idp-icon" style={{ fontSize: 19 }} aria-hidden="true">{icon}</span>
        <h2 className="idp-shelf__title">{title}</h2>
        <span className="idp-shelf__count">{items.length}</span>
        {caption && <span className="idp-caption">{caption}</span>}
        <span className="idp-shelf__spacer" />
        {viewAllTo && (
          <Link to={viewAllTo} className="idp-link">{viewAllLabel} ›</Link>
        )}
      </div>

      <div className="idp-rail">
        {items.map((project, index) => (
          <ProjectRailCard
            key={project?._id || index}
            project={project}
            rank={index + 1}
            onBlockedOpen={onBlockedOpen}
          />
        ))}
        {viewAllTo && (
          <Link to={viewAllTo} className="idp-rail__all">
            <span className="idp-icon" style={{ fontSize: 20 }} aria-hidden="true">arrow_forward</span>
            <span>See all</span>
          </Link>
        )}
      </div>
    </section>
  );
};

export default ShelfRail;
