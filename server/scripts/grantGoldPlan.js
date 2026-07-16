// One-off: grant a writer the Gold plan by email, mirroring the admin grant
// (adminController.updateUserPlan). Read-only by default; pass --apply to write.
//
//   node scripts/grantGoldPlan.js <email>            # report only (no change)
//   node scripts/grantGoldPlan.js <email> --apply    # actually grant Gold
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const email = process.argv[2];
const apply = process.argv.includes("--apply");

if (!email) {
  console.error("Usage: node scripts/grantGoldPlan.js <email> [--apply]");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  // Case-insensitive exact email match.
  const user = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log("Found user:", {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    currentPlan: user.subscription?.plan || "free",
    accessTier: user.subscription?.accessTier || "none",
    accessStatus: user.subscription?.accessStatus || "inactive",
    accessExpiresAt: user.subscription?.accessExpiresAt || null,
  });

  if (!apply) {
    console.log("\nDRY RUN — no changes written. Re-run with --apply to grant Gold.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days, same as the plan model

  user.subscription = {
    ...(user.subscription ? user.subscription.toObject?.() ?? user.subscription : {}),
    plan: "gold",
    aiImagesGeneratedTotal: 0,
    isActive: true,
    accessTier: "writer_gold",
    accessStatus: "active",
    accessActivatedAt: now,
    accessExpiresAt: expiresAt,
    expiresAt,
    lastAccessUpdate: now,
  };

  if (user.writerProfile) {
    user.writerProfile.plan = "gold";
  }

  await user.save();

  const fresh = await User.findById(user._id).select("name email subscription.plan subscription.accessTier subscription.accessStatus subscription.accessExpiresAt");
  console.log("\n✅ Gold plan granted:", {
    name: fresh.name,
    email: fresh.email,
    plan: fresh.subscription?.plan,
    accessTier: fresh.subscription?.accessTier,
    accessStatus: fresh.subscription?.accessStatus,
    accessExpiresAt: fresh.subscription?.accessExpiresAt,
  });

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Error:", err);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
