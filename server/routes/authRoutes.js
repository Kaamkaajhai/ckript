import express from "express";
import { join, login, getMe } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/join", join);
router.post("/login", login);
router.get("/me", protect, getMe);

export default router;
