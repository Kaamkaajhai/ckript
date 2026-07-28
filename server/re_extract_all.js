import mongoose from "mongoose";
import dotenv from "dotenv";
import Script from "./models/Script.js";
import { extractTextFromPdfUrl } from "./utils/pdfTextExtraction.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const scripts = await Script.find({ fileUrl: { $ne: null, $ne: "" } });
    console.log(`Found ${scripts.length} scripts to re-extract...`);

    let i = 1;
    for (const script of scripts) {
      console.log(`[${i}/${scripts.length}] Re-extracting script: ${script.title} (${script._id})`);
      try {
        const remoteUrl = script.fileUrl;
        const extraction = await extractTextFromPdfUrl(remoteUrl);
        const extractedText = String(extraction?.text || "").trim();

        if (extractedText) {
          script.textContent = extraction.text;
          if (!Number(script.pageCount) && Number(extraction?.numItems) > 0) {
            script.pageCount = Number(extraction.numItems);
          }
          if (Array.isArray(extraction?.pageTexts) && extraction.pageTexts.length > 0) {
            script.scriptPreviewPageTexts = extraction.pageTexts;
          }
          await script.save();
          console.log(`  -> Success`);
        } else {
          console.log(`  -> Skipped (no text extracted)`);
        }
      } catch (err) {
        console.error(`  -> Failed:`, err.message);
      }
      i++;
    }

    console.log("Finished all scripts.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
