import Script from "../models/Script.js";
import ScriptOption from "../models/ScriptOption.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import { CREDIT_PRICES } from "./creditsController.js";
import { createRequire } from 'module';
import Razorpay from "razorpay";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization of Razorpay
let razorpayInstance = null;

const getRazorpay = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured");
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

export const extractPdfText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file provided" });
    }

    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse');

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

export const deleteScript = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Script.findByIdAndDelete(req.params.id);
    res.json({ message: "Script deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyDrafts = async (req, res) => {
  try {
    const drafts = await Script.find({ creator: req.user._id, status: "draft" })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyScripts = async (req, res) => {
  try {
    const scripts = await Script.find({ creator: req.user._id, status: { $ne: "draft" } })
      .sort({ createdAt: -1 })
      .select("_id title logline description synopsis genre contentType coverImage premium price views services scriptScore platformScore status adminApproved rejectionReason creator createdAt")
      .populate("creator", "name profileImage")
      .lean();
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateScript = async (req, res) => {
  try {
    const script = await Script.findById(req.params.id);
    if (!script) return res.status(404).json({ message: "Script not found" });
    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this script" });
    }

    const {
      title, logline, format, pageCount, classification,
      scriptUrl, description, synopsis, textContent, fileUrl,
      coverImage, genre, premium, price, roles, tags, budget, holdFee, services, legal,
    } = req.body;

    if (title) script.title = title;
    if (logline !== undefined) script.logline = logline;
    if (format) script.format = format;
    if (pageCount) script.pageCount = Number(pageCount);
    if (textContent !== undefined) script.textContent = textContent;
    if (description !== undefined) script.description = description;
    if (synopsis !== undefined) script.synopsis = synopsis;
    const realUrl = scriptUrl || fileUrl;
    if (realUrl && !realUrl.includes("placeholder-url.com")) script.fileUrl = realUrl;
    if (coverImage) script.coverImage = coverImage;
    if (premium !== undefined) script.premium = premium;
    if (price !== undefined) script.price = Number(price);
    if (roles) script.roles = roles;
    if (tags) script.tags = tags;
    if (budget) script.budget = budget;
    if (holdFee) script.holdFee = holdFee;

    if (classification) {
      const g = classification.primaryGenre || script.classification?.primaryGenre;
      script.genre = genre || g;
      script.primaryGenre = g;
      script.classification = {
        primaryGenre: classification.primaryGenre ?? script.classification?.primaryGenre,
        secondaryGenre: classification.secondaryGenre ?? script.classification?.secondaryGenre,
        tones: classification.tones ?? script.classification?.tones ?? [],
        themes: classification.themes ?? script.classification?.themes ?? [],
        settings: classification.settings ?? script.classification?.settings ?? [],
      };
      script.markModified("classification");
    } else if (genre) {
      script.genre = genre;
    }

    if (services) {
      script.services = {
        hosting: services.hosting ?? script.services?.hosting ?? true,
        evaluation: services.evaluation ?? script.services?.evaluation ?? false,
        aiTrailer: services.aiTrailer ?? script.services?.aiTrailer ?? false,
      };
      script.markModified("services");
    }

    if (legal?.agreedToTerms !== undefined) {
      script.legal = {
        agreedToTerms: legal.agreedToTerms,
        timestamp: script.legal?.timestamp || new Date(),
        ipAddress: req.ip || req.connection.remoteAddress,
      };
    }

    script.status = "pending_approval";
    await script.save();
    res.json(script);
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

    // Calculate credits needed for selected services
    let creditsRequired = 0;
    if (services?.evaluation) creditsRequired += CREDIT_PRICES.AI_EVALUATION;
    if (services?.aiTrailer) creditsRequired += CREDIT_PRICES.AI_TRAILER;

    // Check and deduct credits if services are selected
    if (creditsRequired > 0) {
      const user = await User.findById(req.user._id);
      const userBalance = user.credits?.balance || 0;

      if (userBalance < creditsRequired) {
        return res.status(402).json({
          message: `Insufficient credits. You need ${creditsRequired} credits but have ${userBalance}.`,
          requiresCredits: true,
          required: creditsRequired,
          balance: userBalance,
          shortfall: creditsRequired - userBalance
        });
      }

      // Deduct credits
      user.credits.balance -= creditsRequired;
      user.credits.totalSpent += creditsRequired;

      // Add transaction record for each service
      if (services?.evaluation) {
        user.credits.transactions.push({
          type: "spent",
          amount: -CREDIT_PRICES.AI_EVALUATION,
          description: `AI Evaluation for "${title}"`,
          reference: `EVAL-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date()
        });
      }

      if (services?.aiTrailer) {
        user.credits.transactions.push({
          type: "spent",
          amount: -CREDIT_PRICES.AI_TRAILER,
          description: `AI Trailer for "${title}"`,
          reference: `TRAILER-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date()
        });
      }

      await user.save();
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

      status: "pending_approval" // Requires admin approval before publishing
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
    const { genre, contentType, budget, sort, search, premium, minPrice, maxPrice } = req.query;
    const query = { status: "published" };
    if (genre) query.genre = genre;
    if (contentType) query.contentType = contentType;
    if (budget) query.budget = budget;
    if (premium === "true") query.premium = true;
    else if (premium === "false") query.premium = { $ne: true };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
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

    const isOwner = script.creator._id.toString() === req.user._id.toString();
    if (script.status === "draft" && !isOwner) {
      return res.status(403).json({ message: "This draft is private" });
    }

    // Track view — only count views from users who are NOT the script creator
    if (!isOwner) {
      script.views += 1;
    }
    const alreadyViewed = script.viewedBy.some(v => v.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      script.viewedBy.push({ user: req.user._id });
    }
    await script.save();

    // Update viewer's viewHistory so investor dashboard stats are accurate
    if (!isOwner) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          viewHistory: {
            $each: [{ script: script._id, viewedAt: new Date() }],
            $slice: -200, // keep last 200 entries
          },
        },
      });
    }

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
    // Step 1: rank published scripts by trendScore via aggregation
    const ranked = await Script.aggregate([
      { $match: { status: "published" } },
      {
        $addFields: {
          trendScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$reviewCount", 0] }, 3] },
              { $multiply: [{ $ifNull: ["$readsCount", 0] }, 2] },
              { $ifNull: ["$views", 0] },
            ],
          },
        },
      },
      { $sort: { trendScore: -1, rating: -1, createdAt: -1 } },
      { $limit: 12 },
      { $project: { _id: 1 } },
    ]);

    if (!ranked.length) return res.json([]);

    const ids = ranked.map((s) => s._id);

    // Step 2: fetch full documents with populated creator (preserving sort order)
    const docs = await Script.find({ _id: { $in: ids } }).populate(
      "creator",
      "name profileImage role"
    );

    const idStr = (id) => id.toString();
    const docMap = Object.fromEntries(docs.map((d) => [idStr(d._id), d]));
    const ordered = ids.map((id) => docMap[idStr(id)]).filter(Boolean);

    res.json(ordered);
  } catch (error) {
    console.error("getFeaturedScripts error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getTopScripts = async (req, res) => {
  try {
    const sortBy = req.query.sort || "rating";
    let sortObj = { rating: -1 };
    if (sortBy === "reads") sortObj = { readsCount: -1 };
    if (sortBy === "purchases") sortObj = { "unlockedBy": -1 };
    const scripts = await Script.find({ status: "published" })
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
    const query = { status: "published" };
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
    const scripts = await Script.find({ status: "published" })
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
    const contentTypes = await Script.distinct("contentType", { status: "published" });
    const genres = await Script.distinct("genre", { status: "published" });
    res.json({ contentTypes: contentTypes.filter(Boolean), genres: genres.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
//  INVESTOR HOME FEED — Personalised by genre / mandate prefs
// ═══════════════════════════════════════════════════════════
export const getInvestorHomeFeed = async (req, res) => {
  try {
    const investor = await User.findById(req.user._id).select(
      "industryProfile.mandates preferences"
    );

    // Gather preferred genres from mandates + general preferences
    const mandateGenres = (investor?.industryProfile?.mandates?.genres || [])
      .map((g) => g.toLowerCase().trim());
    const prefGenres = (investor?.preferences?.genres || [])
      .map((g) => g.toLowerCase().trim());
    const excludeGenres = (investor?.industryProfile?.mandates?.excludeGenres || [])
      .map((g) => g.toLowerCase().trim());

    // Deduplicated preferred genres, minus excluded ones
    const preferredGenres = [...new Set([...mandateGenres, ...prefGenres])].filter(
      (g) => g && !excludeGenres.includes(g)
    );

    const usedIds = new Set();

    // ── Genre sections (up to 4 preferred genres, 12 scripts each) ──
    const genreSections = [];
    for (const genre of preferredGenres.slice(0, 4)) {
      const scripts = await Script.find({
        status: "published",
        genre: { $regex: new RegExp(`^${genre}$`, "i") },
      })
        .populate("creator", "name profileImage role")
        .sort({ rating: -1, readsCount: -1, createdAt: -1 })
        .limit(12);

      if (scripts.length > 0) {
        scripts.forEach((s) => usedIds.add(s._id.toString()));
        genreSections.push({
          genre: genre.charAt(0).toUpperCase() + genre.slice(1),
          scripts,
        });
      }
    }

    // ── Trending (by trendScore, not already shown) ──
    const trendingAgg = await Script.aggregate([
      { $match: { status: "published" } },
      {
        $addFields: {
          trendScore: {
            $add: [
              { $multiply: [{ $ifNull: ["$reviewCount", 0] }, 3] },
              { $multiply: [{ $ifNull: ["$readsCount", 0] }, 2] },
              { $ifNull: ["$views", 0] },
            ],
          },
        },
      },
      { $sort: { trendScore: -1 } },
      { $limit: 30 },
      { $project: { _id: 1 } },
    ]);

    const trendIds = trendingAgg
      .map((s) => s._id)
      .filter((id) => !usedIds.has(id.toString()))
      .slice(0, 12);

    let trending = [];
    if (trendIds.length > 0) {
      const tDocs = await Script.find({ _id: { $in: trendIds } }).populate(
        "creator", "name profileImage role"
      );
      const tMap = Object.fromEntries(tDocs.map((d) => [d._id.toString(), d]));
      trending = trendIds.map((id) => tMap[id.toString()]).filter(Boolean);
      trending.forEach((s) => usedIds.add(s._id.toString()));
    }

    // ── New Releases (last 30 days, not already shown) ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const notUsedArray = [...usedIds];
    const newReleases = await Script.find({
      status: "published",
      createdAt: { $gte: thirtyDaysAgo },
      _id: { $nin: notUsedArray },
    })
      .populate("creator", "name profileImage role")
      .sort({ createdAt: -1 })
      .limit(12);
    newReleases.forEach((s) => usedIds.add(s._id.toString()));

    // ── Explore (top rated, outside investor's interests) ──
    const explore = await Script.find({
      status: "published",
      _id: { $nin: [...usedIds] },
    })
      .populate("creator", "name profileImage role")
      .sort({ rating: -1, createdAt: -1 })
      .limit(12);

    res.json({
      detectedGenres: preferredGenres,
      genreSections,
      trending,
      newReleases,
      explore,
    });
  } catch (error) {
    console.error("getInvestorHomeFeed error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
//  RAZORPAY PAYMENT INTEGRATION FOR SCRIPTS
// ═══════════════════════════════════════════════════════════

// @desc    Create Razorpay order for script purchase
// @route   POST /api/scripts/purchase/create-order
// @access  Private
export const createScriptPurchaseOrder = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ 
        message: "Payment system not configured. Please contact support.",
        error: "Razorpay credentials missing"
      });
    }
    
    const { scriptId } = req.body;
    
    const script = await Script.findById(scriptId).populate("creator", "name");
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }
    
    // Check if already purchased
    if (script.unlockedBy.includes(req.user._id)) {
      return res.status(400).json({ message: "You have already purchased this script" });
    }
    
    // Check if trying to buy own script
    if (script.creator._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot purchase your own script" });
    }
    
    // Create Razorpay order
    const options = {
      amount: Math.round(script.price * 100), // Amount in paise (INR) or cents
      currency: "INR",
      receipt: `script_purchase_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        scriptId: scriptId,
        scriptTitle: script.title,
        creatorId: script.creator._id.toString(),
        type: "script_purchase"
      }
    };
    
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      scriptDetails: {
        id: script._id,
        title: script.title,
        price: script.price,
        creator: script.creator.name
      }
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
};

// @desc    Verify Razorpay payment and unlock script
// @route   POST /api/scripts/purchase/verify-payment
// @access  Private
export const verifyScriptPurchase = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      scriptId 
    } = req.body;
    
    console.log("Script purchase verification:", { razorpay_order_id, razorpay_payment_id, scriptId });
    
    // Check if Razorpay key secret is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET not found in environment");
      return res.status(500).json({ 
        message: "Payment system not configured",
        success: false 
      });
    }
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (!isAuthentic) {
      console.error("Signature verification failed");
      return res.status(400).json({ 
        message: "Payment verification failed - Invalid signature",
        success: false 
      });
    }
    
    // Payment verified successfully, unlock the script
    const script = await Script.findById(scriptId).populate("creator", "name email");
    if (!script) {
      console.error("Script not found:", scriptId);
      return res.status(404).json({ 
        message: "Script not found",
        success: false 
      });
    }
    
    // Check if already unlocked
    if (script.unlockedBy.includes(req.user._id)) {
      return res.status(400).json({ 
        message: "Script already purchased",
        success: false 
      });
    }
    
    // Unlock the script for the buyer
    script.unlockedBy.push(req.user._id);
    await script.save();
    
    const reference = `SCRIPT-PURCHASE-${razorpay_payment_id}`;
    
    // Calculate platform fee and creator payout
    const platformFee = script.price * 0.10; // 10% platform fee
    const creatorPayout = script.price - platformFee;
    
    // Create transaction record for buyer
    await Transaction.create({
      user: req.user._id,
      type: "payment",
      amount: -script.price,
      currency: "INR",
      status: "completed",
      description: `Purchased script: "${script.title}"`,
      reference,
      paymentMethod: "razorpay",
      relatedScript: script._id,
      metadata: {
        razorpay_order_id,
        razorpay_payment_id,
        platformFee,
        creatorPayout
      }
    });
    
    // Credit the creator
    const creator = await User.findById(script.creator._id);
    if (!creator.wallet) {
      creator.wallet = { balance: 0, totalEarnings: 0 };
    }
    creator.wallet.balance += creatorPayout;
    creator.wallet.totalEarnings += creatorPayout;
    await creator.save();
    
    // Create transaction record for creator (earnings)
    await Transaction.create({
      user: creator._id,
      type: "credit",
      amount: creatorPayout,
      currency: "INR",
      status: "completed",
      description: `Earned from script sale: "${script.title}"`,
      reference: `SCRIPT-EARNING-${razorpay_payment_id}`,
      paymentMethod: "razorpay",
      relatedScript: script._id,
      metadata: {
        buyerId: req.user._id.toString(),
        platformFee,
        originalAmount: script.price
      }
    });
    
    // Notify the creator
    await Notification.create({
      user: script.creator._id,
      type: "purchase",
      from: req.user._id,
      script: script._id,
      message: `Your script "${script.title}" was purchased! You earned ₹${creatorPayout.toFixed(2)}`
    });
    
    console.log("Script purchase completed:", { scriptId, buyerId: req.user._id, amount: script.price });
    
    res.json({
      success: true,
      message: "Script purchased successfully!",
      script: {
        id: script._id,
        title: script.title,
        purchased: true
      },
      transaction: {
        reference,
        amount: script.price,
        platformFee,
        creatorPayout
      }
    });
  } catch (error) {
    console.error("Script purchase verification error:", error);
    res.status(500).json({ 
      message: "Failed to verify payment", 
      error: error.message,
      success: false 
    });
  }
};

// @desc    Create Razorpay order for script hold/option
// @route   POST /api/scripts/hold/create-order
// @access  Private
export const createScriptHoldOrder = async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ 
        message: "Payment system not configured. Please contact support.",
        error: "Razorpay credentials missing"
      });
    }
    
    const { scriptId } = req.body;
    
    const script = await Script.findById(scriptId).populate("creator", "name");
    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }
    
    // Check if already held
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
    
    const holdFee = script.holdFee || 200;
    
    // Create Razorpay order
    const options = {
      amount: Math.round(holdFee * 100), // Amount in paise (INR) or cents
      currency: "INR",
      receipt: `script_hold_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        scriptId: scriptId,
        scriptTitle: script.title,
        creatorId: script.creator._id.toString(),
        holdFee: holdFee,
        type: "script_hold"
      }
    };
    
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      scriptDetails: {
        id: script._id,
        title: script.title,
        holdFee: holdFee,
        creator: script.creator.name
      }
    });
  } catch (error) {
    console.error("Razorpay hold order creation error:", error);
    res.status(500).json({ message: "Failed to create payment order", error: error.message });
  }
};

