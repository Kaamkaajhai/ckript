import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import PageHeader from "../../components/app-bars/PageHeader";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import TextField from "../../components/forms/TextField";
import NavBar from "../../components/navigation/NavBar";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import useKeyboardInset from "../../hooks/useKeyboardInset";
import {
  buildConversationList,
  formatConversationStamp,
  formatMessageDay,
  messageSenderId,
  shouldShowDay,
} from "./messagesModel";
import useMessagesMobile, { MESSAGE_LOAD_STATUS } from "./useMessagesMobile";
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
  const endRef = useRef(null);
  const visibleConversations = useMemo(
    () => buildConversationList(state.conversations, query),
    [query, state.conversations],
  );

  useEffect(() => {
    if (state.activeChat?.chatId) endRef.current?.scrollIntoView({ block: "end" });
  }, [state.activeChat?.chatId, state.messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || state.sending) return;
    setDraft("");
    const result = await state.send(message);
    if (!result.ok) setDraft(message);
  };

  if (state.activeChat) {
    const member = state.activeChat.user;
    const header = (
      <PageHeader
        title={member?.name || "Conversation"}
        subtitle={member?.role ? String(member.role).replace(/_/g, " ") : "Direct message"}
        onBack={state.closeConversation}
        backLabel="Back to messages"
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
                  body="Write a clear first message. You can share files and schedule meetings from the desktop workspace."
                />
              ) : state.messages.map((message, index) => {
                const mine = messageSenderId(message) === String(user?._id || "");
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
                disabled={!draft.trim()}
                aria-label="Send message"
              >
                Send
              </Button>
            </div>
          </form>
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
