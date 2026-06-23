// Dev/test helper: add a user as an ACCEPTED collaborator on a script, so they have
// access (presence, locks, etc.) without going through the email invite/accept flow.
//
// Usage (from the server/ directory, with the server's .env present):
//   node scripts/addCollaborator.mjs <scriptId> <collaboratorEmail> [role]
//
// role defaults to "editor" (one of: editor | merger | viewer | full_admin).
// The collaborator email must belong to an already-registered account.

import "dotenv/config";
import mongoose from "mongoose";
import Script from "../models/Script.js";
import User from "../models/User.js";

const [, , scriptId, email, role = "editor"] = process.argv;

if (!scriptId || !email) {
  console.error("Usage: node scripts/addCollaborator.mjs <scriptId> <collaboratorEmail> [role]");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("_id name email");
  if (!user) {
    console.error(`No registered user with email "${email}". Sign that account up in the app first.`);
    process.exit(1);
  }

  const script = await Script.findById(scriptId);
  if (!script) {
    console.error(`No script with id "${scriptId}".`);
    process.exit(1);
  }

  if (String(script.creator) === String(user._id)) {
    console.error("That user is the owner of this script — they already have access.");
    process.exit(1);
  }

  const existing = (script.collaborators || []).find((c) => String(c.userId) === String(user._id));
  if (existing) {
    existing.role = role;
    existing.accessLevel = "full_access";
    existing.status = "accepted";
    existing.isActive = true;
    existing.joinedAt = existing.joinedAt || new Date();
  } else {
    script.collaborators.push({
      userId: user._id,
      role,
      accessLevel: "full_access",
      status: "accepted",
      isActive: true,
      joinedAt: new Date(),
    });
  }

  await script.save();
  console.log(`OK — ${user.name || user.email} is now an accepted "${role}" collaborator on "${script.title}".`);
  console.log("They can now open this script and you'll see each other in presence.");
  process.exit(0);
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