// @desc    Verify Razorpay payment and place hold on script
// @route   POST /api/scripts/hold/verify-payment
// @access  Private
export const verifyScriptHold = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      scriptId 
    } = req.body;
    
    console.log("Script hold verification:", { razorpay_order_id, razorpay_payment_id, scriptId });
    
    // Check if Razorpay key secret is available
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET not found in environment");
      return res.status(500).json({ 
        message: "Payment system not configured",
        success: false 
      });
    }
    
    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");
    
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (!isAuthentic) {
      console.error("Signature verification failed");
      return res.status(400).json({ 
        message: "Payment verification failed - Invalid signature",
        success: false 
      });
    }
    
    // Payment verified successfully, place hold on script
    const script = await Script.findById(scriptId).populate("creator", "name email");
    if (!script) {
      console.error("Script not found:", scriptId);
      return res.status(404).json({ 
        message: "Script not found",
        success: false 
      });
    }
    
    // Double-check hold status
    if (script.holdStatus === "held") {
      return res.status(400).json({ 
        message: "Script is already held",
        success: false 
      });
    }
    
    const user = await User.findById(req.user._id);
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
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id
    });

    // Update script
    script.holdStatus = "held";
    script.heldBy = req.user._id;
    script.holdStartDate = new Date();
    script.holdEndDate = endDate;
    await script.save();

    const reference = `SCRIPT-HOLD-${razorpay_payment_id}`;
    
    // Create transaction record for holder (payment)
    await Transaction.create({
      user: req.user._id,
      type: "payment",
      amount: -fee,
      currency: "INR",
      status: "completed",
      description: `Placed hold on script: "${script.title}" (30 days)`,
      reference,
      paymentMethod: "razorpay",
      relatedScript: script._id,
      metadata: {
        razorpay_order_id,
        razorpay_payment_id,
        holdEndDate: endDate,
        platformCut,
        creatorPayout
      }
    });
    
    // Credit the creator
    const creator = await User.findById(script.creator._id);
    if (!creator.wallet) {
      creator.wallet = { balance: 0, totalEarnings: 0 };
    }
    creator.wallet.balance += creatorPayout;
    creator.wallet.totalEarnings += creatorPayout;
    await creator.save();
    
    // Create transaction record for creator (earnings)
    await Transaction.create({
      user: creator._id,
      type: "credit",
      amount: creatorPayout,
      currency: "INR",
      status: "completed",
      description: `Earned from script hold: "${script.title}"`,
      reference: `SCRIPT-HOLD-EARNING-${razorpay_payment_id}`,
      paymentMethod: "razorpay",
      relatedScript: script._id,
      metadata: {
        holderId: req.user._id.toString(),
        platformCut,
        originalAmount: fee,
        holdEndDate: endDate
      }
    });

    // Notify the creator
    await Notification.create({
      user: script.creator._id,
      type: "hold",
      from: req.user._id,
      script: script._id,
      message: `${user.name} has placed a hold on "${script.title}" for ₹${fee} (30 days). You earn ₹${creatorPayout.toFixed(2)}!`,
    });

    console.log("Script hold completed:", { scriptId, holderId: req.user._id, fee });

    res.json({
      success: true,
      message: "Hold placed successfully!",
      option,
      holdDetails: {
        fee,
        platformCut,
        creatorPayout,
        expiresAt: endDate,
      },
      transaction: {
        reference,
        amount: fee
      }
    });
  } catch (error) {
    console.error("Script hold verification error:", error);
    res.status(500).json({ 
      message: "Failed to verify payment", 
      error: error.message,
      success: false 
    });
  }
};

