/**
 * The single full-screenplay authorization decision.
 *
 * Marketplace visibility and preview availability are deliberately absent:
 * they decide whether a listing or its projected sample may be seen, never
 * whether the complete screenplay body or stored PDF may leave the server.
 */
export const canReadFullScript = ({
  isOwner = false,
  isAdmin = false,
  isBuyer = false,
  canCollaboratorRead = false,
} = {}) => Boolean(isOwner || isAdmin || isBuyer || canCollaboratorRead);

export const FULL_SCRIPT_ACCESS_MESSAGE =
  "Full screenplay access is available to the writer, accepted collaborators, administrators, and buyers.";
