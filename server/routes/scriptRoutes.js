import express from "express";
import protect from "../middleware/authMiddleware.js";
import { 
  uploadScript, getScripts, getScriptById, unlockScript, 
  holdScript, releaseHold, getMyHolds, addRoles 
} from "../controllers/scriptController.js";

const router = express.Router();

router.post("/upload", protect, uploadScript);
router.get("/", protect, getScripts);
router.get("/holds", protect, getMyHolds);
router.get("/:id", protect, getScriptById);
router.post("/unlock", protect, unlockScript);
router.post("/hold", protect, holdScript);
router.post("/release-hold", protect, releaseHold);
router.post("/add-roles", protect, addRoles);

export default router;
