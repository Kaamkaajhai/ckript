import express from "express";
import { 
  getTags, 
  createTag, 
  getTagsGrouped,
  incrementTagUsage,
  seedTags 
} from "../controllers/tagController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getTags);
router.get("/grouped", getTagsGrouped);
router.post("/", protect, createTag);
router.put("/:id/increment", protect, incrementTagUsage);
router.post("/seed", seedTags); // Consider adding admin middleware

export default router;
