import { useContext, useMemo, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import api from "../../../services/api";
import SocialShareButton from "../../../components/SocialShareButton";
import { hasActiveFilmIndustryProfessionalAccess } from "../../../utils/industryAccess";
import { getScriptCanonicalPath } from "../../../utils/scriptPath";

const projectGenre = (script) =>
  script?.primaryGenre ||
  script?.genre ||
  script?.classification?.genres?.[0] ||
  script?.genres?.[0] ||
  "Unspecified";

const projectStatus = (script) => {
  if (script?.status === "pending_approval") return "In review";
  if (script?.status === "rejected") return "Rejected";
  if (script?.status === "approved" || script?.status === "published") return "Published";
  return String(script?.status || "Unavailable").replace(/_/g, " ");
};

const projectFormat = (script) => {
  const format = script?.format === "other" ? script?.formatOther : script?.format;
  return titleCase(format || script?.contentType || "Script");
};

const initials = (value = "") =>
  String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

const titleCase = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getRepresentationLabel = (writer = {}) => {
  const labels = {
    manager: "Managed",
    agent: "Signed",
    manager_and_agent: "Signed & Managed",
    unrepresented: "Independent",
  };
  return labels[writer.representationStatus] || titleCase(writer.representationStatus || "Independent");
};

const getLocationLabel = (profile = {}) => {
  const address = profile.address || {};
  return address.formatted || [address.city, address.state, address.country].filter(Boolean).join(", ") || "Not provided";
};

function VerifiedMark({ active, label }) {
  return (
    <span className="profile-pc-page__verified-mark" data-active={active ? "true" : "false"} aria-label={`${label}: ${active ? "verified" : "not verified"}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.75l2.05 1.72 2.65-.18 1.07 2.44 2.34 1.27-.56 2.6 1.2 2.37-1.68 2.06-.18 2.65-2.44 1.07L15.18 21l-2.6-.56L10.2 21l-2.05-1.72-2.65.18-1.07-2.44-2.34-1.27.56-2.6-1.2-2.37 1.68-2.06.18-2.65 2.44-1.07L7.02 2.6l2.6.56L12 2.75z" />
        <path d="M8.2 12.1l2.35 2.35 5.3-5.3" />
      </svg>
    </span>
  );
}

export function ProfileWorkspaceIdentity({
  profile,
  scriptsCount,
  isOwnProfile,
  resolvedImage,
  memberSince,
  profileShare,
  isFollowing,
  isFollowsMe,
  followLoading,
  followRequestPending,
  isBlockedByCurrent,
  blockedByProfile,
  blockingAction,
  onFollow,
  onBlock,
  onEdit,
  onMessage,
  onFollowers,
  onFollowing,
  canViewContactDetails,
  contactAlreadyRevealed,
  contactRevealBlocked,
  contactRevealLoading,
  contactRevealError,
  contactsUsed,
  contactsLimit,
  remainingContacts,
  showContactDetails,
  onToggleContact,
  onRevealContact,
  revealedContact,
  contactLinks,
}) {
  const writer = profile?.writerProfile || {};
  const username = writer.username ? `@${writer.username}` : "";
  const representation = `${getRepresentationLabel(writer)}${writer.agencyName ? ` · ${writer.agencyName}` : ""}`;
  const wgaVerified = writer.membershipVerification?.wga?.status === "approved";
  const swaVerified = writer.membershipVerification?.swa?.status === "approved";
  const planLabel = hasActiveFilmIndustryProfessionalAccess(profile)
    ? "Pro"
    : profile.subscription?.accessStatus === "active" && profile.subscription?.plan
      ? titleCase(profile.subscription.plan)
      : "";
  const revealProgress = Math.min(100, (Number(contactsUsed || 0) / Math.max(Number(contactsLimit || 1), 1)) * 100);
  const visibleContact = isOwnProfile || (contactAlreadyRevealed && showContactDetails);
  const email = isOwnProfile ? profile.email : revealedContact?.email || profile.email;
  const phone = isOwnProfile ? profile.phone : revealedContact?.phone || profile.phone;
  const visibleLinks = isOwnProfile || contactAlreadyRevealed ? contactLinks : [];

  return (
    <aside className="profile-workspace-identity" aria-label="Writer identity">
      {profile.profileImage ? (
        <img className="profile-workspace-identity__avatar" src={resolvedImage} alt={profile.name} />
      ) : (
        <div className="profile-workspace-identity__avatar" aria-hidden="true">{initials(profile.name)}</div>
      )}

      <h1 className="profile-workspace-identity__name">{profile.name}</h1>
      {username && <div className="profile-workspace-identity__username">{username}</div>}

      <div className="profile-workspace-identity__badges" aria-label="Profile credentials">
        <span className="profile-workspace-identity__role">Writer</span>
        {planLabel && <><span aria-hidden="true">·</span><span className="profile-workspace-identity__plan">{planLabel}</span></>}
        {(writer.wgaMember || wgaVerified) && <><span aria-hidden="true">·</span><span className="profile-workspace-identity__guild"><VerifiedMark active={wgaVerified} label="WGA" />WGA</span></>}
        {(writer.sgaMember || swaVerified) && <><span aria-hidden="true">·</span><span className="profile-workspace-identity__guild"><VerifiedMark active={swaVerified} label="SWA" />SWA</span></>}
      </div>

      <p className="profile-workspace-identity__representation">
        {representation}
        {memberSince && <><br />Member since {memberSince}</>}
      </p>

      <div className="profile-workspace-stats" aria-label="Profile statistics">
        <div className="profile-workspace-stat"><strong>{scriptsCount}</strong><span>Projects</span></div>
        <button type="button" className="profile-workspace-stat" onClick={onFollowers}>
          <strong>{profile.followers?.length || 0}</strong><span>Followers</span>
        </button>
        <button type="button" className="profile-workspace-stat" onClick={onFollowing}>
          <strong>{profile.following?.length || 0}</strong><span>Following</span>
        </button>
      </div>

      <div className="profile-workspace-actions">
        {isOwnProfile ? (
          <button type="button" className="profile-workspace-btn profile-workspace-btn--primary" onClick={onEdit}>Edit profile</button>
        ) : (
          <button
            type="button"
            className={`profile-workspace-btn ${isFollowing || followRequestPending ? "" : "profile-workspace-btn--accent"}`}
            onClick={onFollow}
            disabled={isBlockedByCurrent || blockedByProfile || followLoading}
          >
            {followLoading ? "Updating…" : blockedByProfile ? "Blocked you" : isBlockedByCurrent ? "Blocked" : isFollowing ? "Following" : followRequestPending ? "Requested" : isFollowsMe ? "Follow back" : "Follow"}
          </button>
        )}

        <div className={`profile-workspace-actions__row${isOwnProfile ? " profile-workspace-actions__row--single" : ""}`}>
          {!isOwnProfile && (
            <button type="button" className="profile-workspace-btn profile-workspace-btn--primary" onClick={onMessage} disabled={isBlockedByCurrent || blockedByProfile}>
              Message
            </button>
          )}
          <SocialShareButton share={profileShare} buttonLabel="Share" className="profile-workspace-btn" />
          {!isOwnProfile && (
            <button
              type="button"
              className={`profile-workspace-btn ${isBlockedByCurrent ? "" : "profile-workspace-btn--danger"}`}
              onClick={onBlock}
              disabled={blockingAction || blockedByProfile}
            >
              {blockingAction ? "Updating…" : isBlockedByCurrent ? "Unblock" : "Block"}
            </button>
          )}
        </div>
      </div>

      <section className="profile-workspace-contact" aria-labelledby="profile-contact-heading">
        <div className="profile-workspace-contact__head">
          <span id="profile-contact-heading">Contact details</span>
          {canViewContactDetails && <span>{contactsUsed}/{contactsLimit} used</span>}
        </div>

        {canViewContactDetails && (
          <div className="profile-workspace-contact__bar" aria-hidden="true">
            <span style={{ width: `${revealProgress}%` }} />
          </div>
        )}

        {visibleContact ? (
          <p className="profile-workspace-contact__copy">
            {email ? <a href={`mailto:${email}`}>{email}</a> : "Email not shared"}
            {phone && <><br />{phone}</>}
          </p>
        ) : canViewContactDetails ? (
          <p className="profile-workspace-contact__copy">
            Contact information is protected. {remainingContacts > 0 ? `${remainingContacts} reveal${remainingContacts === 1 ? "" : "s"} remaining.` : "Your reveal limit has been reached."}
          </p>
        ) : (
          <p className="profile-workspace-contact__copy">
            {isOwnProfile ? "Your contact details are visible here." : "Contact details are available to eligible film-industry accounts."}
          </p>
        )}

        {contactRevealError && <p className="profile-workspace-contact__copy profile-workspace-contact__error" role="alert">{contactRevealError}</p>}

        {!isOwnProfile && canViewContactDetails && (
          contactAlreadyRevealed ? (
            <button type="button" className="profile-workspace-btn" onClick={onToggleContact}>{showContactDetails ? "Hide contact" : "View contact"}</button>
          ) : contactRevealBlocked ? (
            <button type="button" className="profile-workspace-btn" disabled>Monthly limit reached</button>
          ) : (
            <button type="button" className="profile-workspace-btn profile-workspace-btn--accent" onClick={onRevealContact} disabled={contactRevealLoading}>
              {contactRevealLoading ? "Revealing…" : "Reveal contact · uses 1 credit"}
            </button>
          )
        )}
      </section>

      {visibleLinks.length > 0 && (
        <nav className="profile-workspace-identity__links" aria-label="External profile links">
          {visibleLinks.map((item) => (
            <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>
          ))}
        </nav>
      )}
    </aside>
  );
}

function ProfileDetails({ profile }) {
  const writer = profile?.writerProfile || {};
  const membershipRows = [
    {
      key: "wga",
      name: "Writers Guild of America",
      requested: Boolean(writer.wgaMember || writer.membershipVerification?.wga?.requested),
      verified: writer.membershipVerification?.wga?.status === "approved",
    },
    {
      key: "swa",
      name: "Screenwriters Association",
      requested: Boolean(writer.sgaMember || writer.membershipVerification?.swa?.requested),
      verified: writer.membershipVerification?.swa?.status === "approved",
    },
  ].filter((membership) => membership.requested);
  const genres = Array.from(new Set([...(writer.genres || []), ...(writer.specializedTags || [])].filter(Boolean)));
  const skills = Array.from(new Set((profile.skills || []).filter(Boolean)));

  return (
    <div className="profile-workspace-overview__grid">
      <section className="profile-workspace-card" aria-labelledby="writer-profile-heading">
        <h2 id="writer-profile-heading">Writer profile</h2>
        <dl className="profile-workspace-facts">
          <div><dt>Username</dt><dd>{writer.username ? `@${writer.username}` : "Not set"}</dd></div>
          <div><dt>Representation</dt><dd>{getRepresentationLabel(writer)}</dd></div>
          {writer.agencyName && <div><dt>Agency</dt><dd>{writer.agencyName}</dd></div>}
          <div><dt>Based in</dt><dd>{getLocationLabel(profile)}</dd></div>
        </dl>
      </section>

      <section className="profile-workspace-card" aria-labelledby="guild-memberships-heading">
        <h2 id="guild-memberships-heading">Guild memberships</h2>
        {membershipRows.length > 0 ? (
          <div className="profile-workspace-memberships">
            {membershipRows.map((membership) => (
              <div key={membership.key}>
                <span className="profile-workspace-memberships__icon" aria-hidden="true">{membership.key === "wga" ? "W" : "S"}</span>
                <span><strong>{membership.name}</strong><small>{membership.verified ? "Verified" : "Verification pending"}</small></span>
                <VerifiedMark active={membership.verified} label={membership.name} />
              </div>
            ))}
          </div>
        ) : <p className="profile-workspace-card__empty">No guild memberships listed.</p>}
      </section>

      <section className="profile-workspace-card" aria-labelledby="genres-heading">
        <h2 id="genres-heading">Genres · Tags</h2>
        {genres.length > 0 ? (
          <div className="profile-workspace-chips">
            {genres.map((item) => <span key={item}>{item}</span>)}
          </div>
        ) : <p className="profile-workspace-card__empty">No genres or tags added.</p>}
      </section>

      <section className="profile-workspace-card profile-workspace-card--wide" aria-labelledby="skills-heading">
        <h2 id="skills-heading">Skills & expertise</h2>
        {skills.length > 0 ? (
          <div className="profile-workspace-skill-list">
            {skills.map((skill) => <span key={skill}><b aria-hidden="true">✓</b>{skill}</span>)}
          </div>
        ) : <p className="profile-workspace-card__empty">No skills added yet.</p>}
      </section>
    </div>
  );
}

export function ProfileWorkspaceOverview({ profile, scripts, isOwnProfile, navigate, renderDelete, onViewAll }) {
  return (
    <div className="profile-workspace-overview">
      <section className="profile-workspace-card profile-workspace-card--wide" aria-labelledby="about-heading">
        <h2 id="about-heading">About</h2>
        <p className="profile-workspace-about-copy">{profile.bio || "No bio added yet."}</p>
      </section>
      <ProfileDetails profile={profile} />
      <ProfileWorkspaceProjects
        scripts={scripts}
        profile={profile}
        isOwnProfile={isOwnProfile}
        navigate={navigate}
        renderDelete={renderDelete}
        limit={5}
        showToolbar={false}
        onViewAll={onViewAll}
      />
    </div>
  );
}

export function ProfileWorkspaceCredentials({ profile }) {
  return (
    <div className="profile-workspace-overview">
      <ProfileDetails profile={profile} />
    </div>
  );
}

export function ProfileWorkspaceProjects({ scripts, profile, isOwnProfile, navigate, renderDelete, limit, showToolbar = true, onViewAll }) {
  const { user, setUser } = useContext(AuthContext);
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("Recent");
  const [bookmarkOverrides, setBookmarkOverrides] = useState(() => new Map());
  const favoriteIds = Array.isArray(user?.favoriteScripts) ? user.favoriteScripts : [];
  const bookmarks = new Set(favoriteIds.map((item) => typeof item === "string" ? item : item?._id).filter(Boolean));

  const genres = useMemo(() => ["All", ...Array.from(new Set(scripts.map(projectGenre))).sort()], [scripts]);
  const rows = useMemo(() => {
    const next = genre === "All" ? [...scripts] : scripts.filter((script) => projectGenre(script) === genre);
    next.sort((a, b) => {
      if (sort === "Most viewed") return Number(b.views || 0) - Number(a.views || 0);
      if (sort === "A–Z") return String(a.title || "").localeCompare(String(b.title || ""));
      if (sort === "Published first") {
        const aPublished = ["approved", "published"].includes(a.status) ? 1 : 0;
        const bPublished = ["approved", "published"].includes(b.status) ? 1 : 0;
        if (aPublished !== bPublished) return bPublished - aPublished;
      }
      return new Date(b.publishedAt || b.updatedAt || b.createdAt || 0) - new Date(a.publishedAt || a.updatedAt || a.createdAt || 0);
    });
    return next;
  }, [genre, scripts, sort]);
  const visibleRows = Number.isFinite(limit) ? rows.slice(0, limit) : rows;

  const openProject = (script) => {
    if (!["approved", "published"].includes(script?.status)) return;
    api.post(`/scripts/${script._id}/interactions`, { type: "click", source: "profile_workspace", metadata: { from: "profile" } }).catch(() => null);
    navigate(getScriptCanonicalPath(script));
  };

  const toggleBookmark = async (event, script) => {
    event.stopPropagation();
    if (!user?._id || !script?._id || script?.creator?._id === user._id) return;
    try {
      const { data } = await api.post(`/scripts/${script._id}/favorite`);
      const favorited = Boolean(data?.favorited);
      setBookmarkOverrides((previous) => {
        const next = new Map(previous);
        next.set(script._id, favorited);
        return next;
      });
      setUser((previous) => {
        if (!previous) return previous;
        const ids = Array.isArray(previous.favoriteScripts)
          ? previous.favoriteScripts.map((item) => typeof item === "string" ? item : item?._id).filter(Boolean)
          : [];
        const favoriteScripts = favorited ? Array.from(new Set([...ids, script._id])) : ids.filter((id) => id !== script._id);
        const updated = { ...previous, favoriteScripts };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
      window.dispatchEvent(new CustomEvent("bookmarkUpdated", { detail: { scriptId: script._id, bookmarked: favorited } }));
    } catch {
      // Keep the existing card behavior: a failed bookmark leaves the previous state intact.
    }
  };

  return (
    <section className="profile-workspace-projects" aria-labelledby="profile-projects-heading">
      <div className="profile-workspace-projects__toolbar">
        <h2 id="profile-projects-heading">Projects · {rows.length}{genre === "All" ? "" : ` of ${scripts.length}`}</h2>
        {showToolbar && <>
          <label>
            <span className="sr-only">Filter by genre</span>
            <select className="profile-workspace-select" value={genre} onChange={(event) => setGenre(event.target.value)}>
              {genres.map((item) => <option key={item} value={item}>{item === "All" ? "All genres" : item}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort projects</span>
            <select className="profile-workspace-select" value={sort} onChange={(event) => setSort(event.target.value)}>
              {["Recent", "Most viewed", "A–Z", "Published first"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </>}
        {!showToolbar && rows.length > 0 && onViewAll && (
          <button type="button" className="profile-workspace-projects__view-all" onClick={onViewAll}>View all {scripts.length} <span aria-hidden="true">›</span></button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="profile-workspace-empty">
          <strong>{scripts.length === 0 ? "No published projects yet" : `No projects match “${genre}”`}</strong>
          <span>{isOwnProfile && scripts.length === 0 ? "Upload your first script to get started." : "Try another genre or check back later."}</span>
        </div>
      ) : (
        <div role="table" aria-label={`${profile.name}'s projects`}>
          <div className="profile-workspace-projects__header" role="row">
            <span aria-hidden="true" /><span>Title</span><span>Genre</span><span>Views</span><span>Status</span><span>Actions</span>
          </div>
          {visibleRows.map((script) => {
            const clickable = ["approved", "published"].includes(script.status);
            const saved = bookmarkOverrides.has(script._id)
              ? bookmarkOverrides.get(script._id)
              : bookmarks.has(script._id);
            const canBookmark = Boolean(!isOwnProfile && user?._id && script?.creator?._id !== user._id);
            return (
              <div
                key={script._id}
                className="profile-workspace-project-row group/card"
                role="row"
                tabIndex={clickable ? 0 : undefined}
                data-clickable={clickable}
                onClick={() => openProject(script)}
                onKeyDown={(event) => {
                  if (clickable && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    openProject(script);
                  }
                }}
              >
                <span className="profile-workspace-project-row__mono" aria-hidden="true">{initials(script.title)}</span>
                <span>
                  <span className="profile-workspace-project-row__title">{script.title || "Untitled project"}</span>
                  <span className="profile-workspace-project-row__logline">{script.logline || script.synopsis || "No logline provided"}</span>
                </span>
                <span className="profile-workspace-project-row__meta">{projectGenre(script)}</span>
                <span className="profile-workspace-project-row__meta">{new Intl.NumberFormat("en-IN", { notation: Number(script.views || 0) >= 1000 ? "compact" : "standard" }).format(Number(script.views || 0))}</span>
                <span className="profile-workspace-project-row__status" data-status={script.status}>{projectStatus(script)}</span>
                <span className="profile-workspace-project-row__actions">
                  {canBookmark && (
                    <button
                      type="button"
                      className="profile-workspace-icon-btn"
                      aria-label={saved ? `Remove ${script.title} from bookmarks` : `Bookmark ${script.title}`}
                      aria-pressed={saved}
                      onClick={(event) => toggleBookmark(event, script)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5a.75.75 0 01.75.75v15.69a.75.75 0 01-1.219.594L12 16.34l-6.281 5.194a.75.75 0 01-1.219-.594V5.25a.75.75 0 01.75-.75z" />
                      </svg>
                    </button>
                  )}
                  {isOwnProfile && renderDelete?.(script)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProfileWorkspaceBookmarks({ scripts, navigate, onRemoved }) {
  const { user, setUser } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("Recently updated");
  const [removingId, setRemovingId] = useState("");
  const [removeError, setRemoveError] = useState("");

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = scripts.filter((script) => {
      if (!normalizedQuery) return true;
      return [
        script?.title,
        script?.logline,
        script?.synopsis,
        script?.creator?.name,
        projectGenre(script),
        projectFormat(script),
      ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
    });

    next.sort((a, b) => {
      if (sort === "Most viewed") return Number(b?.views || 0) - Number(a?.views || 0);
      if (sort === "A–Z") return String(a?.title || "").localeCompare(String(b?.title || ""));
      return new Date(b?.updatedAt || b?.publishedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.publishedAt || a?.createdAt || 0);
    });
    return next;
  }, [query, scripts, sort]);

  const openProject = (script) => {
    if (!["approved", "published"].includes(script?.status)) return;
    api.post(`/scripts/${script._id}/interactions`, {
      type: "click",
      source: "profile_bookmarks",
      metadata: { from: "profile" },
    }).catch(() => null);
    navigate(getScriptCanonicalPath(script));
  };

  const removeBookmark = async (script) => {
    if (!user?._id || !script?._id || removingId) return;
    setRemoveError("");
    setRemovingId(script._id);
    try {
      const { data } = await api.post(`/scripts/${script._id}/favorite`);
      const favorited = Boolean(data?.favorited);
      setUser((previous) => {
        if (!previous) return previous;
        const ids = Array.isArray(previous.favoriteScripts)
          ? previous.favoriteScripts.map((item) => typeof item === "string" ? item : item?._id).filter(Boolean)
          : [];
        const favoriteScripts = favorited
          ? Array.from(new Set([...ids, script._id]))
          : ids.filter((id) => id !== script._id);
        const updated = { ...previous, favoriteScripts };
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
      if (!favorited) onRemoved?.(script._id);
      window.dispatchEvent(new CustomEvent("bookmarkUpdated", { detail: { scriptId: script._id, bookmarked: favorited } }));
    } catch (error) {
      setRemoveError(error?.response?.data?.message || "Could not remove that bookmark. Try again.");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <section className="profile-workspace-bookmarks" aria-labelledby="profile-bookmarks-heading">
      <header className="profile-workspace-bookmarks__header">
        <div className="profile-workspace-bookmarks__heading">
          <span className="profile-workspace-bookmarks__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3.75h12a1 1 0 011 1v15.18a.75.75 0 01-1.2.6L12 16.18l-5.8 4.35a.75.75 0 01-1.2-.6V4.75a1 1 0 011-1z" /></svg>
          </span>
          <div>
            <h2 id="profile-bookmarks-heading">Saved projects</h2>
            <p>{scripts.length === 1 ? "1 project saved for later" : `${scripts.length} projects saved for later`}</p>
          </div>
        </div>

        {scripts.length > 0 && (
          <div className="profile-workspace-bookmarks__tools">
            <label className="profile-workspace-bookmarks__search">
              <span className="profile-workspace-bookmarks__sr">Search saved projects</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved projects" />
            </label>
            <label>
              <span className="profile-workspace-bookmarks__sr">Sort saved projects</span>
              <select className="profile-workspace-select" value={sort} onChange={(event) => setSort(event.target.value)}>
                {["Recently updated", "Most viewed", "A–Z"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        )}
      </header>

      {removeError && <p className="profile-workspace-bookmarks__error" role="alert">{removeError}</p>}

      {scripts.length === 0 ? (
        <div className="profile-workspace-bookmarks__empty">
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.75h12a1 1 0 011 1v15.18a.75.75 0 01-1.2.6L12 16.18l-5.8 4.35a.75.75 0 01-1.2-.6V4.75a1 1 0 011-1z" /></svg></span>
          <strong>Build your saved library</strong>
          <p>Bookmark scripts that catch your eye and they will stay organized here.</p>
          <button type="button" onClick={() => navigate("/top-script")}>Explore projects <span aria-hidden="true">↗</span></button>
        </div>
      ) : rows.length === 0 ? (
        <div className="profile-workspace-bookmarks__empty profile-workspace-bookmarks__empty--compact">
          <strong>No saved projects match “{query}”</strong>
          <p>Try a title, writer, genre, or format.</p>
          <button type="button" onClick={() => setQuery("")}>Clear search</button>
        </div>
      ) : (
        <div className="profile-workspace-bookmarks__list" role="list">
          {rows.map((script) => {
            const clickable = ["approved", "published"].includes(script?.status);
            const score = script?.platformScore?.overall ?? script?.scriptScore?.overall;
            const creator = script?.creator?.name || "Unknown writer";
            return (
              <article className="profile-workspace-bookmark-row" key={script._id} role="listitem">
                <span className="profile-workspace-bookmark-row__mono" aria-hidden="true">{initials(script?.title)}</span>
                <div className="profile-workspace-bookmark-row__body">
                  <button type="button" className="profile-workspace-bookmark-row__title" onClick={() => openProject(script)} disabled={!clickable}>
                    {script?.title || "Untitled project"}
                  </button>
                  <p className="profile-workspace-bookmark-row__author">by {creator}</p>
                  <p className="profile-workspace-bookmark-row__logline">{script?.logline || script?.synopsis || "No logline provided"}</p>
                  <div className="profile-workspace-bookmark-row__tags">
                    <span>{projectGenre(script)}</span>
                    <span>{projectFormat(script)}</span>
                    <span className="profile-workspace-project-row__status" data-status={script?.status}>{projectStatus(script)}</span>
                  </div>
                </div>
                <dl className="profile-workspace-bookmark-row__metrics">
                  <div><dt>Score</dt><dd>{score ?? "—"}</dd></div>
                  <div><dt>Views</dt><dd>{new Intl.NumberFormat("en-IN", { notation: Number(script?.views || 0) >= 1000 ? "compact" : "standard" }).format(Number(script?.views || 0))}</dd></div>
                </dl>
                <div className="profile-workspace-bookmark-row__actions">
                  <button type="button" className="profile-workspace-bookmark-row__open" onClick={() => openProject(script)} disabled={!clickable}>
                    Open <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    type="button"
                    className="profile-workspace-icon-btn profile-workspace-icon-btn--saved"
                    aria-label={`Remove ${script?.title || "project"} from bookmarks`}
                    aria-pressed="true"
                    onClick={() => removeBookmark(script)}
                    disabled={Boolean(removingId)}
                  >
                    {removingId === script._id ? (
                      <span className="profile-workspace-bookmark-row__spinner" aria-hidden="true" />
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5a.75.75 0 01.75.75v15.69a.75.75 0 01-1.219.594L12 16.34l-6.281 5.194a.75.75 0 01-1.219-.594V5.25a.75.75 0 01.75-.75z" /></svg>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const getMeetingDate = (meeting) => {
  const value = meeting?.startAt || meeting?.scheduledDate;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getMeetingStatusLabel = (status) => {
  if (status === "accepted") return "Confirmed";
  if (status === "rejected") return "Declined";
  if (status === "cancelled") return "Cancelled";
  return "Awaiting response";
};

export function ProfileWorkspaceMeetings({ meetings, loading, currentUserId, onStatusChange }) {
  const [filter, setFilter] = useState("All");
  const [actionId, setActionId] = useState("");
  const [actionError, setActionError] = useState("");

  const pendingCount = meetings.filter((meeting) => meeting?.status === "pending").length;
  const scheduledCount = meetings.filter((meeting) => meeting?.status !== "rejected" && meeting?.status !== "cancelled").length;

  const rows = useMemo(() => {
    const statusByFilter = {
      Pending: "pending",
      Confirmed: "accepted",
      Declined: "rejected",
    };
    const filtered = filter === "All"
      ? [...meetings]
      : meetings.filter((meeting) => meeting?.status === statusByFilter[filter]);

    return filtered.sort((a, b) => {
      const aTime = getMeetingDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
      const bTime = getMeetingDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, [filter, meetings]);

  const changeStatus = async (meetingId, status) => {
    if (!meetingId || actionId) return;
    setActionError("");
    setActionId(meetingId);
    try {
      await onStatusChange(meetingId, status);
    } catch (error) {
      setActionError(error?.response?.data?.message || "Could not update this meeting. Try again.");
    } finally {
      setActionId("");
    }
  };

  return (
    <section className="profile-workspace-meetings" aria-labelledby="profile-meetings-heading">
      <header className="profile-workspace-meetings__header">
        <div className="profile-workspace-meetings__heading">
          <span className="profile-workspace-meetings__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 012 2v11.5a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
          </span>
          <div>
            <h2 id="profile-meetings-heading">Meetings</h2>
            <p>{scheduledCount} scheduled · {pendingCount} awaiting response</p>
          </div>
        </div>

        {meetings.length > 0 && (
          <label>
            <span className="profile-workspace-meetings__sr">Filter meetings</span>
            <select className="profile-workspace-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
              {["All", "Pending", "Confirmed", "Declined"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
      </header>

      {actionError && <p className="profile-workspace-meetings__error" role="alert">{actionError}</p>}

      {loading ? (
        <div className="profile-workspace-meetings__loading" aria-busy="true" aria-label="Loading meetings">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <span /><span><i /><i /><i /></span><span />
            </div>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="profile-workspace-meetings__empty">
          <span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 7.5v5l3 2m5-2a8 8 0 11-16 0 8 8 0 0116 0z" /></svg></span>
          <strong>Your meeting desk is clear</strong>
          <p>New requests and confirmed conversations will appear here with their local date and time.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="profile-workspace-meetings__empty profile-workspace-meetings__empty--compact">
          <strong>No {filter.toLowerCase()} meetings</strong>
          <p>Choose another status to review the rest of your meeting history.</p>
          <button type="button" onClick={() => setFilter("All")}>Show all meetings</button>
        </div>
      ) : (
        <div className="profile-workspace-meetings__list" role="list">
          {rows.map((meeting) => {
            const date = getMeetingDate(meeting);
            const isRequester = String(meeting?.producer) === String(currentUserId);
            const participant = isRequester ? meeting?.writer_name : meeting?.producer_name;
            const canRespond = !isRequester && meeting?.status === "pending";
            const isWorking = actionId === meeting?._id;
            const time = meeting?.startAt && date
              ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })
              : meeting?.scheduledTime || "Time to be confirmed";
            return (
              <article className="profile-workspace-meeting-row" key={meeting._id} role="listitem">
                <time className="profile-workspace-meeting-row__date" dateTime={date?.toISOString()}>
                  <span>{date ? date.toLocaleDateString([], { month: "short" }) : "TBD"}</span>
                  <strong>{date ? date.toLocaleDateString([], { day: "2-digit" }) : "—"}</strong>
                  <small>{date ? date.toLocaleDateString([], { year: "numeric" }) : ""}</small>
                </time>

                <div className="profile-workspace-meeting-row__body">
                  <div className="profile-workspace-meeting-row__title-line">
                    <h3>{meeting?.title || "Project conversation"}</h3>
                    <span className="profile-workspace-meeting-row__status" data-status={meeting?.status}>{getMeetingStatusLabel(meeting?.status)}</span>
                  </div>
                  <p className="profile-workspace-meeting-row__participant">
                    {isRequester ? "Meeting with" : "Request from"} <strong>{participant || "Ckript member"}</strong>
                    {meeting?.script_name && <><span aria-hidden="true"> · </span>about <em>{meeting.script_name}</em></>}
                  </p>
                  <div className="profile-workspace-meeting-row__meta">
                    <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{time}</span>
                    <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{date ? date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "Date to be confirmed"}</span>
                    <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7h6m-3-3v3m-5 5h10M7 17h6" /></svg>{meeting?.duration || 30} minutes</span>
                  </div>
                  {meeting?.message && <blockquote>“{meeting.message}”</blockquote>}
                </div>

                <div className="profile-workspace-meeting-row__actions">
                  {meeting?.status === "accepted" && meeting?.meetingLink && (
                    <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">Join meeting <span aria-hidden="true">↗</span></a>
                  )}
                  {meeting?.status === "accepted" && !meeting?.meetingLink && <span className="profile-workspace-meeting-row__link-pending">Link pending</span>}
                  {canRespond && (
                    <>
                      <button type="button" className="profile-workspace-meeting-row__accept" onClick={() => changeStatus(meeting._id, "accepted")} disabled={Boolean(actionId)}>
                        {isWorking ? "Updating…" : "Accept"}
                      </button>
                      <button type="button" className="profile-workspace-meeting-row__decline" onClick={() => changeStatus(meeting._id, "rejected")} disabled={Boolean(actionId)}>Decline</button>
                    </>
                  )}
                  {isRequester && meeting?.status === "pending" && <span className="profile-workspace-meeting-row__link-pending">Waiting for reply</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
