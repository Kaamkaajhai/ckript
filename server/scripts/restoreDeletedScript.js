/**
 * Find and restore a project a writer deleted by mistake.
 *
 * Deleting a project is a SOFT delete (scriptController.deleteScript): it sets `isDeleted` and
 * `deletedAt` and leaves the document, its content and its competition entry completely intact. So
 * "I deleted my challenge project" is recoverable in full — but there is no restore endpoint
 * anywhere in the product, admin included, which is why this script exists.
 *
 * What the writer sees meanwhile: the editor's loader treats 403 and 404 identically and renders
 * "Access Removed — the project owner has removed your collaboration permissions"
 * (CreateProject/index.jsx:828). For someone who deleted their OWN project that message is simply
 * untrue, and it is why this gets reported as access being revoked rather than as a deletion.
 *
 * Note what CANNOT have happened: a competition with entries cannot be deleted — adminDeleteCompetition
 * refuses with a 409 while any entry exists. If a writer says the challenge vanished, it is their
 * project that went, not the challenge.
 *
 *   node scripts/restoreDeletedScript.js --email someone@example.com          # report only
 *   node scripts/restoreDeletedScript.js --email someone@example.com --restore
 *   node scripts/restoreDeletedScript.js --script <scriptId> --restore        # disambiguate
 *
 * REPORTS BY DEFAULT AND WRITES NOTHING. `--restore` is the only thing that changes data, and even
 * then it touches exactly one field pair on scripts the named user owns and that are actually
 * deleted. Every other delete side effect is left alone deliberately: the purchase-request lock was
 * RELEASED on delete, and re-applying a stale lock would be a second bug on top of the first.
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Script from "../models/Script.js";
import Competition from "../models/Competition.js";
import CompetitionEntry from "../models/CompetitionEntry.js";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : "";
};
const RESTORE = process.argv.includes("--restore");
const email = arg("email").trim().toLowerCase();
const scriptId = arg("script").trim();

const line = (label, value) => console.log(`    ${label.padEnd(18)} ${value}`);

const describe = async (script) => {
  console.log(`\n  ${script.isDeleted ? "🗑" : "•"}  "${script.title || "Untitled"}"`);
  line("script id", String(script._id));
  line("status", script.status || "(none)");
  line("deleted", script.isDeleted ? `yes, at ${script.deletedAt?.toISOString?.() || "unknown time"}` : "no");
  line("competition-locked", script.competitionLocked ? "yes (submitted — cannot have been deleted)" : "no");
  line("content", `${String(script.fountainContent || script.textContent || "").length} characters — intact`);

  if (script.competitionId) {
    const competition = await Competition.findById(script.competitionId).select("name lifecycle").lean();
    line("challenge", competition ? `${competition.name} (${competition.lifecycle})` : "(competition not found)");
  }

  const entry = await CompetitionEntry.findOne({ scriptId: script._id }).select("eventId status competitionId").lean();
  if (entry) {
    const competition = await Competition.findById(entry.competitionId).select("name").lean();
    line("entry", `${entry.eventId} — status "${entry.status}" in ${competition?.name || "(unknown challenge)"}`);
    // The entry is what proves they participated. It survives the delete untouched, which is what
    // makes restoring the script enough to put them back exactly where they were.
    line("entry intact", "yes — the deletion never touched it");
  }
};

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI is not set — this script reads the same .env the server does.");
  if (!email && !scriptId) {
    throw new Error("Pass --email <address> to find their deleted projects, or --script <id> for one exactly.");
  }

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}`);

  let scripts = [];
  let owner = null;

  if (scriptId) {
    if (!mongoose.Types.ObjectId.isValid(scriptId)) throw new Error(`"${scriptId}" is not a valid script id.`);
    const script = await Script.findById(scriptId);
    if (!script) throw new Error("No script with that id.");
    scripts = [script];
    owner = await User.findById(script.creator).select("name email").lean();
  } else {
    owner = await User.findOne({ email }).select("_id name email").lean();
    if (!owner) throw new Error(`No account with the email ${email}.`);
    scripts = await Script.find({ creator: owner._id, isDeleted: true }).sort({ deletedAt: -1 });
  }

  console.log(`\nWriter: ${owner?.name || "(unknown)"} <${owner?.email || "?"}>`);

  if (!scripts.length) {
    console.log("\nNo deleted projects on this account.");
    console.log("If they still cannot open the challenge, the cause is something else — send me what");
    console.log("the page says and I will trace it.");
    return;
  }

  console.log(`\n${scripts.length} deleted project${scripts.length === 1 ? "" : "s"}:`);
  for (const script of scripts) await describe(script);

  const restorable = scripts.filter((s) => s.isDeleted);
  if (!restorable.length) {
    console.log("\nNothing here is deleted, so there is nothing to restore.");
    return;
  }

  if (!RESTORE) {
    console.log("\n─────────────────────────────────────────────────────────────");
    console.log("Nothing was changed — this was a report.");
    if (restorable.length > 1) {
      console.log("More than one project is deleted. Re-run with --script <id> for the right one,");
      console.log("or add --restore to bring back all of them.");
    } else {
      console.log("Re-run with --restore to bring it back.");
    }
    return;
  }

  console.log("\nRestoring…");
  for (const script of restorable) {
    script.isDeleted = false;
    script.deletedAt = null;
    await script.save();
    // Mirrors the audit line deleteScript writes, so a restore is as traceable as the delete was.
    console.info("[AUDIT] Script restored", {
      scriptId: script._id.toString(),
      scriptSid: script.sid || "",
      title: script.title || "",
      restoredBy: "restoreDeletedScript.js",
      at: new Date().toISOString(),
    });
    console.log(`  ✓ "${script.title || "Untitled"}" is back`);
  }

  console.log("\nTell them to reload the challenge page — the project and their entry are both there.");
};

run()
  .catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  });
