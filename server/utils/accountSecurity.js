const sessionIdOf = (session) => String(session?.sessionId || "").trim();

export function retainCurrentSession(sessions = [], currentSessionId = "") {
  const current = String(currentSessionId || "").trim();
  if (!current) return [];
  return (Array.isArray(sessions) ? sessions : []).filter((session) => sessionIdOf(session) === current);
}

export function canRevokeRemoteSession(targetSessionId = "", currentSessionId = "") {
  const target = String(targetSessionId || "").trim();
  const current = String(currentSessionId || "").trim();
  return Boolean(target && target !== current);
}
