/*
 * RefineDrawer — the single refine surface behind the toolbar's "Refine".
 *
 * Every facet the page can filter on lives here and nowhere else, so there is
 * one place to reason about what is narrowing the list. The chips under the
 * toolbar are a read-out of this state, not a second control set.
 *
 * The footer button reports the live result count, which is why the drawer
 * filters as you toggle rather than staging changes behind an Apply.
 */
import { useEffect } from "react";
import {
  BUDGETS,
  CONTENT_TYPES,
  GENRES,
  ONLY_OPTIONS,
  PREMIUM_OPTIONS,
  SORT_OPTIONS,
} from "../featuredBroadsheet";
import FeaturedIcon from "./FeaturedIcon";

const Group = ({ label, children }) => (
  <div className="fbp-drawer__group">
    <div className="fbp-drawer__label">{label}</div>
    <div className="fbp-drawer__opts">{children}</div>
  </div>
);

const Opt = ({ active, onClick, children }) => (
  <button
    type="button"
    className={`fbp-opt${active ? " is-active" : ""}`}
    aria-pressed={active}
    onClick={onClick}
  >
    {children}
  </button>
);

const RefineDrawer = ({
  sort,
  filters,
  resultCount,
  mandateSet,
  onSort,
  onToggle,
  onPremium,
  onClear,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fbp-overlay fbp-overlay--right" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="fbp-drawer" role="dialog" aria-modal="true" aria-label="Refine featured projects">
        <header className="fbp-drawer__head">
          <div>
            <div className="fbp-drawer__eyebrow">FILTERS</div>
            <h2 className="fbp-drawer__title">Refine</h2>
          </div>
          <button type="button" className="fbp-sheet__close" onClick={onClose} aria-label="Close refine">
            <FeaturedIcon name="close" />
          </button>
        </header>

        <div className="fbp-drawer__body">
          <Group label="SORT">
            {SORT_OPTIONS.map((option) => (
              <Opt key={option.key} active={sort === option.key} onClick={() => onSort(option.key)}>
                {option.label}
              </Opt>
            ))}
          </Group>

          <Group label={`GENRE · ${GENRES.length}`}>
            {GENRES.map((genre) => (
              <Opt
                key={genre}
                active={filters.genres.includes(genre)}
                onClick={() => onToggle("genres", genre)}
              >
                {genre}
              </Opt>
            ))}
          </Group>

          <Group label={`CONTENT TYPE · ${CONTENT_TYPES.length}`}>
            {CONTENT_TYPES.map((type) => (
              <Opt
                key={type.key}
                active={filters.types.includes(type.key)}
                onClick={() => onToggle("types", type.key)}
              >
                {type.label}
              </Opt>
            ))}
          </Group>

          <Group label={`BUDGET · ${BUDGETS.length}`}>
            {BUDGETS.map((budget) => (
              <Opt
                key={budget.key}
                active={filters.budgets.includes(budget.key)}
                onClick={() => onToggle("budgets", budget.key)}
              >
                {budget.label}
              </Opt>
            ))}
          </Group>

          <Group label={`ACCESS · ${PREMIUM_OPTIONS.length}`}>
            {PREMIUM_OPTIONS.map((option) => (
              <Opt
                key={option.key}
                active={filters.premium === option.key}
                onClick={() => onPremium(option.key)}
              >
                {option.label}
              </Opt>
            ))}
          </Group>

          <Group label="ONLY SHOW">
            {ONLY_OPTIONS
              /* Nothing to match against until the viewer has a brief on file. */
              .filter((option) => option.key !== "mandate" || mandateSet)
              .map((option) => (
                <Opt
                  key={option.key}
                  active={filters.only.includes(option.key)}
                  onClick={() => onToggle("only", option.key)}
                >
                  {option.label}
                </Opt>
              ))}
          </Group>
        </div>

        <footer className="fbp-drawer__foot">
          <button type="button" className="fbp-btn fbp-btn--primary fbp-drawer__apply" onClick={onClose}>
            {`Show ${resultCount} ${resultCount === 1 ? "project" : "projects"}`}
          </button>
          <button type="button" className="fbp-drawer__reset" onClick={onClear}>Reset</button>
        </footer>
      </aside>
    </div>
  );
};

export default RefineDrawer;
