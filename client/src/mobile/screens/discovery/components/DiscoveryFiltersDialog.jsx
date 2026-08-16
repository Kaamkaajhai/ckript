import Button from "../../../components/buttons/Button";
import SelectField from "../../../components/forms/SelectField";
import Dialog from "../../../components/overlays/Dialog";
import "./DiscoveryFiltersDialog.css";

export default function DiscoveryFiltersDialog({
  open,
  onClose,
  title = "Filter projects",
  description = "Refine the project results.",
  draft,
  setDraft,
  onReset,
  onApply,
  sortOptions,
  genres,
  contentTypes,
  budgets,
  pricingOptions,
}) {
  const update = (key) => (event) => setDraft((current) => ({
    ...current,
    [key]: event.target.value,
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      action={<Button size="sm" variant="tertiary" onClick={onReset}>Reset</Button>}
      footer={<Button fullWidth onClick={onApply}>Show results</Button>}
      bodyClassName="ckm-discovery-filter__body"
    >
      <SelectField label="Sort by" value={draft.sort} options={sortOptions} onChange={update("sort")} />
      <SelectField label="Genre" value={draft.genre} onChange={update("genre")}>
        <option value="">All genres</option>
        {genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
      </SelectField>
      <SelectField label="Content type" value={draft.contentType} onChange={update("contentType")}>
        <option value="">All types</option>
        {contentTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
      <SelectField label="Budget" value={draft.budget} onChange={update("budget")}>
        <option value="">Any budget</option>
        {budgets.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
      <SelectField label="Pricing" value={draft.pricing} options={pricingOptions} onChange={update("pricing")} />
    </Dialog>
  );
}
