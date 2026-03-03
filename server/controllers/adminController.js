import User from "../models/User.js";
import Script from "../models/Script.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import jwt from "jsonwebtoken";

// ─── Dashboard Stats ───
export const getStats = async (req, res) => {
    try {
        const [totalUsers, totalScripts, totalInvestors, totalWriters, totalReaders, pendingApprovals, totalTransactions] = await Promise.all([
            User.countDocuments({ role: { $ne: "admin" } }),
            Script.countDocuments(),
            User.countDocuments({ role: "investor" }),
            User.countDocuments({ role: { $in: ["writer", "creator"] } }),
            User.countDocuments({ role: "reader" }),
            Script.countDocuments({ status: "pending_approval" }),
            Transaction.countDocuments({ status: "completed" }),
        ]);

        const revenueResult = await Transaction.aggregate([
            { $match: { status: "completed", type: { $in: ["credit", "payment"] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        res.json({
            totalUsers,
            totalScripts,
            totalInvestors,
            totalWriters,
            totalReaders,
            pendingApprovals,
            totalTransactions,
            totalRevenue,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── User Lists by Role ───
export const getUsers = async (req, res) => {
    try {
        const { role, search, page = 1, limit = 20 } = req.query;
        const filter = { role: { $ne: "admin" } };
        if (role) filter.role = role;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ users, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── All Scripts ───
export const getScripts = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { genre: { $regex: search, $options: "i" } },
            ];
        }
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Scripts Using AI ───
export const getAIUsageScripts = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = {
            $or: [
                { "services.evaluation": true },
                { "services.aiTrailer": true },
                { "scriptScore.overall": { $exists: true, $ne: null } },
            ],
        };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Evaluation Purchases ───
export const getEvaluationPurchases = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { "services.evaluation": true };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Investor Purchases ───
export const getInvestorPurchases = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const scripts = await Script.find({ unlockedBy: { $exists: true, $not: { $size: 0 } } })
            .populate("creator", "name email role profileImage")
            .populate("unlockedBy", "name email role profileImage")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        const total = await Script.countDocuments({ unlockedBy: { $exists: true, $not: { $size: 0 } } });
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Payments Data ───
export const getPayments = async (req, res) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        const total = await Transaction.countDocuments(filter);
        const transactions = await Transaction.find(filter)
            .populate("user", "name email role profileImage")
            .populate("relatedScript", "title")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ transactions, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Score Lists ───
export const getAIScores = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { "scriptScore.overall": { $exists: true, $ne: null } };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ "scriptScore.overall": -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPlatformScores = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { "platformScore.overall": { $exists: true, $ne: null } };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .populate("platformScore.scoredBy", "name")
            .sort({ "platformScore.overall": -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getReaderScores = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { rating: { $gt: 0 }, reviewCount: { $gt: 0 } };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ rating: -1, reviewCount: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Script Approval ───
export const getPendingScripts = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { status: "pending_approval" };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveScript = async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ message: "Script not found" });
        script.status = "published";
        script.adminApproved = true;
        script.rejectionReason = undefined;
        await script.save();

        // Notify the writer
        await Notification.create({
            user: script.creator,
            type: "script_approved",
            script: script._id,
            message: `Your project "${script.title}" has been approved and is now live on the platform.`,
        });

        res.json({ message: "Script approved and published", script });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectScript = async (req, res) => {
    try {
        const { reason } = req.body;
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ message: "Script not found" });
        script.status = "rejected";
        script.adminApproved = false;
        if (reason) script.rejectionReason = reason;
        await script.save();

        // Notify the writer
        await Notification.create({
            user: script.creator,
            type: "script_rejected",
            script: script._id,
            message: `Your project "${script.title}" was not approved.${ reason ? ` Reason: ${reason}` : " Please review and resubmit." }`,
        });

        res.json({ message: "Script rejected", script, reason });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Platform Scoring ───
export const scoreScript = async (req, res) => {
    try {
        const { content, trailer, title, synopsis, tags, feedback, strengths, weaknesses, prospects } = req.body;
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ message: "Script not found" });

        const scores = [content, trailer, title, synopsis, tags].filter((s) => s != null);
        const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        script.platformScore = {
            overall,
            content: content || 0,
            trailer: trailer || 0,
            title: title || 0,
            synopsis: synopsis || 0,
            tags: tags || 0,
            feedback: feedback || "",
            strengths: strengths || "",
            weaknesses: weaknesses || "",
            prospects: prospects || "",
            scoredBy: req.user._id,
            scoredAt: new Date(),
        };
        await script.save();
        res.json({ message: "Platform score saved", script });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── AI Trailer Requests ───
export const getTrailerRequests = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const filter = { "services.aiTrailer": true };
        const total = await Script.countDocuments(filter);
        const scripts = await Script.find(filter)
            .populate("creator", "name email role profileImage")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ scripts, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveTrailer = async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ message: "Script not found" });
        script.trailerStatus = "ready";
        await script.save();
        res.json({ message: "Trailer approved", script });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Login As User (Impersonation) ───
export const loginAsUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        const expiresIn = "2h";
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn });
        const decoded = jwt.decode(token);

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
            expiresAt: decoded.exp * 1000,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Get Single Script Detail (for admin review) ───
export const getScriptDetail = async (req, res) => {
    try {
        const script = await Script.findById(req.params.id)
            .populate("creator", "name email role profileImage bio")
            .populate("unlockedBy", "name email role")
            .populate("platformScore.scoredBy", "name");
        if (!script) return res.status(404).json({ message: "Script not found" });
        res.json(script);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
