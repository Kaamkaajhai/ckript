/**
 * The one header every admin section renders: title, live count, optional actions. Exists so the
 * 23 sections cannot each invent their own heading scale — the h2 here is the only section-title
 * style in the redesigned admin.
 */
export default function SectionHeader({ title, count = null, children = null }) {
  return (
    <div className="adsc-head">
      <h2 className="adsc-title">
        {title}
        {count !== null ? <span className="adsc-count ckad-num">{count}</span> : null}
      </h2>
      {children ? <div className="adsc-actions">{children}</div> : null}
    </div>
  );
}
