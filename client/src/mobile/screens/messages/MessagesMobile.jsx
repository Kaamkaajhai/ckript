import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import PageHeader from "../../components/app-bars/PageHeader";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import TextField from "../../components/forms/TextField";
import FilePicker from "../../components/forms/FilePicker";
import NavBar from "../../components/navigation/NavBar";
import ConfirmDialog from "../../components/overlays/ConfirmDialog";
import MeetingSheet from "../../components/meetings/MeetingSheet";
import { emptyMeetingDraft } from "../../components/meetings/meetingModel";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import useKeyboardInset from "../../hooks/useKeyboardInset";
import {
  buildConversationList,
  formatConversationStamp,
  formatMessageDay,
  groupMessageReactions,
  messageSenderId,
  shouldShowDay,
} from "./messagesModel";
import useMessagesMobile, { MESSAGE_LOAD_STATUS } from "./useMessagesMobile";
import {
  MESSAGE_ATTACHMENT_ACCEPT,
  getMessageThreadContext,
  QUICK_MESSAGE_REACTIONS,
} from "../../../features/messages-operator/messageContract";
import {
  requestCalendarConnectUrl,
  scheduleMeeting,
} from "../../../pages/script-detail/projectActions";
import {
  hasActiveFilmIndustryProfessionalAccess,
  isWriterRole,
} from "../../../utils/industryAccess";
import MessageContextSheet from "./MessageContextSheet";
import "./MessagesMobile.css";

const Avatar = ({ member, small = false }) => {
  const name = member?.name || "Ckript member";
  const image = resolveMediaUrl(member?.profileImage);
  return (
    <span className={`ckm-messages__avatar${small ? " is-small" : ""}`} aria-hidden="true">
      {image ? <img src={image} alt="" /> : name.charAt(0).toUpperCase()}
    </span>
  );
};

const attachmentLabel = (message) => message.fileName
  || (message.fileType === "image" ? "Image attachment" : "Open attachment");

