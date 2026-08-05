import mongoose from "mongoose";
import Competition from "./server/models/Competition.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/scriptbridge", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch(() => mongoose.connect("mongodb://localhost:27017/scriptbridge")); // Try fallback if needed

  console.log("Connected to MongoDB");
  
  // Find a competition
  const comp = await Competition.findOne();
  if (!comp) {
    console.log("No competition found");
    process.exit(0);
  }
  
  console.log("Found competition:", comp.name);
  
  // Try to update it the same way the controller does
  const CONTENT_FIELDS = [
    "name", "shortName", "tagline", "shortDescription", "host", "language", "timezone", 
    "eventType", "competitionCategory", "difficulty", "expectedParticipants", "estimatedReadingTime",
    "featuredBadge", "trendingBadge", "newBadge", "highlights", "seo", "automation",
    "theme", "overview", "eligibility", "format", "prizes", "detailedPrizes", "rules",
    "faq", "judges", "sponsors", "communityLinks", "resources",
    "bannerUrl", "mobileBannerUrl", "cardThumbnailUrl", "ogImageUrl", "logoUrl", "backgroundImageUrl", "gallery",
    "cardConfig", "prizePool", "visibility", "referralTiers",
  ];
  
  const incoming = {
    rules: [""],
    faq: [{ q: "", a: "" }],
    eligibility: "",
    format: "Some format",
    // Simulate what AdminCompetitionsEditor might send
  };
  
  for (const field of CONTENT_FIELDS) {
    if (incoming[field] !== undefined) comp[field] = incoming[field];
  }

  try {
    await comp.save();
    console.log("Save successful!");
  } catch (error) {
    console.error("Save failed:", error.message);
    if (error.errors) {
      for (const key in error.errors) {
        console.error("-", key, ":", error.errors[key].message);
      }
    }
  }
  
  process.exit(0);
}

run();
