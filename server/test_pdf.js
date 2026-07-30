import mongoose from "mongoose";
import dotenv from "dotenv";
import Script from "./models/Script.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import fetch from "node-fetch";

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const scripts = await Script.find({ fileUrl: { $ne: null, $ne: "" } }).sort({ updatedAt: -1 }).limit(10);
  
  for (const script of scripts) {
      console.log(`\nTesting script: ${script.title}`);
      try {
          const res = await fetch(script.fileUrl);
          const buffer = Buffer.from(await res.arrayBuffer());
          
          const data = await pdfParse(buffer, {
             pagerender: async (pageData) => {
                  if (pageData.pageIndex > 1) return "";
                  const textContent = await pageData.getTextContent({
                      normalizeWhitespace: false,
                      disableCombineTextItems: true
                  });
                  let text = '';
                  let lastY;
                  let lastX = 0;
                  let lastWidth = 0;
                  for (let item of textContent.items) {
                      if (lastY == item.transform[5] || !lastY){
                          if (lastY && text && !text.endsWith(' ')) {
                              const expectedNextX = lastX + lastWidth;
                              const actualX = item.transform[4];
                              if (actualX - expectedNextX > (item.height || 12) * 0.15) {
                                  if (actualX - expectedNextX > (item.height || 12) * 0.45) {
                                      text += '  ';
                                  } else {
                                      text += ' ';
                                  }
                              }
                          }
                          text += item.str;
                      }  
                      else{
                          text += '\n' + item.str;
                      }    
                      lastY = item.transform[5];
                      lastX = item.transform[4];
                      lastWidth = item.width;
                  }
                  return text;
             }
          });
          
          const snippet = data.text.slice(0, 300).replace(/\n/g, '\\n');
          console.log(`Output: ${snippet}`);
      } catch (err) {
          console.error(`Failed: ${err.message}`);
      }
  }
  
  process.exit(0);
};

run();
