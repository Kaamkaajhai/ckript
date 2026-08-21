import Review from "../models/Review.js";
import Script from "../models/Script.js";
import User from "../models/User.js";
import { asObjectId } from "../utils/requestValue.js";
import { buildPrivateProfileDenial, VISITOR_PROFILE_SCRIPT_FIELDS } from "../utils/profileProjection.js";
import {
  getReaderProfileRelationship,
  normalizeReaderProfileQuery,
  projectReaderProfile,
  readerCollectionMeta,
} from "../utils/readerProfile.js";
import { buildUserShareMeta } from "../utils/shareMeta.js";

const idOf = (value) => String(value?._id || value?.id || value || "");
const publicProjectFilter = (ids) => ({
  _id: { $in: ids },
  status: "published",
  isSold: { $ne: true },
  isDeleted: { $ne: true },
});

const projectPage = (filter, { page, limit }) => Script.find(filter)
  .select(VISITOR_PROFILE_SCRIPT_FIELDS.join(" "))
  .populate("creator", "name profileImage role writerProfile.username")
  .sort({ updatedAt: -1, _id: 1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();

export const getReaderProfile = async (req, res) => {
  try {
    const profileId = asObjectId(req.params.id);
    if (!profileId) return res.status(400).json({ message: "Invalid reader profile id" });

    const viewerId = req.user?._id;
    const own = idOf(viewerId) === idOf(profileId);
    const query = normalizeReaderProfileQuery(req.query);
    const profile = await User.findById(profileId)
      .select("_id name role bio skills profileImage coverImage phone dateOfBirth address createdAt isPrivate isDeactivated followers following followRequests blockedUsers scriptsRead favoriteScripts")
      .populate("followers", "name profileImage role writerProfile.username")
      .populate("following", "name profileImage role writerProfile.username")
      .lean();

    if (!profile || String(profile.role || "").toLowerCase() !== "reader") {
      return res.status(404).json({ message: "Reader profile not found" });
    }

    const viewer = own
      ? profile
      : await User.findById(viewerId).select("_id role blockedUsers").lean();
    const adminViewer = String(viewer?.role || "").toLowerCase() === "admin";
    if (profile.isDeactivated && !adminViewer) {
      return res.status(404).json({ message: "Reader profile not found" });
    }

    const relationship = getReaderProfileRelationship(profile, viewerId);
    relationship.blockedByProfile = (profile.blockedUsers || []).some((entry) => idOf(entry) === idOf(viewerId));
    relationship.blockedByCurrent = (viewer?.blockedUsers || []).some((entry) => idOf(entry) === idOf(profileId));
    if (!own && relationship.blockedByProfile) {
      return res.status(403).json({ message: "This user has blocked you.", blocked: true, ...relationship });
    }
    if (!own && profile.isPrivate && !relationship.isFollowing && !adminViewer) {
      return res.status(403).json(buildPrivateProfileDenial({
        userId: profileId,
        followRequestPending: relationship.followRequestPending,
        blockedByCurrent: relationship.blockedByCurrent,
        blockedByProfile: relationship.blockedByProfile,
      }));
    }

    const collectionsVisible = own;
    const readIds = collectionsVisible && Array.isArray(profile.scriptsRead) ? profile.scriptsRead : [];
    const favoriteIds = collectionsVisible && Array.isArray(profile.favoriteScripts) ? profile.favoriteScripts : [];
    const [readTotal, favoritesTotal, reviewsTotal] = await Promise.all([
      collectionsVisible ? Script.countDocuments(publicProjectFilter(readIds)) : Promise.resolve(null),
      collectionsVisible ? Script.countDocuments(publicProjectFilter(favoriteIds)) : Promise.resolve(null),
      Review.countDocuments({ user: profileId }),
    ]);

    let items = [];
    let total = 0;
    if (query.section === "read" && collectionsVisible) {
      total = readTotal;
      items = await projectPage(publicProjectFilter(readIds), query);
    } else if (query.section === "favorites" && collectionsVisible) {
      total = favoritesTotal;
      items = await projectPage(publicProjectFilter(favoriteIds), query);
    } else if (query.section === "reviews") {
      total = reviewsTotal;
      items = await Review.find({ user: profileId })
        .populate("script", "title coverImage genre primaryGenre _id creator")
        .sort({ createdAt: -1, _id: 1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean();
    }

    const projected = projectReaderProfile(profile, { own });
    projected.canonicalPath = `/reader/profile/${encodeURIComponent(idOf(profile._id))}`;
    projected.shareMeta = buildUserShareMeta(req, projected);

    return res.json({
      profile: projected,
      own,
      collectionsVisible,
      relationship,
      counts: {
        read: collectionsVisible ? readTotal : null,
        favorites: collectionsVisible ? favoritesTotal : null,
        reviews: reviewsTotal,
      },
      items,
      pagination: readerCollectionMeta({
        ...query,
        total,
        collectionsVisible,
      }),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load reader profile" });
  }
};
