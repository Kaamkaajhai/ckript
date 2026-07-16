import "dotenv/config";
import mongoose from "mongoose";

import Agreement from "../models/Agreement.js";
import Invoice from "../models/Invoice.js";
import Script from "../models/Script.js";
import ScriptPurchaseRequest from "../models/ScriptPurchaseRequest.js";
import { normalizeTrustedRemoteAssetUrl } from "../utils/remoteAssetPolicy.js";

const mongoUri = String(process.env.MONGO_URI || "").trim();
if (!mongoUri) {
  throw new Error("MONGO_URI is required to audit stored remote assets.");
}

const checks = [
  {
    model: Script,
    modelName: "Script",
    fields: ["fileUrl", "submissionSummaryPdf.url"],
  },
  {
    model: ScriptPurchaseRequest,
    modelName: "ScriptPurchaseRequest",
    fields: ["acceptancePdf.url"],
  },
  {
    model: Agreement,
    modelName: "Agreement",
    fields: ["writer_pdf_url", "buyer_pdf_url"],
  },
  {
    model: Invoice,
    modelName: "Invoice",
    fields: ["pdfPath"],
  },
];

const getPath = (value, dottedPath) =>
  dottedPath.split(".").reduce((current, key) => current?.[key], value);

const describeHost = (value) => {
  try {
    return new URL(String(value)).hostname;
  } catch {
    return "invalid-url";
  }
};

await mongoose.connect(mongoUri);
let inspected = 0;
const findings = [];

try {
  for (const check of checks) {
    const projection = check.fields.join(" ");
    const cursor = check.model.find({}).select(projection).lean().cursor();
    for await (const document of cursor) {
      for (const field of check.fields) {
        const value = String(getPath(document, field) || "").trim();
        if (!value || (check.modelName === "Invoice" && !/^https?:\/\//i.test(value))) continue;
        inspected += 1;
        try {
          normalizeTrustedRemoteAssetUrl(value);
        } catch (error) {
          findings.push({
            model: check.modelName,
            id: String(document._id),
            field,
            host: describeHost(value),
            code: error.code || "UNTRUSTED_REMOTE_ASSET",
          });
        }
      }
    }
  }
} finally {
  await mongoose.disconnect();
}

console.log(JSON.stringify({ inspected, invalid: findings.length, findings }, null, 2));
if (findings.length > 0) process.exitCode = 2;
