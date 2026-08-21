import { isFilmIndustryProfessionalRole, isWriterRole } from "./industryAccess.js";

/**
 * Resolve the two supported first-message relationships without treating the
 * historical `investor` role as the whole film-industry audience.
 */
export function resolveDirectMessagePair(sender = {}, receiver = {}) {
  const senderWriter = isWriterRole(sender);
  const receiverWriter = isWriterRole(receiver);
  const senderIndustry = isFilmIndustryProfessionalRole(sender);
  const receiverIndustry = isFilmIndustryProfessionalRole(receiver);
  const senderAdmin = String(sender.role || "").toLowerCase() === "admin";
  const receiverAdmin = String(receiver.role || "").toLowerCase() === "admin";
  const adminWriter = (senderAdmin && receiverWriter) || (receiverAdmin && senderWriter);
  const marketplacePair = (senderIndustry && receiverWriter) || (receiverIndustry && senderWriter);

  return {
    allowed: adminWriter || marketplacePair,
    adminWriter,
    marketplacePair,
    writerId: senderWriter ? sender._id : receiverWriter ? receiver._id : null,
    industryId: senderIndustry ? sender._id : receiverIndustry ? receiver._id : null,
    senderIsIndustry: senderIndustry,
    receiverIsWriter: receiverWriter,
  };
}
