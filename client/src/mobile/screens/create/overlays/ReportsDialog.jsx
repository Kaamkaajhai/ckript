import { useMemo, useState } from "react";
import { downloadScreenplayReport } from "../../../../components/screenplay/screenplayReportExport";
import Button from "../../../components/buttons/Button";
import EmptyState from "../../../components/EmptyState";
import SelectField from "../../../components/forms/SelectField";
import Dialog from "../../../components/overlays/Dialog";
import Tabs, { TabPanel } from "../../../components/tabs/Tabs";
import {
  buildReports,
  DEFAULT_REPORT_SORT,
  REPORT_SORT_OPTIONS,
  REPORT_TAB,
  sortReportRows,
} from "../reportsModel";

const TABS = [
  { id: REPORT_TAB.SCENES, label: "Scenes" },
  { id: REPORT_TAB.CHARACTERS, label: "Characters" },
];

function Metrics({ items }) {
  return (
    <span className="ckm-editor__report-metrics">
      {items.map(({ label, value }) => (
        <span className="ckm-editor__report-metric" key={label}>
          <span className="ckm-editor__report-metric-value">{value}</span>
          <span className="ckm-editor__report-metric-label">{label}</span>
        </span>
      ))}
    </span>
  );
}

export default function ReportsDialog({
  open,
  onClose,
  value = "",
  title = "Script",
  onJumpScene,
  onDownload = downloadScreenplayReport,
  returnFocusTo,
}) {
  const [tab, setTab] = useState(REPORT_TAB.SCENES);
  const [sorts, setSorts] = useState(DEFAULT_REPORT_SORT);

  /* Reports paginate and classify the whole document. Do none of that while
     the dialog is closed; the editor must not repaginate on every keystroke to
     feed a surface the writer has not opened (§15). */
  const reports = useMemo(
    () => (open ? buildReports(value) : { scenes: [], characters: [] }),
    [open, value],
  );
  const tabs = useMemo(() => TABS.map((item) => ({
    ...item,
    count: reports[item.id].length,
  })), [reports]);
  const rows = useMemo(
    () => sortReportRows(reports[tab], sorts[tab]),
    [reports, sorts, tab],
  );

  const changeSort = (event) => {
    setSorts((current) => ({ ...current, [tab]: event.target.value }));
  };

  const download = (format) => {
    onDownload({ kind: tab, format, rows, title });
  };

  const jump = (line) => {
    onClose?.();
    requestAnimationFrame(() => onJumpScene?.(line));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reports"
      description="Scene and character summaries generated from this script."
      closeLabel="Close reports"
      returnFocusTo={returnFocusTo}
      bodyClassName="ckm-editor__reports-body"
    >
      <Tabs
        tabsId="editor-reports"
        label="Report type"
        tabs={tabs}
        value={tab}
        onChange={setTab}
        fitted
      />

      <div className="ckm-editor__report-tools">
        <SelectField
          label={`Sort ${tab}`}
          options={REPORT_SORT_OPTIONS[tab]}
          value={sorts[tab]}
          onChange={changeSort}
          fieldClassName="ckm-editor__report-sort"
        />
        <div className="ckm-editor__report-downloads" role="group" aria-label={`Download ${tab} report`}>
          <Button variant="secondary" icon="picture_as_pdf" onClick={() => download("pdf")}>PDF</Button>
          <Button variant="secondary" icon="table_view" onClick={() => download("csv")}>CSV</Button>
        </div>
      </div>

      <TabPanel tabsId="editor-reports" id={REPORT_TAB.SCENES} value={tab}>
        {rows.length ? (
          <ol className="ckm-editor__report-list" aria-label="Scene report">
            {rows.map((scene) => (
              <li className="ckm-editor__report-row" key={`${scene.number}:${scene.line}`}>
                <button
                  type="button"
                  className="ckm-editor__report-scene"
                  onClick={() => jump(scene.line)}
                  aria-label={`Scene ${scene.number}: ${scene.heading}. Page ${scene.page}, ${scene.elements} elements, ${scene.words} words. Jump to scene.`}
                >
                  <span className="ckm-editor__report-row-head">
                    <span className="ckm-editor__report-number" aria-hidden="true">{scene.number}</span>
                    <span className="ckm-editor__report-name">{scene.heading}</span>
                    <span className="material-symbols-outlined ckm-editor__report-chevron" aria-hidden="true">chevron_right</span>
                  </span>
                  <Metrics items={[
                    { label: "Page", value: scene.page },
                    { label: "Elements", value: scene.elements },
                    { label: "Words", value: scene.words },
                  ]} />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            compact
            icon="movie"
            title="No scenes yet"
            titleAs="h3"
            body="Add an INT. or EXT. heading to populate this report."
          />
        )}
      </TabPanel>

      <TabPanel tabsId="editor-reports" id={REPORT_TAB.CHARACTERS} value={tab}>
        {rows.length ? (
          <ul className="ckm-editor__report-list" aria-label="Character report">
            {rows.map((character) => (
              <li className="ckm-editor__report-row ckm-editor__report-row--static" key={character.name}>
                <div className="ckm-editor__report-character">
                  <span className="ckm-editor__report-avatar" aria-hidden="true">
                    {(character.name || "?").trim().charAt(0)}
                  </span>
                  <span className="ckm-editor__report-name">{character.name}</span>
                </div>
                <Metrics items={[
                  { label: "Lines", value: character.lines },
                  { label: "Scenes", value: character.scenes },
                  { label: "First", value: character.first },
                  { label: "Last", value: character.last },
                ]} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon="record_voice_over"
            title="No speaking characters yet"
            titleAs="h3"
            body="Character cues with dialogue beneath them appear here."
          />
        )}
      </TabPanel>
    </Dialog>
  );
}
