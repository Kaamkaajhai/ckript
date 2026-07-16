import express from "express";
import protect from "../middleware/authMiddleware.js";
import { rateScript, getProducerRatings, deleteProducerRating } from "../controllers/producerRatingController.js";

const router = express.Router();

router.post("/", protect, rateScript);
router.get("/:scriptId", protect, getProducerRatings);
router.delete("/:id", protect, deleteProducerRating);

export default router;
