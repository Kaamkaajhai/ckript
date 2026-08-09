import PageHeader from "../components/app-bars/PageHeader";
import Card, { CardBody, CardTitle, CardText } from "../components/cards/Card";
import Icon from "../components/Icon";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import "./NewProject.css";

/*
 * New project — the two-way chooser at /new-project (prefix: ckm-new-project,
 * plan §11 Phase 3 bullet 2 and the §19.3 wireframe).
 *
 * WHAT THIS SCREEN IS (§4.2)
 * --------------------------
 * A `flow` screen, not a `standard` one. It is the first step of creating a
 * project, so it gets a back affordance and no bottom tabs: leaving a tab bar
 * up here invites the writer to abandon a flow they have not started, and the
 * flow's own routes (/create-project, /upload) are tab-less for the same reason.
 *
 * It fetches nothing and has no states. That is worth saying plainly, because
 * every other screen in this phase is dense with them: this one is two
 * destinations and the sentence that tells them apart.
 *
 * THE TRANSFORMATION FROM DESKTOP
 * -------------------------------
 * Desktop (pages/NewProject.jsx) is a 2-column grid of hover-lifting cards with
 * a gradient accent line that appears on hover, a gradient-clipped CTA label and
 * an arrow that translates on hover. None of that survives a touch screen: there
 * is no hover, and a gradient-clipped text CTA is unreadable at 320px. What
 * carries over is the *information*: what each path is, what it gives you, and
 * which one to pick. So the cards stack full-width, the CTA becomes the whole
 * card being tappable, and the hover line becomes a pressed state.
 *
 * ONE COPY CORRECTION, DELIBERATE. Desktop's card claims "Auto-save every 30
 * seconds". The editor debounces a save at 1s and runs an interval save every
 * 3s (pages/CreateProject/index.jsx). Repeating a wrong number on a new surface
 * is how it becomes true-by-repetition, so the mobile copy says what the code
 * does. The desktop string is left alone here and recorded as a follow-up.
 *
 * `startFresh` IS PART OF THE DESTINATION, NOT A DETAIL. /create-project treats
 * `location.state.startFresh` as an entry mode: it resets the wizard and drops
 * the local working draft, which is the difference between "new project" and
 * "resume whatever I was last writing" (plan §5.2). It travels on the link.
 */

const PATHS = [
  {
    key: "create",
    icon: "edit_note",
    title: "Write from scratch",
    purpose: "Draft in the editor, with screenplay formatting as you type.",
    affordances: [
      "Screenplay elements and Fountain formatting",
      "Saves as you write, and resumes where you left off",
      "Continue on any device, or hand it to a co-writer",
    ],
    to: "/create-project",
    state: { startFresh: true },
  },
  {
    key: "upload",
    icon: "upload_file",
    title: "Upload a file",
    purpose: "Already finished? Bring a PDF or DOCX and we read the text out of it.",
    affordances: [
      "PDF and DOCX, up to 30 MB",
      "Text extracted for search and previews",
      "Same details, classification and publishing steps",
    ],
    to: "/upload",
  },
];

export default function NewProject() {
  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.FLOW}
      screenId="new-project"
      className="ckm-new-project"
      scrollClassName="ckm-new-project__scroll"
      appBar={(
        <PageHeader
          title="New project"
          subtitle="Two ways in. Both end in the same place."
          backTo="/dashboard"
        />
      )}
    >
      {/*
        * A list, because it is one: two choices of the same kind. A screen
        * reader hears "list, 2 items" and knows the shape of the decision
        * before reading either option.
        */}
      <ul className="ckm-new-project__paths">
        {PATHS.map((path) => (
          <li key={path.key} className="ckm-new-project__path">
            <Card>
              <CardBody className="ckm-new-project__body">
                <span className="ckm-new-project__icon">
                  <Icon name={path.icon} size={22} />
                </span>

                {/* h2, not the Card default h3: these are the only headings
                    under the screen's h1, so h3 would skip a level. */}
                <CardTitle as="h2" to={path.to} state={path.state} className="ckm-new-project__title">
                  {path.title}
                </CardTitle>

                <CardText className="ckm-new-project__purpose">{path.purpose}</CardText>

                <ul className="ckm-new-project__affordances">
                  {path.affordances.map((item) => (
                    <li key={item} className="ckm-new-project__affordance">
                      {/* The tick is decoration; the sentence is the content. */}
                      <Icon name="check" size={16} className="ckm-new-project__tick" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Outside the accessible name of the link (which is the title
                    alone) and outside the tab order — it is the visual promise
                    that the card goes somewhere, which the link already tells
                    a screen reader. */}
                <Icon name="chevron_right" size={20} className="ckm-new-project__chevron" />
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>

      <p className="ckm-new-project__tip">
        You can start in the editor and upload a PDF of the same project later.
      </p>
    </MobileShell>
  );
}
