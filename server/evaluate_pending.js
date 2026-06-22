import mongoose from "mongoose";
import { runScriptScoreGeneration } from "./controllers/aiController.js";
import Script from "./models/Script.js";

import { config } from "dotenv";
config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  
  // Find all scripts for this user that don't have an evaluation
  // Since we don't know the exact user ID, we just find any that don't have a score and are published or pending
  const scripts = await Script.find({ "scriptScore.overall": { $exists: false } }).limit(10);
  console.log(`Found ${scripts.length} scripts to evaluate.`);
  
  for (const script of scripts) {
    console.log(`Evaluating ${script.title} (${script._id})...`);
    try {
      await runScriptScoreGeneration({ scriptId: script._id, userId: script.creator });
      console.log(`Successfully evaluated ${script._id}`);
    } catch (e) {
      console.error(`Failed to evaluate ${script._id}:`, e);
    }
  }
  process.exit(0);
}

run();
