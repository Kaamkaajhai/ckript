import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

export const uploadScript = async (req, res) => {
  try {
    const scriptData = {
      creator: req.user._id,
      title: req.body.title,
      description: req.body.description,
      synopsis: req.body.synopsis || req.body.description?.substring(0, 200),
      fullContent: req.body.fullContent,
      fileUrl: req.body.fileUrl || req.body.scriptUrl,
      coverImage: req.body.coverImage,
      genre: req.body.genre,
      contentType: req.body.contentType || "movie",
      premium: req.body.isPremium || req.body.premium || false,
      price: req.body.price || 0,
      roles: req.body.roles || [],
      tags: req.body.tags || [],
      budget: req.body.budget,
      holdFee: req.body.holdFee || 200,
    };
    const script = await Script.create(scriptData);
    res.status(201).json(script);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScripts = async (req, res) => {
  try {
    const { genre, contentType, budget, sort, search } = req.query;
    const query = {};
    if (genre) query.genre = genre;
    if (contentType) query.contentType = contentType;
    if (budget) query.budget = budget;
    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
      ];
    }

    // Use aggregation pipeline for computed sort fields (engagement, platform)
    if (sort === "engagement" || sort === "platform") {
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            unlockCount: { $size: { $ifNull: ["$unlockedBy", []] } },
            engagementScore: {
              $min: [
                100,
                {
                  $add: [
                    { $multiply: [{ $divide: [{ $ifNull: ["$views", 0] }, 500] }, 40] },
                    { $multiply: [{ $divide: [{ $size: { $ifNull: ["$unlockedBy", []] } }, 50] }, 40] },
                    {
                      $cond: [
                        { $gt: [{ $ifNull: ["$views", 0] }, 0] },
                        { $multiply: [{ $divide: [{ $size: { $ifNull: ["$unlockedBy", []] } }, { $ifNull: ["$views", 1] }] }, 100] },
                        0,
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ];

      if (sort === "platform") {
        // Platform score = weighted combo of AI score (60%) + engagement (40%)
        pipeline.push({
          $addFields: {
            platformScore: {
              $add: [
                { $multiply: [{ $ifNull: ["$scriptScore.overall", 0] }, 0.6] },
                { $multiply: ["$engagementScore", 0.4] },
              ],
            },
          },
        });
        pipeline.push({ $sort: { platformScore: -1 } });
      } else {
        pipeline.push({ $sort: { engagementScore: -1 } });
      }

      // Populate creator
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "creator",
          foreignField: "_id",
          as: "creator",
          pipeline: [{ $project: { name: 1, profileImage: 1, role: 1 } }],
        },
      });
      pipeline.push({ $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } });

      const scripts = await Script.aggregate(pipeline);
      return res.json(scripts);
    }

    let sortObj = { createdAt: -1 };
    if (sort === "views") sortObj = { views: -1 };
    if (sort === "score") sortObj = { "scriptScore.overall": -1 };
    if (sort === "price_low") sortObj = { price: 1 };
    if (sort === "price_high") sortObj = { price: -1 };

    const scripts = await Script.find(query)
      .populate("creator", "name profileImage role")
      .sort(sortObj);
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getScriptById = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id)
      .populate("creator", "name profileImage role bio followers")
      .populate("heldBy", "name role");
    
    if (!script) return res.status(404).json({ message: "Script not found" });

    // Track view
    script.views += 1;
    const alreadyViewed = script.viewedBy.some(v => v.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      script.viewedBy.push({ user: req.user._id });
    }
    await script.save();

    // Check if user has unlocked this script
    const isUnlocked = script.unlockedBy.includes(req.user._id);
    const isCreator = script.creator._id.toString() === req.user._id.toString();

    // Get audition count
    const Audition = (await import("../models/Audition.js")).default;
    const auditionCount = await Audition.countDocuments({ script: script._id });

    const response = {
      ...script.toObject(),
      isUnlocked,
      isCreator,
      auditionCount,
      // Hide full content unless unlocked or creator
      fullContent: (isUnlocked || isCreator) ? script.fullContent : null,
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unlockScript = async (req, res) => {
  try {
    const script = await Script.findById(req.body.scriptId);
    if (!script) return res.status(404).json({ message: "Script not found" });

    if (!script.unlockedBy.includes(req.user._id)) {
      script.unlockedBy.push(req.user._id);
      await script.save();

      // Notify creator
      const user = await User.findById(req.user._id);
      await Notification.create({
        user: script.creator,
        type: "unlock",
        from: req.user._id,
        script: script._id,
        message: `${user.name} unlocked your script "${script.title}" for $${script.price}`,
      });
    }
    res.json({ message: "Script unlocked", script });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hold/Option a script (for producers - $200 default, 30 days)
export const holdScript = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);
    
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.holdStatus === "held") {
      return res.status(400).json({ message: "This script is already on hold by another party" });
    }
    if (script.holdStatus === "sold") {
      return res.status(400).json({ message: "This script has been sold" });
    }

    const user = await User.findById(req.user._id);
    if (!["investor", "producer", "director"].includes(user.role)) {
      return res.status(403).json({ message: "Only industry professionals can hold scripts" });
    }

    const fee = script.holdFee || 200;
    const platformCut = fee * 0.10; // 10% platform fee
    const creatorPayout = fee - platformCut;
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create option record
    const option = await ScriptOption.create({
      script: scriptId,
      holder: req.user._id,
      fee,
      platformCut,
      creatorPayout,
      endDate,
      status: "active",
    });

    // Update script
    script.holdStatus = "held";
    script.heldBy = req.user._id;
    script.holdStartDate = new Date();
    script.holdEndDate = endDate;
    await script.save();

    // Notify the creator
    await Notification.create({
      user: script.creator,
      type: "hold",
      from: req.user._id,
      script: script._id,
      message: `${user.name} has placed a hold on "${script.title}" for $${fee} (30 days). You earn $${creatorPayout}!`,
    });

    res.json({ 
      message: "Script held successfully",
      option,
      holdDetails: {
        fee,
        platformCut,
        creatorPayout,
        expiresAt: endDate,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Release a hold
export const releaseHold = async (req, res) => {
  try {
    const { scriptId } = req.body;
    const script = await Script.findById(scriptId);
    
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.heldBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not holding this script" });
    }

    script.holdStatus = "available";
    script.heldBy = null;
    script.holdStartDate = null;
    script.holdEndDate = null;
    await script.save();

    // Update option
    await ScriptOption.findOneAndUpdate(
      { script: scriptId, holder: req.user._id, status: "active" },
      { status: "cancelled" }
    );

    res.json({ message: "Hold released" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get script options/holds for current user
export const getMyHolds = async (req, res) => {
  try {
    const options = await ScriptOption.find({ holder: req.user._id })
      .populate({
        path: "script",
        select: "title genre coverImage creator price trailerThumbnail",
        populate: { path: "creator", select: "name profileImage" }
      })
      .sort({ createdAt: -1 });

    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add roles to a script
export const addRoles = async (req, res) => {
  try {
    const { scriptId, roles } = req.body;
    const script = await Script.findById(scriptId);
    
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the creator can add roles" });
    }

    script.roles.push(...roles);
    await script.save();

    res.json({ message: "Roles added", roles: script.roles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
