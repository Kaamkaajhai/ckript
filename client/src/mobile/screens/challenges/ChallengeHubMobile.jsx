import { useContext } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { useAuthModal } from "../../../context/AuthModalContext";
import {
  CHALLENGE_HUB_STATUS,
  CHALLENGE_HUB_TABS,
  readChallengeHubTab,
  writeChallengeHubTab,
} from "../../../pages/challenge/challengeHub";
import useChallengeHub from "../../../pages/challenge/useChallengeHub";
import AppBar from "../../components/app-bars/AppBar";
import PageHeader from "../../components/app-bars/PageHeader";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import NavBar from "../../components/navigation/NavBar";
import Tabs, { TabPanel } from "../../components/tabs/Tabs";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import {
  ChallengeCardMobile,
  EntryCardMobile,
  HallOfFameGroupMobile,
} from "./ChallengeHubCards";
import "./ChallengeHubMobile.css";

function HubLoading({ label = "Loading challenges" }) {
  return (
    <SkeletonGroup label={label} className="ckm-challenge-hub__loading">
      <SkeletonShape height={250} radius="var(--ckm-r-xl)" />
      <SkeletonShape height={250} radius="var(--ckm-r-xl)" />
    </SkeletonGroup>
  );
}

function StatePanel({ title, body, icon, action = null }) {
  return <EmptyState titleAs="h2" title={title} body={body} icon={icon} actions={action} />;
}

export default function ChallengeHubMobile({ user: suppliedUser = undefined, previewState = null }) {
  const auth = useContext(AuthContext) || {};
  const user = suppliedUser === undefined ? auth.user : suppliedUser;
  const { openAuthModal } = useAuthModal();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = readChallengeHubTab(params);
  const liveHub = useChallengeHub({ user, enabled: !previewState });
  const hub = previewState || liveHub;
  const member = Boolean(user);
  const publicData = hub.public.data || {};
  const mineData = hub.mine.data || {};
  const returnTo = `${location.pathname}${location.search}`;

  const selectTab = (next) => setParams(writeChallengeHubTab(params, next), { replace: true });
  const signIn = () => openAuthModal({ redirect: tab === "mine" ? "/challenge?tab=mine" : returnTo });
  const retryOnReconnect = () => {
    hub.retryPublic();
    if (member) hub.retryMine();
  };

  const header = member ? (
    <AppBar user={user} />
  ) : (
    <PageHeader
      title="Challenges"
      backTo="/"
      actions={<Button variant="tertiary" size="sm" onClick={signIn}>Sign in</Button>}
    />
  );

  const publicPending = hub.public.status === CHALLENGE_HUB_STATUS.LOADING;
  const publicFailed = hub.public.status === CHALLENGE_HUB_STATUS.FAILED;
  const MastheadHeading = member ? "h1" : "h2";

  return (
    <MobileShell
      mode={member ? MOBILE_SHELL_MODE.STANDARD : MOBILE_SHELL_MODE.PUBLIC}
      screenId="challenge-hub"
      className="ckm-challenge-hub"
      scrollClassName="ckm-challenge-hub__scroll"
      appBar={header}
      bottomNav={member ? <NavBar user={user} /> : null}
      onConnectionRestored={retryOnReconnect}
    >
      <header className="ckm-challenge-hub__masthead">
        <p>Screenwriting competitions</p>
        <MastheadHeading>Write against the clock.</MastheadHeading>
        <span>One theme, one fixed window, and a complete script that gets read.</span>
      </header>

      <Tabs
        tabsId="challenge-hub"
        label="Challenge sections"
        tabs={CHALLENGE_HUB_TABS}
        value={tab}
        onChange={selectTab}
        className="ckm-challenge-hub__tabs"
      />

      <div className="ckm-challenge-hub__panels">
        <TabPanel tabsId="challenge-hub" id="live" value={tab}>
          {publicPending ? <HubLoading /> : publicFailed ? (
            <InlineMessage variant="panel" title="Challenges are unavailable" onRetry={hub.retryPublic}>
              {hub.public.failure?.message}
            </InlineMessage>
          ) : (publicData.live || []).length ? (
            <div className="ckm-challenge-hub__cards">
              {publicData.live.map((competition) => <ChallengeCardMobile key={competition._id} competition={competition} serverNow={publicData.serverNow} />)}
            </div>
          ) : <StatePanel icon="schedule" title="No live challenge" body="The next challenge will appear here as soon as it is announced." />}
        </TabPanel>

        <TabPanel tabsId="challenge-hub" id="past" value={tab}>
          {publicPending ? <HubLoading /> : publicFailed ? (
            <InlineMessage variant="panel" title="Previous challenges are unavailable" onRetry={hub.retryPublic}>
              {hub.public.failure?.message}
            </InlineMessage>
          ) : (publicData.past || []).length ? (
            <div className="ckm-challenge-hub__cards">
              {publicData.past.map((competition) => <ChallengeCardMobile key={competition._id} competition={competition} variant="past" serverNow={publicData.serverNow} />)}
            </div>
          ) : <StatePanel icon="history" title="No previous challenges" body="Completed events and challenges awaiting results will appear here." />}
        </TabPanel>

        <TabPanel tabsId="challenge-hub" id="hall-of-fame" value={tab}>
          {publicPending ? <HubLoading label="Loading the Hall of Fame" /> : publicFailed ? (
            <InlineMessage variant="panel" title="The Hall of Fame is unavailable" onRetry={hub.retryPublic}>
              {hub.public.failure?.message}
            </InlineMessage>
          ) : (publicData.honourRoll || []).length ? (
            <>
              <p className="ckm-challenge-hub__summary" role="status">
                {publicData.laureateCount} {publicData.laureateCount === 1 ? "writer" : "writers"} honoured across {publicData.honourRoll.length} {publicData.honourRoll.length === 1 ? "challenge" : "challenges"}
              </p>
              <div className="ckm-challenge-hub__honour-roll">
                {publicData.honourRoll.map((group) => <HallOfFameGroupMobile key={group.competition._id} group={group} />)}
              </div>
              <Button to="/hall-of-fame" variant="secondary" fullWidth>Browse the complete Hall of Fame</Button>
            </>
          ) : <StatePanel icon="emoji_events" title="No results yet" body="Winners and special-award recipients will be recorded here permanently." />}
        </TabPanel>

        <TabPanel tabsId="challenge-hub" id="mine" value={tab}>
          {!member ? (
            <StatePanel
              icon="person"
              title="Your challenges"
              body="Sign in to see registrations, submissions, awards, and certificates."
              action={<Button onClick={signIn}>Sign in</Button>}
            />
          ) : hub.mine.status === CHALLENGE_HUB_STATUS.LOADING ? (
            <HubLoading label="Loading your challenges" />
          ) : hub.mine.status === CHALLENGE_HUB_STATUS.FAILED ? (
            <InlineMessage variant="panel" title="Your challenges are unavailable" onRetry={hub.retryMine}>
              {hub.mine.failure?.message}
            </InlineMessage>
          ) : (mineData.items || []).length ? (
            <div className="ckm-challenge-hub__entries">
              {mineData.items.map((item) => <EntryCardMobile key={item.entry._id || item.competition._id} item={item} />)}
            </div>
          ) : (
            <StatePanel
              icon="edit_note"
              title="No challenge entries"
              body="Choose a live challenge to register and begin."
              action={<Button variant="secondary" onClick={() => selectTab("live")}>Browse live challenges</Button>}
            />
          )}
        </TabPanel>
      </div>
    </MobileShell>
  );
}
