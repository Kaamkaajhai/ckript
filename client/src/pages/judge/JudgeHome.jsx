import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import judgeApi from "../../services/judgeApi";
import AdminShell from "../admin/shell/AdminShell";
import { Badge, Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Input, SectionHeader, Spinner, ToastProvider } from "../admin/ui";
import { useJudgeCompetitions, useJudgeQueue } from "./useJudgeData";
import JudgeScoreSheet from "./JudgeScoreSheet";
import "./judge.css";

/**
 * /judge — the console for invited competition judges.
 *
 * Self-gating and mounted outside AppChrome, the same shape /admin and /finance use: a judge is a
 * console-only role with no reason to carry the consumer navigation around.
 *
 * ONE route, with the open competition and entry held in component state rather than the URL. That
 * is not laziness — client/src/mobile/routes/mobileRouteCoverage.test.js asserts EXACT equality
 * between App.jsx's route list and a hardcoded mirror, so every new route literal is a coordinated
 * three-file edit. One route keeps that cost paid once.
 *
 * Judges sign in HERE rather than through the main auth modal, because that modal lands people in
 * the consumer app and a judge has nowhere to go there.
 */

const NAV_GROUPS = [
  {
    title: "",
    items: [
      { key: "competitions", label: "Your competitions", icon: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25s4.545.16 6.75.47v1.516" },
    ],
  },
];

/**
 * Setting a password from the admin's one-time invite link.
 *
 * The admin creates the account but never learns the secret — that is what keeps each score
 * attributable to the judge who actually cast it, rather than to anyone holding a password the admin
 * also had. Reached as /judge?invite=<token>, so it needs no route of its own.
 */
function JudgeAcceptInvite({ token, onSignedIn, onGiveUp }) {
  const [state, setState] = useState({ checking: true, valid: false, name: "", error: "" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    judgeApi
      .get(`/auth/judge-invite/${token}`)
      .then(({ data }) => {
        if (!cancelled) setState({ checking: false, valid: true, name: data.name || "", error: "" });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ checking: false, valid: false, name: "", error: err?.response?.data?.message || "That invite link is not valid." });
        }
      });
    return () => { cancelled = true; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await judgeApi.post("/auth/judge-invite/accept", { token, password });
      onSignedIn(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not set your password.");
    } finally {
      setBusy(false);
    }
  };

  if (state.checking) {
    return (
      <div className="ckad ckjd-gate">
        <div className="ckjd-gate-card"><Spinner /></div>
      </div>
    );
  }

  if (!state.valid) {
    return (
      <div className="ckad ckjd-gate">
        <div className="ckjd-gate-card">
          <h1>Ckript Judging</h1>
          <p>{state.error}</p>
          <Button onClick={onGiveUp}>Go to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="ckad ckjd-gate">
      <form className="ckjd-gate-card" onSubmit={submit}>
        <h1>Welcome{state.name ? `, ${state.name.split(" ")[0]}` : ""}</h1>
        <p>
          Choose a password for your judging account. Nobody else sees it — not even the organiser who
          invited you.
        </p>

        <Field label="New password" help="At least 8 characters, with an uppercase letter, a lowercase letter, a number and a symbol.">
          {(props) => (
            <Input {...props} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}
        </Field>
        <Field label="Confirm password" error={error}>
          {(props) => (
            <Input {...props} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          )}
        </Field>

        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Setting…" : "Set password and continue"}</Button>
      </form>
    </div>
  );
}

/** The sign-in card. Deliberately plain: a judge has one thing to do here. */
function JudgeSignIn({ onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await judgeApi.post("/auth/login", { email: email.trim(), password });
      if (String(data?.role) !== "judge") {
        setError("That account is not a judge account. Use the credentials the organiser sent you.");
        return;
      }
      onSignedIn(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not sign you in. Check the email and password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ckad ckjd-gate">
      <form className="ckjd-gate-card" onSubmit={submit}>
        <h1>Ckript Judging</h1>
        <p>Sign in with the judge credentials the competition organiser sent you.</p>

        <Field label="Email">
          {(props) => (
            <Input {...props} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          )}
        </Field>
        <Field label="Password" error={error}>
          {(props) => (
            <Input {...props} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}
        </Field>

        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </div>
  );
}

/** The competition picker. A judge sits on a handful of panels, not fifty — cards, not a table. */
function CompetitionPicker({ onOpen }) {
  const { competitions, loading, error, refresh } = useJudgeCompetitions();

  if (loading) return <div className="ckjd-loading"><Spinner /></div>;
  if (error) return <ErrorState title="Could not load your competitions" body={error} onRetry={refresh} />;
  if (!competitions.length) {
    return (
      <EmptyState
        title="No competitions assigned yet"
        body="When an organiser adds you to a judging panel, it will appear here."
      />
    );
  }

  return (
    <>
      <SectionHeader title="Your competitions" count={competitions.length} />
      <div className="ckjd-grid">
        {competitions.map((c) => (
          <Card key={c._id} title={c.name} actions={c.judgingOpen ? <Badge tone="success">Open</Badge> : <Badge tone="neutral">Closed</Badge>}>
            <div className="ckjd-progress">
              <div className="ckjd-bar">
                <span style={{ width: `${c.progress.total ? (c.progress.submitted / c.progress.total) * 100 : 0}%` }} />
              </div>
              <p className="ckad-num">
                {c.progress.submitted} of {c.progress.total} scored
                {c.progress.draft ? ` · ${c.progress.draft} draft` : ""}
              </p>
            </div>
            {!c.criteriaCount ? (
              <p className="ckjd-note">The organiser has not set the scoring criteria yet.</p>
            ) : null}
            {!c.judgingOpen && c.judgingClosedReason ? <p className="ckjd-note">{c.judgingClosedReason}</p> : null}
            <Button variant="primary" onClick={() => onOpen(c._id)}>Open</Button>
          </Card>
        ))}
      </div>
    </>
  );
}

/** The queue for one competition, and the score sheet it opens into. */
function CompetitionQueue({ competitionId, dark, onBack }) {
  const { competition, rubric, entries, progress, judgingOpen, judgingClosedReason, loading, error, refresh } = useJudgeQueue(competitionId);
  const [openEntryId, setOpenEntryId] = useState(null);

  if (loading) return <div className="ckjd-loading"><Spinner /></div>;
  if (error) return <ErrorState title="Could not load this competition" body={error} onRetry={refresh} />;

  if (openEntryId) {
    const index = entries.findIndex((e) => e.id === openEntryId);
    return (
      <JudgeScoreSheet
        competitionId={competitionId}
        entryId={openEntryId}
        rubric={rubric}
        judgingOpen={judgingOpen}
        judgingClosedReason={judgingClosedReason}
        dark={dark}
        position={index >= 0 ? `Entry ${index + 1} of ${entries.length}` : ""}
        onSaved={refresh}
        onBack={() => { setOpenEntryId(null); refresh(); }}
      />
    );
  }

  // The affordance that actually changes behaviour on a long queue: a judge navigates by button,
  // not by scanning a table for the next blank row.
  const nextUnscored = entries.find((e) => e.myScore?.status !== "submitted");

  const columns = [
    { key: "eventId", header: "Entry", width: 150, render: (row) => <code className="ckjd-code">{row.eventId}</code> },
    { key: "title", header: "Title", render: (row) => row.title || "Untitled" },
    { key: "pageCount", header: "Pages", align: "right", width: 90 },
    {
      key: "status",
      header: "Your score",
      width: 160,
      sortValue: (row) => row.myScore?.status || "",
      render: (row) =>
        row.myScore?.status === "submitted"
          ? <Badge tone="success">Submitted</Badge>
          : row.myScore
            ? <Badge tone="warn">Draft</Badge>
            : <Badge tone="neutral">Not started</Badge>,
    },
    {
      key: "myNominations",
      header: "Nominated",
      width: 130,
      sortValue: (row) => (row.myNominations || []).length,
      render: (row) => ((row.myNominations || []).length ? `${row.myNominations.length}` : "—"),
    },
    // NOTE: there is deliberately no Writer column here. This is the row where the admin's own
    // entries table shows entry.userId.name and .email. Its absence is the feature.
    {
      key: "open",
      header: "",
      width: 100,
      render: (row) => <Button size="sm" onClick={() => setOpenEntryId(row.id)}>Open</Button>,
    },
  ];

  return (
    <>
      <SectionHeader title={competition?.name || "Competition"} count={entries.length}>
        <Button variant="ghost" onClick={onBack}>← All competitions</Button>
        {nextUnscored ? (
          <Button variant="primary" onClick={() => setOpenEntryId(nextUnscored.id)}>Next unscored entry</Button>
        ) : null}
      </SectionHeader>

      {progress ? (
        <p className="ckjd-strip ckad-num">
          {progress.submitted} of {progress.total} scored
          {progress.draft ? ` · ${progress.draft} draft` : ""}
          {progress.remaining ? ` · ${progress.remaining} to go` : " · all done"}
        </p>
      ) : null}

      {!judgingOpen ? <p className="ckjd-closed">{judgingClosedReason || "Judging is closed."}</p> : null}
      {!rubric.criteria.length ? (
        <p className="ckjd-closed">The organiser has not set the scoring criteria yet — you can read entries, but not score them.</p>
      ) : null}

      <Card flush>
        <DataTable
          columns={columns}
          rows={entries}
          rowKey="id"
          searchPlaceholder="Search by entry code or title…"
          empty={{ title: "No entries to judge yet", body: "Entries appear here once the submission window closes." }}
        />
      </Card>
    </>
  );
}

function JudgeWorkspace({ user, onSignOut }) {
  const [competitionId, setCompetitionId] = useState(null);
  const [dark, setDark] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  // Stable identity, so the shell's theme effect does not re-run on every render of this component.
  const handleTheme = useCallback((isDark) => setDark(isDark), []);

  return (
    <AdminShell
      brand="Ckript Judging"
      groups={NAV_GROUPS}
      activeKey="competitions"
      onNavigate={() => setCompetitionId(null)}
      crumbs={["Judging"]}
      onThemeChange={handleTheme}
      /*
       * Who you are, and the way out. The console had neither: a judge who signed in was stuck with
       * no account menu and no sign-out anywhere on the page.
       *
       * The name matters as much as the button. Scores are attributed to the account that cast them,
       * so a judge sharing a machine needs to see WHOSE session they are about to score under —
       * finding out afterwards means the score is on the wrong person.
       */
      headerActions={(
        <div className="ckjd-account">
          <span className="ckjd-account-name" title={user?.email || ""}>{user?.name || user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => setConfirmSignOut(true)}>Sign out</Button>
        </div>
      )}
    >
      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        // Named because an unsubmitted draft is the one thing worth pausing over: it lives on the
        // server, so it survives — but a judge mid-script has no way to know that.
        body="Any score you saved as a draft is kept and will be waiting when you sign back in."
        confirmLabel="Sign out"
        onConfirm={onSignOut}
        onClose={() => setConfirmSignOut(false)}
      />
      {competitionId
        ? <CompetitionQueue competitionId={competitionId} dark={dark} onBack={() => setCompetitionId(null)} />
        : <CompetitionPicker onOpen={setCompetitionId} />}
    </AdminShell>
  );
}

export default function JudgeHome() {
  const auth = useContext(AuthContext) || {};
  const { user, adoptSession, logout } = auth;
  const role = String(user?.role || "");

  // ?invite=<token> is the admin's one-time set-password link. Read once into state rather than kept
  // live, so accepting it can clear the token out of the address bar without remounting the screen.
  const [invite, setInvite] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("invite") || "";
    } catch {
      return "";
    }
  });

  const clearInvite = useCallback(() => {
    setInvite("");
    // Drop the token from the URL so it does not sit in history, or in a screenshot of the browser.
    try {
      window.history.replaceState({}, "", "/judge");
    } catch { /* a blocked history write is cosmetic, not a failure */ }
  }, []);

  // Checked before the signed-in branch: a judge who accepted an invite in another tab, or who is
  // signed in as someone else, should still be able to open the link they were sent.
  if (invite) {
    return (
      <JudgeAcceptInvite
        token={invite}
        onSignedIn={(data) => { adoptSession?.(data); clearInvite(); }}
        onGiveUp={clearInvite}
      />
    );
  }

  if (!user) return <JudgeSignIn onSignedIn={(data) => adoptSession?.(data)} />;

  if (role !== "judge") {
    // A refusal panel, not a sign-in form. Showing a password field to someone whose password is
    // perfectly fine reads as "your password is wrong", which sends them somewhere unhelpful.
    return (
      <div className="ckad ckjd-gate">
        <div className="ckjd-gate-card">
          <h1>Ckript Judging</h1>
          <p>
            This console is for competition judges. You are signed in as {user.name || user.email} ({role || "unknown role"}).
            {" "}If you were invited to judge, the organiser will have sent you separate judge credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <JudgeWorkspace
        user={user}
        // redirect:false on purpose. The default sends people to the marketing homepage, which is
        // nowhere a judge has any business being — clearing the session re-renders this component
        // straight back to its own sign-in card.
        onSignOut={() => logout?.({ redirect: false })}
      />
    </ToastProvider>
  );
}
