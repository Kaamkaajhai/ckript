import { useId } from "react";
import { ListContext } from "./listContext";
import "./List.css";

/*
 * List — the container every stack of rows belongs in (prefix: ckm-list).
 *
 * A screen reader announces "list, 8 items" only if the rows are real list
 * items, and that count is most of what a blind user knows about how long a
 * results list is before deciding to read it. So the container is a <ul> and
 * the rows are <li>s — a thing hand-built mobile lists almost always drop,
 * because a stack of divs looks identical.
 *
 * `ListRow` asks this context whether it is inside a list; standalone rows
 * (a single row inside a card, say) render a plain element instead of an
 * orphan <li>, which would be invalid markup.
 *
 * The label matters as much as the semantics: two unlabelled lists on one
 * screen are indistinguishable when navigating by landmark or list.
 */

export default function List({
  label = "",
  labelledBy = "",
  heading = "",
  inset = false,
  bordered = false,
  as = "ul",
  className = "",
  children,
  ...rest
}) {
  const headingId = useId();
  const Container = as;

  const classes = [
    "ckm-list",
    inset ? "ckm-list--inset" : "",
    bordered ? "ckm-list--bordered" : "",
    className,
  ].filter(Boolean).join(" ");

  // A visible heading is a better label than an invisible one, so when the
  // caller gives us a heading we name the list from it rather than duplicating
  // the text into aria-label.
  const describedBy = labelledBy || (heading ? headingId : undefined);

  const list = (
    <Container
      className={classes}
      aria-label={describedBy ? undefined : label || undefined}
      aria-labelledby={describedBy}
      {...rest}
    >
      <ListContext.Provider value={{ inList: true }}>{children}</ListContext.Provider>
    </Container>
  );

  if (!heading) return list;

  return (
    <div className="ckm-list__section">
      <h2 className="ckm-list__heading" id={headingId}>{heading}</h2>
      {list}
    </div>
  );
}