// ── Multer Configuration for Thumbnail & Trailer Uploads ──

// Storage configuration for thumbnails
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "thumbnails"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `thumb-${req.params.id || Date.now()}-${Date.now()}${ext}`);
  },
});

// Storage configuration for trailers
const trailerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "trailers"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `trailer-${req.params.id || Date.now()}-${Date.now()}${ext}`);
  },
});

// File filters
const imageFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed"), false);
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowed = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only MP4, MPEG, MOV and WebM videos are allowed"), false);
  }
};

// Export multer upload instances
export const uploadThumbnail = multer({ 
  storage: thumbnailStorage, 
  fileFilter: imageFileFilter, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const uploadTrailer = multer({ 
  storage: trailerStorage, 
  fileFilter: videoFileFilter, 
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// ── Upload Thumbnail Controller ──
export const uploadScriptThumbnail = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No thumbnail file provided" });
    }

    const scriptId = req.params.id;
    const script = await Script.findById(scriptId);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can upload a thumbnail" });
    }

    // Save the thumbnail path
    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
    script.coverImage = thumbnailUrl;
    await script.save();

    res.json({ 
      message: "Thumbnail uploaded successfully", 
      thumbnailUrl,
      script 
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Upload Trailer Controller ──
export const uploadScriptTrailer = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No trailer file provided" });
    }

    const scriptId = req.params.id;
    const script = await Script.findById(scriptId);

    if (!script) {
      return res.status(404).json({ message: "Script not found" });
    }

    if (script.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the script creator can upload a trailer" });
    }

    // Save the uploaded trailer path (free, no credits required)
    const trailerUrl = `/uploads/trailers/${req.file.filename}`;
    script.uploadedTrailerUrl = trailerUrl;
    script.trailerSource = "uploaded";
    script.trailerStatus = "ready";
    await script.save();

    res.json({ 
      message: "Trailer uploaded successfully (free)", 
      trailerUrl,
      trailerSource: "uploaded",
      script 
    });
  } catch (error) {
    console.error("Trailer upload error:", error);
    res.status(500).json({ message: error.message });
  }
};

