import User from "../models/User.js";
import Post from "../models/Post.js";
import Script from "../models/Script.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer config for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "profiles"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"), false);
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export const getWriters = async (req, res) => {
  try {
    const { sort } = req.query;

    // Aggregation to get writers with their script stats
    const pipeline = [
      { $match: { role: "writer" } },
      { $project: { password: 0, emailVerificationToken: 0, emailVerificationExpires: 0 } },
      {
        $lookup: {
          from: "scripts",
          localField: "_id",
          foreignField: "creator",
          as: "scripts",
        },
      },
      {
        $addFields: {
          scriptCount: { $size: "$scripts" },
          totalViews: { $sum: "$scripts.views" },
          avgScore: {
            $cond: [
              { $gt: [{ $size: { $filter: { input: "$scripts", as: "s", cond: { $gt: ["$$s.scriptScore.overall", 0] } } } }, 0] },
              { $avg: { $map: { input: { $filter: { input: "$scripts", as: "s", cond: { $gt: ["$$s.scriptScore.overall", 0] } } }, as: "s", in: "$$s.scriptScore.overall" } } },
              0,
            ],
          },
          totalUnlocks: {
            $sum: { $map: { input: "$scripts", as: "s", in: { $size: { $ifNull: ["$$s.unlockedBy", []] } } } },
          },
          followerCount: { $size: { $ifNull: ["$followers", []] } },
        },
      },
      { $project: { scripts: 0 } },
    ];

    // Sort options
    if (sort === "score") {
      pipeline.push({ $sort: { avgScore: -1 } });
    } else if (sort === "views") {
      pipeline.push({ $sort: { totalViews: -1 } });
    } else if (sort === "followers") {
      pipeline.push({ $sort: { followerCount: -1 } });
    } else if (sort === "scripts") {
      pipeline.push({ $sort: { scriptCount: -1 } });
    } else {
      // Default: combined reputation (avgScore * 0.5 + totalViews/100 * 0.3 + followerCount * 0.2)
      pipeline.push({
        $addFields: {
          reputation: {
            $add: [
              { $multiply: [{ $ifNull: ["$avgScore", 0] }, 0.5] },
              { $multiply: [{ $divide: [{ $ifNull: ["$totalViews", 0] }, 100] }, 0.3] },
              { $multiply: [{ $ifNull: ["$followerCount", 0] }, 0.2] },
            ],
          },
        },
      });
      pipeline.push({ $sort: { reputation: -1 } });
    }

    const writers = await User.aggregate(pipeline);
    res.json(writers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "name profileImage")
      .populate("following", "name profileImage");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const posts = await Post.find({ user: req.params.id })
      .populate("user", "name profileImage role")
      .sort({ createdAt: -1 });

    const isOwnProfile = req.user?._id?.toString() === req.params.id.toString();
    const scriptQuery = isOwnProfile
      ? { creator: req.params.id }
      : { creator: req.params.id, status: { $ne: "draft" } };

    const scripts = await Script.find(scriptQuery)
      .populate("creator", "name profileImage role")
      .sort({ createdAt: -1 });

    // Sanitize bank details - only show to own profile
    const userObj = user.toObject();
    if (!isOwnProfile && userObj.bankDetails) {
      delete userObj.bankDetails;
    } else if (isOwnProfile && userObj.bankDetails && userObj.bankDetails.accountNumber) {
      // Sanitize account number even for own profile (for security)
      userObj.bankDetails.accountNumber = '****' + userObj.bankDetails.accountNumber.slice(-4);
    }

    res.json({ user: userObj, posts, scripts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const {
      name, bio, skills, profileImage, coverImage, favoriteGenres, writerProfile,
      // Investor / industry preference fields (from onboarding Step 3)
      preferredGenres, preferredBudgets, preferredFormats,
      // onboarding completion
      onboardingComplete,
      // investor profile fields
      company, linkedInUrl, investmentRange,
      // bank details
      bankDetails,
      // notification preferences
      notificationPrefs,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name || user.name;
    user.bio = bio !== undefined ? bio : user.bio;
    user.skills = skills || user.skills;
    user.profileImage = profileImage || user.profileImage;
    if (coverImage !== undefined) user.coverImage = coverImage;
    if (favoriteGenres !== undefined) user.favoriteGenres = favoriteGenres;

    // Investor / industry preference genres — save to mandates AND preferences
    if (preferredGenres !== undefined) {
      if (!user.preferences) user.preferences = {};
      user.preferences.genres = preferredGenres;
      user.markModified("preferences");
      // Also persist to mandates so getInvestorFeed can read from industryProfile
      if (!user.industryProfile) user.industryProfile = {};
      if (!user.industryProfile.mandates) user.industryProfile.mandates = {};
      user.industryProfile.mandates.genres = preferredGenres;
      user.markModified("industryProfile");
    }
    if (preferredBudgets !== undefined) {
      if (!user.industryProfile) user.industryProfile = {};
      if (!user.industryProfile.mandates) user.industryProfile.mandates = {};
      user.industryProfile.mandates.budgetTiers = preferredBudgets;
      user.markModified("industryProfile");
    }
    if (preferredFormats !== undefined) {
      // Store in mandates.formats (no enum restriction); skip preferences.contentTypes
      // because that field has a strict enum incompatible with onboarding format strings
      if (!user.industryProfile) user.industryProfile = {};
      if (!user.industryProfile.mandates) user.industryProfile.mandates = {};
      user.industryProfile.mandates.formats = preferredFormats;
      user.markModified("industryProfile");
    }

    // Investor profile fields
    if (company !== undefined || linkedInUrl !== undefined || investmentRange !== undefined) {
      if (!user.industryProfile) user.industryProfile = {};
      if (company !== undefined) user.industryProfile.company = company;
      if (linkedInUrl !== undefined) user.industryProfile.linkedInUrl = linkedInUrl;
      user.markModified("industryProfile");
    }

    // Onboarding completion
    if (onboardingComplete !== undefined) {
      if (user.role === "writer") {
        if (!user.writerProfile) user.writerProfile = {};
        user.writerProfile.onboardingComplete = onboardingComplete;
        user.markModified("writerProfile");
      } else {
        if (!user.industryProfile) user.industryProfile = {};
        user.industryProfile.onboardingComplete = onboardingComplete;
        user.markModified("industryProfile");
      }
    }

    // Writer-specific fields
    if (writerProfile) {
      if (!user.writerProfile) user.writerProfile = {};
      if (writerProfile.representationStatus !== undefined) {
        user.writerProfile.representationStatus = writerProfile.representationStatus;
      }
      if (writerProfile.agencyName !== undefined) {
        user.writerProfile.agencyName = writerProfile.agencyName;
      }
      if (writerProfile.wgaMember !== undefined) {
        user.writerProfile.wgaMember = writerProfile.wgaMember;
      }
      if (writerProfile.genres !== undefined) {
        user.writerProfile.genres = writerProfile.genres;
      }
      if (writerProfile.specializedTags !== undefined) {
        user.writerProfile.specializedTags = writerProfile.specializedTags;
      }
      if (writerProfile.diversity !== undefined) {
        if (!user.writerProfile.diversity) user.writerProfile.diversity = {};
        if (writerProfile.diversity.gender !== undefined) {
          user.writerProfile.diversity.gender = writerProfile.diversity.gender;
        }
        if (writerProfile.diversity.ethnicity !== undefined) {
          user.writerProfile.diversity.ethnicity = writerProfile.diversity.ethnicity;
        }
      }
    }

    // Bank details
    if (bankDetails) {
      if (!user.bankDetails) user.bankDetails = {};
      if (bankDetails.accountHolderName !== undefined) {
        user.bankDetails.accountHolderName = bankDetails.accountHolderName;
      }
      if (bankDetails.bankName !== undefined) {
        user.bankDetails.bankName = bankDetails.bankName;
      }
      if (bankDetails.accountNumber !== undefined) {
        user.bankDetails.accountNumber = bankDetails.accountNumber;
      }
      if (bankDetails.routingNumber !== undefined) {
        user.bankDetails.routingNumber = bankDetails.routingNumber;
      }
      if (bankDetails.accountType !== undefined) {
        user.bankDetails.accountType = bankDetails.accountType;
      }
      if (bankDetails.swiftCode !== undefined) {
        user.bankDetails.swiftCode = bankDetails.swiftCode;
      }
      if (bankDetails.iban !== undefined) {
        user.bankDetails.iban = bankDetails.iban;
      }
      if (bankDetails.country !== undefined) {
        user.bankDetails.country = bankDetails.country;
      }
      if (bankDetails.currency !== undefined) {
        user.bankDetails.currency = bankDetails.currency;
      }
      // Set addedAt if this is the first time adding bank details
      if (!user.bankDetails.addedAt) {
        user.bankDetails.addedAt = new Date();
      }
      // Reset verification when details change
      user.bankDetails.isVerified = false;
    }

    // Notification preferences
    if (notificationPrefs) {
      if (!user.notificationPrefs) user.notificationPrefs = {};
      if (notificationPrefs.smartMatchAlerts !== undefined) user.notificationPrefs.smartMatchAlerts = notificationPrefs.smartMatchAlerts;
      if (notificationPrefs.auditionAlerts !== undefined) user.notificationPrefs.auditionAlerts = notificationPrefs.auditionAlerts;
      if (notificationPrefs.holdAlerts !== undefined) user.notificationPrefs.holdAlerts = notificationPrefs.holdAlerts;
      if (notificationPrefs.viewAlerts !== undefined) user.notificationPrefs.viewAlerts = notificationPrefs.viewAlerts;
      user.markModified("notificationPrefs");
    }

    await user.save();

    // Sanitize bank details for response (hide full account number)
    let sanitizedBankDetails = null;
    if (user.bankDetails && user.bankDetails.accountNumber) {
      sanitizedBankDetails = {
        ...user.bankDetails.toObject(),
        accountNumber: '****' + user.bankDetails.accountNumber.slice(-4)
      };
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      skills: user.skills,
      profileImage: user.profileImage,
      coverImage: user.coverImage,
      favoriteGenres: user.favoriteGenres,
      writerProfile: user.writerProfile,
      industryProfile: user.industryProfile,
      preferences: user.preferences,
      notificationPrefs: user.notificationPrefs,
      bankDetails: sanitizedBankDetails,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getActivityTimeline = async (req, res) => {
  try {
    const userId = req.params.id || req.user._id;
    const user = await User.findById(userId)
      .populate({ path: "scriptsRead", select: "title genre coverImage", options: { sort: { updatedAt: -1 } } })
      .populate({ path: "favoriteScripts", select: "title genre coverImage" })
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const reviews = await Review.find({ user: userId })
      .populate("script", "title genre coverImage")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Merge and sort events chronologically
    const events = [];

    // scriptsRead — use array index order (most recent last in array, we reverse)
    const readList = (user.scriptsRead || []).slice(-10).reverse();
    readList.forEach((s, i) => {
      events.push({
        type: "read",
        scriptId: s._id,
        title: s.title,
        genre: s.genre,
        coverImage: s.coverImage,
        // approximate time — we don't have per-read timestamps, use relative index offset
        date: null,
        order: i,
      });
    });

    // favoriteScripts (saved)
    (user.favoriteScripts || []).slice(0, 6).forEach((s, i) => {
      events.push({
        type: "saved",
        scriptId: s._id,
        title: s.title,
        genre: s.genre,
        coverImage: s.coverImage,
        date: null,
        order: 100 + i,
      });
    });

    // reviews
    reviews.forEach((r, i) => {
      events.push({
        type: "review",
        scriptId: r.script?._id,
        title: r.script?.title || "Unknown Script",
        genre: r.script?.genre,
        coverImage: r.script?.coverImage,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt,
        order: 200 + i,
      });
    });

    res.json({
      events,
      stats: {
        scriptsRead: user.scriptsRead?.length || 0,
        favoriteScripts: user.favoriteScripts?.length || 0,
        reviewsWritten: reviews.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.body.userId);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.following.includes(req.body.userId)) {
      return res.status(400).json({ message: "Already following this user" });
    }

    currentUser.following.push(req.body.userId);
    userToFollow.followers.push(req.user._id);

    await currentUser.save();
    await userToFollow.save();

    // Send notification to the followed user
    await Notification.create({
      user: req.body.userId,
      type: "follow",
      from: req.user._id,
      message: "started following you",
    });

    res.json({ message: "User followed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    user.profileImage = imageUrl;
    await user.save();

    res.json({ profileImage: imageUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.body.userId);
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow) {
      return res.status(404).json({ message: "User not found" });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== req.body.userId
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await userToUnfollow.save();

    res.json({ message: "User unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the savedScripts from industryProfile
    const savedScriptIds = user.industryProfile?.savedScripts || [];

    // Populate the script details
    const scripts = await Script.find({ _id: { $in: savedScriptIds } })
      .populate("creator", "name profileImage")
      .sort({ createdAt: -1 });

    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addToWatchlist = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize savedScripts if it doesn't exist
    if (!user.industryProfile) {
      user.industryProfile = {};
    }
    if (!user.industryProfile.savedScripts) {
      user.industryProfile.savedScripts = [];
    }

    // Check if already in watchlist
    if (user.industryProfile.savedScripts.includes(scriptId)) {
      return res.status(400).json({ message: "Script already in watchlist" });
    }

    user.industryProfile.savedScripts.push(scriptId);
    await user.save();

    res.json({ message: "Script added to watchlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.industryProfile?.savedScripts) {
      return res.status(400).json({ message: "Watchlist is empty" });
    }

    user.industryProfile.savedScripts = user.industryProfile.savedScripts.filter(
      (id) => id.toString() !== scriptId
    );
    await user.save();

    res.json({ message: "Script removed from watchlist" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────── SETTINGS ────────

export const updateSettings = async (req, res) => {
  try {
    const { notificationPrefs, isPrivate, language, timezone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (notificationPrefs !== undefined) {
      if (!user.notificationPrefs) user.notificationPrefs = {};
      if (notificationPrefs.smartMatchAlerts !== undefined) user.notificationPrefs.smartMatchAlerts = notificationPrefs.smartMatchAlerts;
      if (notificationPrefs.auditionAlerts !== undefined) user.notificationPrefs.auditionAlerts = notificationPrefs.auditionAlerts;
      if (notificationPrefs.holdAlerts !== undefined) user.notificationPrefs.holdAlerts = notificationPrefs.holdAlerts;
      if (notificationPrefs.viewAlerts !== undefined) user.notificationPrefs.viewAlerts = notificationPrefs.viewAlerts;
      user.markModified("notificationPrefs");
    }

    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (language !== undefined) user.language = language;
    if (timezone !== undefined) user.timezone = timezone;

    await user.save();
    res.json({ message: "Settings updated", user: { isPrivate: user.isPrivate, language: user.language, timezone: user.timezone, notificationPrefs: user.notificationPrefs } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const changeEmail = async (req, res) => {
  try {
    const { password, newEmail } = req.body;
    if (!password || !newEmail) return res.status(400).json({ message: "Password and new email are required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Password is incorrect" });

    const existing = await User.findOne({ email: newEmail });
    if (existing) return res.status(409).json({ message: "Email is already in use" });

    user.email = newEmail;
    user.emailVerified = false;
    await user.save();
    res.json({ message: "Email changed successfully", email: user.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
