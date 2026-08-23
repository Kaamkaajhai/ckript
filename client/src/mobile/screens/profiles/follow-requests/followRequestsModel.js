const text = (value) => String(value ?? "").trim();

const roleLabel = (value) => text(value)
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function buildIncomingFollowRequestList(requests = []) {
  return (Array.isArray(requests) ? requests : [])
    .map((request) => {
      const member = request?.from || {};
      const fromUserId = text(member._id);
      const username = text(member.writerProfile?.username);
      return {
        id: text(request?._id) || fromUserId,
        fromUserId,
        name: text(member.name) || "Ckript member",
        role: roleLabel(member.role) || "Member",
        bio: text(member.bio),
        image: text(member.profileImage),
        profilePath: fromUserId ? `/profile/${encodeURIComponent(username || fromUserId)}` : "",
        createdAt: request?.createdAt || null,
      };
    })
    .filter(({ id, fromUserId }) => id && fromUserId);
}