export default function MessagesMobile({ user }) {
  const state = useMessagesMobile(user);
  const keyboardInset = useKeyboardInset();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState(emptyMeetingDraft());
  const [meetingPending, setMeetingPending] = useState(false);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const endRef = useRef(null);
  const restoredCalendarRef = useRef("");
  const visibleConversations = useMemo(
    () => buildConversationList(state.conversations, query),
    [query, state.conversations],
  );
  const threadContext = useMemo(() => getMessageThreadContext(state.messages), [state.messages]);
  const meetingProject = threadContext.primaryProject;
  const canScheduleMeeting = Boolean(
    hasActiveFilmIndustryProfessionalAccess(user)
    && isWriterRole(state.activeChat?.user)
    && meetingProject?.id,
  );

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("calendar") || "";
    if (!status || restoredCalendarRef.current === status || !state.activeChat?.chatId) return;
    let live = true;
    Promise.resolve().then(() => {
      if (!live) return;
      try {
        const saved = JSON.parse(sessionStorage.getItem("ckript:message-meeting-draft") || "null");
        if (saved?.chatId !== state.activeChat.chatId || saved?.projectId !== meetingProject?.id) return;
        restoredCalendarRef.current = status;
        setMeetingDraft({ ...saved.draft, needsCalendar: status !== "connected" });
        setCalendarError(status === "connected" ? "" : "Google Calendar did not connect. Please try again.");
        setCalendarConnected(status === "connected");
        setMeetingOpen(true);
        if (status === "connected") sessionStorage.removeItem("ckript:message-meeting-draft");
      } catch {
        sessionStorage.removeItem("ckript:message-meeting-draft");
      }
    });
    return () => { live = false; };
  }, [meetingProject?.id, state.activeChat?.chatId]);

  useEffect(() => {
    if (state.activeChat?.chatId) endRef.current?.scrollIntoView({ block: "end" });
  }, [state.activeChat?.chatId, state.messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    const hasAttachment = state.attachmentUpload?.status === "ready";
    if ((!message && !hasAttachment) || state.sending) return;
    setDraft("");
    const result = await state.send({ text: message });
    if (!result.ok) setDraft(message);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    const result = await state.removeMessage(deleteTarget._id);
    if (result.ok) setDeleteTarget(null);
  };

  if (state.activeChat) {
    const member = state.activeChat.user;
    const openMeeting = () => {
      setContextOpen(false);
      setCalendarError("");
      setMeetingDraft({
        ...emptyMeetingDraft(meetingProject?.title || ""),
        needsCalendar: !(calendarConnected || user?.googleCalendar?.connected),
      });
      setMeetingOpen(true);
    };

    const submitMeeting = async (draft) => {
      setMeetingPending(true);
      const result = await scheduleMeeting({
        ...draft,
        writerId: member?._id,
        scriptId: meetingProject?.id,
      });
      setMeetingPending(false);
      return result;
    };

    const connectCalendar = async () => {
      setCalendarConnecting(true);
      setCalendarError("");
      try {
        sessionStorage.setItem("ckript:message-meeting-draft", JSON.stringify({
          chatId: state.activeChat.chatId,
          projectId: meetingProject?.id,
          draft: meetingDraft,
        }));
      } catch {
        // Storage can be unavailable in private webviews; the redirect still remains usable.
      }
      const result = await requestCalendarConnectUrl({
        returnTo: `${window.location.pathname}${window.location.search}`,
      });
      if (!result.ok) {
        setCalendarConnecting(false);
        setCalendarError(result.message);
        return;
      }
      window.location.href = result.data.url;
    };

    const header = (
      <PageHeader
        title={member?.name || "Conversation"}
        subtitle={member?.role ? String(member.role).replace(/_/g, " ") : "Direct message"}
        onBack={state.closeConversation}
        backLabel="Back to messages"
        actions={(
          <IconButton
            icon="info"
            label="Conversation details"
            variant="soft"
            onClick={() => setContextOpen(true)}
          />
        )}
      />
    );
    return (
      <MobileShell
        mode={MOBILE_SHELL_MODE.DETAIL}
        screenId="messages-thread"
        className="ckm-messages ckm-messages--thread"
        appBar={header}
        onConnectionRestored={state.refresh}
      >
        <section className="ckm-messages__thread" aria-label={`Conversation with ${member?.name || "Ckript member"}`}>
          <Link className="ckm-messages__member" to={`/profile/${encodeURIComponent(member?._id || "")}`}>
            <Avatar member={member} />
            <span><strong>{member?.name || "Ckript member"}</strong><small>View profile</small></span>
          </Link>

          {state.threadStatus === MESSAGE_LOAD_STATUS.LOADING ? (
            <SkeletonGroup label="Loading conversation" className="ckm-messages__thread-state">
              <SkeletonShape height={68} width="76%" />
              <SkeletonShape height={68} width="64%" />
              <SkeletonShape height={68} width="80%" />
            </SkeletonGroup>
          ) : state.threadStatus === MESSAGE_LOAD_STATUS.FAILED ? (
            <InlineMessage variant="panel" title="Could not load this conversation" onRetry={state.retryThread}>
              {state.sendError}
            </InlineMessage>
          ) : (
            <div className="ckm-messages__stream" aria-live="polite" aria-relevant="additions">
              {!state.messages.length ? (
                <EmptyState
                  compact
                  icon="forum"
                  title="Start the conversation"
                  titleAs="h2"
                  body="Write a clear first message or attach a file. Linked project details and meeting requests are available above."
                />
              ) : state.messages.map((message, index) => {
                const mine = messageSenderId(message) === String(user?._id || "");
                const reactions = groupMessageReactions(message.reactions, user?._id);
                return (
                  <div key={message._id || index}>
                    {shouldShowDay(state.messages, index) ? (
                      <p className="ckm-messages__day">{formatMessageDay(message.createdAt)}</p>
                    ) : null}
                    <article className={`ckm-messages__bubble${mine ? " is-mine" : ""}${message.pending ? " is-pending" : ""}`}>
                      {message.fileUrl ? (
                        message.fileType === "image" ? (
                          <a href={resolveMediaUrl(message.fileUrl)} target="_blank" rel="noreferrer">
                            <img className="ckm-messages__image" src={resolveMediaUrl(message.fileUrl)} alt={attachmentLabel(message)} />
                          </a>
                        ) : (
                          <a className="ckm-messages__attachment" href={resolveMediaUrl(message.fileUrl)} target="_blank" rel="noreferrer">
                            {attachmentLabel(message)}
                          </a>
                        )
                      ) : null}
                      {message.text ? <p>{message.text}</p> : null}
                      <footer>
                        <time dateTime={message.createdAt}>{formatConversationStamp(message.createdAt)}</time>
                        {mine ? <span>{message.pending ? "Sending" : message.read ? "Read" : "Sent"}</span> : null}
                      </footer>
                    </article>
                    {!message.pending ? (
                      <div className={`ckm-messages__message-actions${mine ? " is-mine" : ""}`}>
                        {reactions.map((reaction) => (
                          <button
                            type="button"
                            key={reaction.emoji}
                            className={`ckm-messages__reaction${reaction.mine ? " is-mine" : ""}`}
                            aria-pressed={reaction.mine}
                            disabled={state.reactionPending === `${message._id}:${reaction.emoji}`}
                            onClick={() => state.reactToMessage(message._id, reaction.emoji)}
                          >
                            <span aria-hidden="true">{reaction.emoji}</span> {reaction.count}
                          </button>
                        ))}
                        <details className="ckm-messages__react-menu">
                          <summary aria-label="React to message">React</summary>
                          <span className="ckm-messages__react-options">
                            {QUICK_MESSAGE_REACTIONS.map((emoji) => (
                              <button
                                type="button"
                                key={emoji}
                                aria-label={`React with ${emoji}`}
                                disabled={Boolean(state.reactionPending)}
                                onClick={(event) => {
                                  state.reactToMessage(message._id, emoji);
                                  event.currentTarget.closest("details")?.removeAttribute("open");
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </span>
                        </details>
                        {mine ? (
                          <button type="button" className="ckm-messages__delete" onClick={() => setDeleteTarget(message)}>
                            Delete
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          )}

          <form
            className="ckm-messages__composer"
            onSubmit={submit}
            style={keyboardInset ? { paddingBottom: `${keyboardInset}px` } : undefined}
          >
            {state.sendError && state.threadStatus !== MESSAGE_LOAD_STATUS.FAILED ? (
              <InlineMessage>{state.sendError}</InlineMessage>
            ) : null}
            {state.actionError ? <InlineMessage>{state.actionError}</InlineMessage> : null}
            <FilePicker
              label="Attachment"
              hint="Images, video, audio, PDF, Office, text, CSV or ZIP · up to 250MB"
              accept={MESSAGE_ATTACHMENT_ACCEPT}
              files={state.attachmentUpload?.file ? [state.attachmentUpload.file] : []}
              error={state.attachmentUpload?.error || ""}
              disabled={state.attachmentUpload?.status === "uploading" || state.sending}
              buttonLabel="Attach file"
              onSelect={([file]) => file && state.chooseAttachment(file)}
              onRemove={state.removeAttachment}
            />
            {state.attachmentUpload?.status === "uploading" ? (
              <div className="ckm-messages__upload" role="status">
                <progress value={state.attachmentUpload.progress} max="100" />
                <span>Uploading {state.attachmentUpload.progress}%</span>
              </div>
            ) : state.attachmentUpload?.status === "failed" ? (
              <Button type="button" variant="secondary" icon="refresh" onClick={state.retryAttachment}>Retry upload</Button>
            ) : state.attachmentUpload?.status === "ready" ? (
              <p className="ckm-messages__upload-ready" role="status">Attachment ready to send</p>
            ) : null}
            <label htmlFor="ckm-message-draft">Message</label>
            <div className="ckm-messages__composer-row">
              <textarea
                id="ckm-message-draft"
                rows="2"
                maxLength="4000"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Message ${member?.name || "this member"}`}
              />
              <Button
                type="submit"
                icon="send"
                pending={state.sending}
                pendingLabel="Sending"
                disabled={
                  (!draft.trim() && state.attachmentUpload?.status !== "ready")
                  || state.attachmentUpload?.status === "uploading"
                }
                aria-label="Send message"
              >
                Send
              </Button>
            </div>
          </form>
          <ConfirmDialog
            open={Boolean(deleteTarget)}
            title="Delete this message?"
            message="This removes the message for both people and cannot be undone."
            confirmLabel="Delete message"
            destructive
            pending={state.deletionPending === deleteTarget?._id}
            error={state.actionError}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
          />
          <MessageContextSheet
            open={contextOpen}
            member={member}
            context={threadContext}
            canSchedule={canScheduleMeeting}
            onSchedule={openMeeting}
            onClose={() => setContextOpen(false)}
          />
          <MeetingSheet
            open={meetingOpen}
            writerName={member?.name || "the writer"}
            projectTitle={meetingProject?.title || ""}
            draft={meetingDraft}
            onDraftChange={setMeetingDraft}
            pending={meetingPending}
            connecting={calendarConnecting}
            connectionError={calendarError}
            onSubmit={submitMeeting}
            onConnect={connectCalendar}
            onClose={() => setMeetingOpen(false)}
          />
        </section>
      </MobileShell>
    );
  }

  const header = <PageHeader title="Messages" eyebrow="Inbox" />;
  const shell = (children) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="messages"
      className="ckm-messages"
      appBar={header}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={state.reload}
    >
      {children}
    </MobileShell>
  );

  if (state.status === MESSAGE_LOAD_STATUS.LOADING) {
    return shell(
      <SkeletonGroup label="Loading conversations" className="ckm-messages__state">
        <SkeletonShape height={84} />
        <SkeletonShape height={84} />
        <SkeletonShape height={84} />
      </SkeletonGroup>,
    );
  }

  if (state.status === MESSAGE_LOAD_STATUS.FAILED) {
    return shell(
      <div className="ckm-messages__state">
        <InlineMessage variant="panel" title="Could not load messages" onRetry={state.reload}>
          {state.error}
        </InlineMessage>
      </div>,
    );
  }

  return shell(
    <section className="ckm-messages__inbox" aria-labelledby="ckm-messages-heading">
      <h2 id="ckm-messages-heading" className="ckm-messages__heading">Conversations</h2>
      <TextField
        label="Search conversations"
        purpose="search"
        icon="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {state.sendError ? <InlineMessage>{state.sendError}</InlineMessage> : null}
      {!state.conversations.length ? (
        <EmptyState
          icon="forum"
          title="No conversations yet"
          titleAs="h3"
          body="When you connect with a writer or industry professional, your messages will appear here."
        />
      ) : !visibleConversations.length ? (
        <EmptyState compact icon="search_off" title="No matching conversations" titleAs="h3" body="Try another name or message." />
      ) : (
        <ul className="ckm-messages__list">
          {visibleConversations.map((conversation) => (
            <li key={conversation.chatId}>
              <button type="button" className="ckm-messages__row" onClick={() => state.openConversation(conversation)}>
                <Avatar member={conversation.user} />
                <span className="ckm-messages__row-copy">
                  <span><strong>{conversation.user.name}</strong><time dateTime={conversation.timestamp}>{formatConversationStamp(conversation.timestamp)}</time></span>
                  <span><small>{conversation.lastMessage}</small>{conversation.unreadCount ? <b aria-label={`${conversation.unreadCount} unread messages`}>{Math.min(conversation.unreadCount, 99)}</b> : null}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>,
  );
}
