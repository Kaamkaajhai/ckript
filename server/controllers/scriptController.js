import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

export const extractPdfText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file provided" });
    }

    // Use dynamic import to handle CJS library in ESM correctly
    const pdfParsePkg = await import("pdf-parse");
    const pdfParse = pdfParsePkg.default || pdfParsePkg;

    const data = await pdfParse(req.file.buffer);

    // Quick sanitization: replace weird null bytes or excessive whitespace
    let text = data.text || "";
    // Standardize newlines
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    res.json({ text, numItems: data.numpages });
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    res.status(500).json({ message: "Failed to extract text from PDF", error: error.message });
  }
};

export const saveDraft = async (req, res) => {
  try {
    const { scriptId, title, textContent, ...otherData } = req.body;

    // If we have an ID, update the existing draft
    if (scriptId) {
      const script = await Script.findById(scriptId);
      if (!script) return res.status(404).json({ message: "Script not found" });
      if (script.creator.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      script.title = title || script.title;
      script.textContent = textContent !== undefined ? textContent : script.textContent;
      // Allow updating other work-in-progress metadata here if needed

      await script.save();
      return res.json(script);
    }

    // Otherwise create a new draft
    const newDraft = await Script.create({
      creator: req.user._id,
      title: title || "Untitled Draft",
      textContent: textContent || "",
      status: "draft",
      ...otherData
    });

    res.status(201).json(newDraft);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadScript = async (req, res) => {
  try {
    const {
      title,
      logline,
      format,
      pageCount,
      classification,
      scriptUrl,
      services,
      legal,
      // Legacy fields for backward compatibility
      description,
      synopsis,
      fullContent,
      textContent,
      fileUrl,
      coverImage,
      genre,
      contentType,
      isPremium,
      premium,
      price,
      roles,
      tags,
      budget,
      holdFee
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!scriptUrl && !fileUrl && !textContent) {
      return res.status(400).json({ message: "Script file or text content is required" });
    }

    // Build the script document
    const scriptData = {
      creator: req.user._id,
      title,
      logline: logline || description?.substring(0, 300),
      description: description || synopsis || logline,
      synopsis: synopsis || description,
      fullContent,
      textContent,
      fileUrl: scriptUrl || fileUrl,
      pageCount,
      coverImage,
      genre: genre || classification?.primaryGenre,
      contentType: contentType || "movie",
      premium: isPremium || premium || false,
      price: price || 0,
      roles: roles || [],
      tags: tags || [],
      budget,
      holdFee: holdFee || 200,

      // New fields from the 5-step wizard
      format: format || "feature_film",
      primaryGenre: classification?.primaryGenre || genre,
      classification: classification ? {
        primaryGenre: classification.primaryGenre,
        secondaryGenre: classification.secondaryGenre,
        tones: classification.tones || [],
        themes: classification.themes || [],
        settings: classification.settings || []
      } : undefined,

      // Services tracking
      services: services ? {
        hosting: services.hosting !== undefined ? services.hosting : true,
        evaluation: services.evaluation || false,
        aiTrailer: services.aiTrailer || false
      } : { hosting: true, evaluation: false, aiTrailer: false },

      // Legal compliance
      legal: legal ? {
        agreedToTerms: legal.agreedToTerms || false,
        timestamp: legal.timestamp || new Date(),
        ipAddress: req.ip || req.connection.remoteAddress
      } : undefined,

      // AI Trailer status initialization
      trailerStatus: services?.aiTrailer ? "generating" : "none",

      status: "published" // Force publish on final upload
    };

    // If updating from a draft (if we pass draftId in the future), we could update instead of create.
    // For now, assume it's a new or finalized creation.
    const script = await Script.create(scriptData);

    // --- Async Service Processing ---
    // TODO: Implement these async workflows:

    // 1. If hosting: Start subscription timer (30 days)
    if (services?.hosting) {
      // TODO: Create/Update Subscription document
      console.log(`[SERVICE] Hosting activated for script ${script._id}`);
    }

    // 2. If evaluation: Create job ticket for Reader Portal
    if (services?.evaluation) {
      // TODO: Create evaluation job in a Queue or Job collection
      console.log(`[SERVICE] Evaluation requested for script ${script._id}`);
      // Example: await createEvaluationJob(script._id, req.user._id);
    }

    // 3. If aiTrailer: Trigger AI video generation
    if (services?.aiTrailer) {
      // TODO: Send request to AI Video API (Runway/HeyGen/OpenAI)
      console.log(`[SERVICE] AI Trailer generation started for script ${script._id}`);
      console.log(`Logline: ${logline}`);
      console.log(`Genre: ${classification?.primaryGenre}`);
      console.log(`Tones: ${classification?.tones?.join(', ')}`);

      // Example async call:
      // generateAITrailer({
      //   scriptId: script._id,
      //   logline,
      //   genre: classification.primaryGenre,
      //   tones: classification.tones
      // }).catch(err => {
      //   // Update script.trailerStatus = 'failed'
      //   console.error('AI Trailer generation failed:', err);
      // });
    }

    // Return the created script
    res.status(201).json(script);
  } catch (error) {
    console.error("Script upload error:", error);
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
      // Strip full synopsis and fullContent from list view
      const sanitized = scripts.map(s => ({
        ...s,
        synopsis: s.synopsis ? s.synopsis.substring(0, 120) + (s.synopsis.length > 120 ? '...' : '') : null,
        fullContent: undefined,
      }));
      return res.json(sanitized);
    }

    let sortObj = { createdAt: -1 };
    if (sort === "views") sortObj = { views: -1 };
    if (sort === "score") sortObj = { "scriptScore.overall": -1 };
    if (sort === "price_low") sortObj = { price: 1 };
    if (sort === "price_high") sortObj = { price: -1 };

    const scripts = await Script.find(query)
      .populate("creator", "name profileImage role")
      .sort(sortObj);
    // Strip full synopsis and fullContent from list view
    const sanitized = scripts.map(s => {
      const obj = s.toObject();
      return {
        ...obj,
        synopsis: obj.synopsis ? obj.synopsis.substring(0, 120) + (obj.synopsis.length > 120 ? '...' : '') : null,
        fullContent: undefined,
      };
    });
    res.json(sanitized);
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
    const userRole = req.user.role;
    const isWriter = userRole === 'writer' || userRole === 'creator';
    const canPurchase = ['investor', 'producer', 'director', 'industry', 'professional'].includes(userRole);

    // Get audition count
    const Audition = (await import("../models/Audition.js")).default;
    const auditionCount = await Audition.countDocuments({ script: script._id });

    // Synopsis visibility: only show full synopsis if creator or unlocked by a paying user
    const synopsisTeaser = script.synopsis ? script.synopsis.substring(0, 120) + (script.synopsis.length > 120 ? '...' : '') : null;
    const isSynopsisLocked = !isCreator && !isUnlocked;

    const response = {
      ...script.toObject(),
      isUnlocked,
      isCreator,
      isSynopsisLocked,
      canPurchase,
      isWriter: isWriter && !isCreator,
      auditionCount,
      // Hide full synopsis unless unlocked or creator
      synopsis: (isUnlocked || isCreator) ? script.synopsis : synopsisTeaser,
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

    // Only investors, producers, directors, and industry professionals can unlock
    const allowedRoles = ['investor', 'producer', 'director', 'industry', 'professional'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Only investors, producers, and directors can unlock scripts. Writers cannot purchase synopsis access."
      });
    }

    // Cannot unlock own script
    if (script.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You already have access to your own script" });
    }

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

// ─── Reader Endpoints ───

export const getFeaturedScripts = async (req, res) => {
  try {
    const scripts = await Script.find({ $or: [{ isFeatured: true }, { rating: { $gte: 4 } }] })
      .populate("creator", "name profileImage role")
      .sort({ rating: -1 })
      .limit(12);
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTopScripts = async (req, res) => {
  try {
    const sortBy = req.query.sort || "rating";
    let sortObj = { rating: -1 };
    if (sortBy === "reads") sortObj = { readsCount: -1 };
    if (sortBy === "purchases") sortObj = { "unlockedBy": -1 };
    const scripts = await Script.find()
      .populate("creator", "name profileImage role")
      .sort(sortObj)
      .limit(20);
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const searchScriptsReader = async (req, res) => {
  try {
    const { q, category, genre, page = 1, limit = 20 } = req.query;
    const query = {};
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ title: regex }, { description: regex }, { logline: regex }, { tags: regex }];
    }
    if (category) query.contentType = category;
    if (genre) query.genre = genre;
    const total = await Script.countDocuments(query);
    const scripts = await Script.find(query)
      .populate("creator", "name profileImage role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ scripts, totalPages: Math.ceil(total / limit), page: parseInt(page), total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLatestScripts = async (req, res) => {
  try {
    const scripts = await Script.find()
      .populate("creator", "name profileImage role")
      .sort({ createdAt: -1 })
      .limit(18);
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const recordRead = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    script.readsCount = (script.readsCount || 0) + 1;
    await script.save();
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { scriptsRead: script._id } });
    res.json({ message: "Read recorded" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.favoriteScripts.indexOf(req.params.id);
    if (idx > -1) {
      user.favoriteScripts.splice(idx, 1);
      await user.save();
      res.json({ favorited: false });
    } else {
      user.favoriteScripts.push(req.params.id);
      await user.save();
      res.json({ favorited: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const contentTypes = await Script.distinct("contentType");
    const genres = await Script.distinct("genre");
    res.json({ contentTypes: contentTypes.filter(Boolean), genres: genres.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
