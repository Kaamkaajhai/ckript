import mongoose from "mongoose";
import Competition from "./server/models/Competition.js";

async function run() {
  await mongoose.connect("mongodb://127.0.0.1:27017/scriptbridge", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).catch(() => mongoose.connect("mongodb://localhost:27017/scriptbridge")); // Try fallback if needed

  console.log("Connected to MongoDB");
  
  const comp = await Competition.findById("6a6a38b6588d5f7cb41a2a90");
  if (!comp) {
    console.log("No competition found");
    process.exit(0);
  }
  
  console.log("Found competition:", comp.name);

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
