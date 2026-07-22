import { canRoleWrite } from "../../constants/collabRoles";
const present = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return Boolean(String(value ?? "").trim());
};

const ratio = (checks) => checks.filter(Boolean).length / Math.max(checks.length, 1);

export const getViewerCapabilities = ({ script = {}, user = {} } = {}) => {
  const viewerId = String(user?._id || user?.id || "");
  const creatorId = String(script?.creator?._id || script?.creator || "");
  const currentCollaborator = Array.isArray(script?.collaborators)
    ? script.collaborators.find((entry) => {
        const id = String(entry?.userId?._id || entry?.userId || "");
        return id === viewerId && entry?.status === "accepted" && entry?.isActive !== false;
      })
    : null;
  const collaborator = Boolean(script?.isCollaborator || currentCollaborator);
  const collaboratorRole = String(script?.collaboratorRole || currentCollaborator?.role || "").toLowerCase();
  const owner = Boolean(script?.isCreator || (viewerId && creatorId && viewerId === creatorId));
  const role = String(user?.role || "").toLowerCase();
  const industry = ["investor", "producer", "director", "industry", "professional"].includes(role);
  const reader = role === "reader";
  const fullScript = Boolean(
    owner || collaborator || script?.isUnlocked || script?.isAdmin || script?.canViewFullScript
  );

  return {
    owner,
    collaborator,
    collaboratorRole,
    industry,
    reader,
    buyer: Boolean(script?.isUnlocked && !owner && !collaborator),
    fullScript,
    // canEditScript comes from the server (mirrors PERMISSIONS.write); the role check is a local
    // fallback and must cover every write-capable role, not just editor.
    canEdit: Boolean(script?._id && (owner || script?.canEditScript || canRoleWrite(collaboratorRole))),
    canCollaborate: Boolean(script?._id && (owner || collaborator)),
    canBookmark: Boolean(viewerId && !owner && !collaborator),
    canPurchase: Boolean(!owner && !collaborator && script?.canPurchase && !script?.isSold),
  };
};

export const deriveScriptJourney = ({ script = {}, capabilities = {} } = {}) => {
  const classification = script?.classification || {};
  const film = script?.filmDetails || {};
  const score = script?.scriptScore || {};
  const platform = script?.platformScore || {};
  const rights = script?.rightsLicensing || {};
  const previewTexts = Array.isArray(script?.scriptPreviewPageTexts)
    ? script.scriptPreviewPageTexts.filter((item) => present(item))
    : [];
  const hasFullSource = present(script?.fountainContent) || present(script?.textContent) || present(script?.fullContent) || present(script?.fileUrl);
  const hasPreviewSource = Boolean(script?.viewableScript && (previewTexts.length || present(script?.previewExcerpt) || present(script?.fileUrl)));
  const hasTrailer = present(script?.trailerUrl) || present(script?.uploadedTrailerUrl);
  const hasClassification = present(classification?.primaryGenre || script?.primaryGenre || script?.genre)
    && (present(classification?.tones) || present(classification?.themes) || present(classification?.settings));
  const transactionAvailable = !script?.isSold
    && !["sold_licensed"].includes(String(script?.transactionStatus || ""))
    && String(script?.holdStatus || "available") !== "sold";

  const stageDefinitions = [
    {
      id: "story",
      number: "01",
      title: "Understand the story",
      checks: [
        present(script?.title),
        present(script?.logline) || present(script?.synopsis),
        present(script?.creator?.name),
        present(script?.format) && present(classification?.primaryGenre || script?.primaryGenre || script?.genre),
        present(script?.scriptCompletion?.status || script?.status),
      ],
    },
    {
      id: "read",
      number: "02",
      title: "Read the screenplay",
      checks: [
        Boolean(script?.viewableScript),
        hasPreviewSource,
        present(script?.scriptPreviewAccess?.start),
        present(script?.scriptPreviewAccess?.end),
        capabilities?.fullScript ? hasFullSource : hasPreviewSource,
      ],
    },
    {
      id: "evidence",
      number: "03",
      title: "Trust the evidence",
      checks: [
        present(score?.overall),
        present(score?.feedback) || present(score?.strengths) || present(score?.improvements),
        present(platform?.overall),
        Number(script?.producerRating?.count || 0) > 0,
        Number(script?.reviewCount || 0) > 0,
      ],
    },
    {
      id: "discovery",
      number: "04",
      title: "Strengthen discovery",
      checks: [
        present(script?.coverImage || script?.trailerThumbnail),
        hasClassification,
        present(script?.tags),
        present(film?.filmLanguage) || present(script?.companyName),
        hasTrailer,
      ],
    },
    {
      id: "deal",
      number: "05",
      title: "Move toward a deal",
      checks: [
        ["published", "approved"].includes(String(script?.status || "")),
        Number(script?.price || 0) > 0,
        present(rights?.rightsType),
        present(rights?.modificationRights) && present(rights?.paymentStructure),
        transactionAvailable,
      ],
    },
  ];

  const stages = stageDefinitions.map((stage) => {
    const completion = ratio(stage.checks);
    return { ...stage, completion, points: completion * 20, ready: completion >= 0.75 };
  });
  const readiness = Math.round(stages.reduce((sum, stage) => sum + stage.points, 0));
  const ownerCurrent = capabilities?.owner && !hasTrailer
    ? "discovery"
    : stages.find((stage) => !stage.ready)?.id || "deal";

  return {
    readiness,
    stages: stages.map((stage) => ({
      ...stage,
      tone: stage.id === ownerCurrent && capabilities?.owner
        ? "current"
        : stage.ready
          ? "ready"
          : stage.id === "deal" && (capabilities?.owner || capabilities?.canPurchase)
            ? "attention"
            : "neutral",
    })),
    currentStage: ownerCurrent,
    hasTrailer,
    hasPreviewSource,
    hasFullSource,
    transactionAvailable,
  };
};

export const getRecommendedAction = ({ capabilities = {}, journey = {}, script = {} } = {}) => {
  if (capabilities.owner) {
    if (journey.currentStage === "story" || journey.currentStage === "read") return { id: "edit", label: "Complete project information" };
    if (journey.currentStage === "evidence") return { id: "evidence", label: "Review evaluation status" };
    if (journey.currentStage === "discovery" && !journey.hasTrailer) return { id: "trailer", label: "Complete the listing" };
    if (Number(script?.pendingRequestsCount || 0) > 0) return { id: "deal", label: "Review purchase requests" };
    return { id: "tools", label: "Manage project" };
  }
  if (capabilities.buyer) return { id: "read", label: "Read the full script" };
  if (script?.myPendingRequest?.status === "approved") return { id: "payment", label: "Continue to payment" };
  if (capabilities.canPurchase) return { id: "deal", label: "Review deal access" };
  return { id: "read", label: capabilities.fullScript ? "Read the full script" : "Read the preview" };
};
