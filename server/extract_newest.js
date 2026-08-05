import mongoose from "mongoose";
import dotenv from "dotenv";
import Script from "./models/Script.js";
import { extractTextFromPdfUrl } from "./utils/pdfTextExtraction.js";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const scripts = await Script.find({ fileUrl: { $ne: null, $ne: "" } }).sort({ updatedAt: -1 }).limit(10);
  
  for (const script of scripts) {
      console.log(`\nRe-extracting script: ${script.title}`);
      try {
          const { text, pageTexts, strategy } = await extractTextFromPdfUrl(script.fileUrl);
          if (text) {
             script.scriptText = text;
             if (pageTexts && pageTexts.length > 0) {
                script.scriptPreviewPageTexts = pageTexts;
             }
             await script.save();
             console.log(`Success!`);
          }
      } catch (err) {
          console.error(`Failed: ${err.message}`);
      }
  }
  
  process.exit(0);
};

run();
