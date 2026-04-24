import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env regardless of process working directory
dotenv.config({ path: path.join(__dirname, ".env") });

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import scriptRoutes from "./routes/scriptRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import searchRoutes from "./routes/search.js";
import aiRoutes from "./routes/aiRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import auditionRoutes from "./routes/auditionRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import creditsRoutes from "./routes/creditsRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import scriptPitchRoutes from "./routes/scriptPitchRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import legalRoutes from "./routes/legalRoutes.js";
import agreementRoutes from "./routes/agreementRoutes.js";
import {
  applyGlobalSecurity,
  apiLimiter,
  authLimiter,
  paymentLimiter,
} from "./middleware/securityMiddleware.js";

const ensureDefaultAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@ckript.com").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || "admin123").trim();

  if (!adminEmail || !adminPassword) {
    console.warn("Skipping admin bootstrap due to missing ADMIN_EMAIL or ADMIN_PASSWORD.");
    return;
  }

  try {
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        name: process.env.ADMIN_NAME || "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        emailVerified: true,
      });
      console.log(`Default admin created: ${adminEmail}`);
      return;
    }

    let hasChanges = false;

    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      hasChanges = true;
    }

    if (!existingAdmin.emailVerified) {
      existingAdmin.emailVerified = true;
      hasChanges = true;
    }

    // Keep admin panel credentials valid when DB resets or password drifts.
    const passwordMatches = await existingAdmin.matchPassword(adminPassword);
    if (!passwordMatches) {
      existingAdmin.password = adminPassword;
      hasChanges = true;
    }

    if (hasChanges) {
      await existingAdmin.save();
      console.log(`Default admin account synchronized: ${adminEmail}`);
    }
  } catch (error) {
    console.error("Default admin bootstrap failed:", error.message);
  }
};

connectDB()
  .then(() => ensureDefaultAdmin())
  .catch((error) => {
    console.error("Database bootstrap failed:", error.message);
  });

const app = express();
const isVercel = Boolean(process.env.VERCEL);

app.disable("x-powered-by");
app.set("trust proxy", 1);

applyGlobalSecurity(app);

const localOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
];

const envOrigins = [process.env.CLIENT_URL, process.env.CORS_ORIGINS]
  .filter(Boolean)
  .flatMap((value) => String(value).split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...localOrigins, ...envOrigins])];

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
};

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

const parseChatParticipantIds = (chatId) => {
  if (typeof chatId !== "string") return null;
  const ids = chatId.split("_");
  if (ids.length !== 2) return null;
  if (!ids.every((id) => OBJECT_ID_REGEX.test(id))) return null;
  return ids;
};

const canAccessChatRoom = (chatId, userId) => {
  const participantIds = parseChatParticipantIds(chatId);
  if (!participantIds) return false;
  return participantIds.includes(String(userId));
};

const extractSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken && typeof authToken === "string") {
    return authToken.replace(/^Bearer\s+/i, "").trim();
  }

  const headerValue = socket.handshake?.headers?.authorization;
  if (headerValue && typeof headerValue === "string") {
    return headerValue.replace(/^Bearer\s+/i, "").trim();
  }

  return "";
};

const createRealtimeServer = () => {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket);
      if (!token) {
        return next(new Error("Not authorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role isDeactivated isFrozen");
      if (!user) {
        return next(new Error("Not authorized"));
      }

      if (user.isDeactivated || user.isFrozen) {
        return next(new Error("Account is restricted"));
      }

      socket.user = {
        _id: user._id.toString(),
        role: user.role,
      };

      return next();
    } catch {
      return next(new Error("Not authorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    const socketUserId = socket.user?._id;
    socket.join(`notifications-${socketUserId}`);

    socket.on("join-chat", (chatId) => {
      if (!canAccessChatRoom(chatId, socketUserId)) {
        socket.emit("socket-error", { event: "join-chat", message: "Access denied." });
        return;
      }

      socket.join(chatId);
      console.log(`User ${socket.id} joined chat: ${chatId}`);
    });

    socket.on("join-notifications", (userId) => {
      const targetUserId = String(userId || socketUserId);
      if (targetUserId !== socketUserId) {
        socket.emit("socket-error", { event: "join-notifications", message: "Access denied." });
        return;
      }

      socket.join(`notifications-${socketUserId}`);
      console.log(`User ${socket.id} joined notifications for: ${socketUserId}`);
    });

    socket.on("send-message", (data = {}) => {
      const chatId = String(data.chatId || "");
      if (!canAccessChatRoom(chatId, socketUserId)) {
        socket.emit("socket-error", { event: "send-message", message: "Access denied." });
        return;
      }

      const payloadSenderId = data?.sender?._id || data?.sender;
      if (payloadSenderId && String(payloadSenderId) !== socketUserId) {
        socket.emit("socket-error", { event: "send-message", message: "Sender mismatch." });
        return;
      }

      io.to(chatId).emit("receive-message", data);
    });

    socket.on("typing", (data = {}) => {
      const chatId = String(data.chatId || "");
      if (!canAccessChatRoom(chatId, socketUserId)) {
        socket.emit("socket-error", { event: "typing", message: "Access denied." });
        return;
      }

      socket.to(chatId).emit("user-typing", {
        chatId,
        userId: socketUserId,
      });
    });

    socket.on("smart-match-alert", (data = {}) => {
      const targetUserId = String(data.userId || "");
      if (!targetUserId || targetUserId !== socketUserId) {
        socket.emit("socket-error", { event: "smart-match-alert", message: "Access denied." });
        return;
      }

      io.to(`notifications-${targetUserId}`).emit("new-match", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return server;
};

// CORS Configuration - MUST be before routes
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Baseline abuse protection (route-level limiters remain stricter for sensitive endpoints)
app.use("/api", apiLimiter);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "7d",
  etag: true,
  lastModified: true,
}));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/scripts", scriptRoutes);
app.use("/api/payment", paymentLimiter, paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/auditions", auditionRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/credits", paymentLimiter, creditsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", analyticsRoutes);
app.use("/api/script-pitches", scriptPitchRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/legal", legalRoutes);
app.use("/api/agreements", agreementRoutes);

export default app;

if (!isVercel) {
  const server = createRealtimeServer();
  const PORT = process.env.PORT || 5002;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
