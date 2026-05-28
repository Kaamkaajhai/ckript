import express from "express";
const router = express.Router();

// Simple endpoints to serve verification tokens to crawlers if needed.
router.get("/google.txt", (req, res) => {
  const token = process.env.GOOGLE_VERIFICATION || "";
  if (!token) return res.status(404).send("Not found");
  res.type("text/plain").send(token);
});

router.get("/bing.txt", (req, res) => {
  const token = process.env.BING_VERIFICATION || "";
  if (!token) return res.status(404).send("Not found");
  res.type("text/plain").send(token);
});

export default router;
