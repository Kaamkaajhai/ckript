import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // --- ADD THIS BYPASS BLOCK FOR LOAD TESTING ---
      if (process.env.NODE_ENV === "test" || process.env.BYPASS_DB_AUTH === "true") {
        req.user = { _id: decoded.id, role: "writer", name: "Artillery" };
        return next();
      }
      
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists" });
      }
      if (req.user.isDeactivated) {
        return res.status(403).json({ message: "This account has been deleted", accountDeleted: true });
      }
      if (req.user.isFrozen) {
        return res.status(403).json({
          message: req.user.frozenReason || "This account has been frozen by admin",
          accountFrozen: true,
        });
      }

      // Check session validity
      if (decoded.sessionId) {
        const session = req.user.activeSessions?.find(s => s.sessionId === decoded.sessionId);
        if (!session) {
          return res.status(401).json({ message: "Session revoked. Please log in again.", sessionRevoked: true });
        }
        
        // Update lastSeen if it's older than 5 minutes (300,000 ms)
        const FIVE_MINUTES = 5 * 60 * 1000;
        if (Date.now() - new Date(session.lastSeen).getTime() > FIVE_MINUTES) {
          session.lastSeen = new Date();
          // Fire and forget save to avoid blocking the request
          req.user.save().catch(err => console.error("Failed to update lastSeen:", err));
        }
        
        req.sessionId = decoded.sessionId;
      } else {
        // Legacy token without sessionId: log them out to force creating a stateful session
        return res.status(401).json({ message: "Session expired. Please log in again.", sessionRevoked: true });
      }

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired, please login again", expired: true });
      }
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};

export default protect;
