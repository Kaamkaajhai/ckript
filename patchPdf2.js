const fs = require('fs');
let code = fs.readFileSync('server/utils/screenplayPdf.js', 'utf8');

// 1. Add Courier Prime imports and FONT paths
code = code.replace(
  'import { textToBlocks, parseInlineEmphasis } from "./classify.js";',
  'import { textToBlocks, parseInlineEmphasis } from "./classify.js";\nimport path from "path";\nimport { fileURLToPath } from "url";\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);'
);

code = code.replace(
  'const FONT = "Courier";\r\nconst FONT_BOLD = "Courier-Bold";\r\nconst FONT_ITALIC = "Courier-Oblique";\r\nconst FONT_BOLD_ITALIC = "Courier-BoldOblique";',
  'const FONT_REGULAR_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Regular.ttf");\nconst FONT_BOLD_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Bold.ttf");\nconst FONT_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Italic.ttf");\nconst FONT_BOLD_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-BoldItalic.ttf");\n\nconst FONT = "CourierPrime";\nconst FONT_BOLD = "CourierPrime-Bold";\nconst FONT_ITALIC = "CourierPrime-Italic";\nconst FONT_BOLD_ITALIC = "CourierPrime-BoldItalic";'
);
code = code.replace(
  'const FONT = "Courier";\nconst FONT_BOLD = "Courier-Bold";\nconst FONT_ITALIC = "Courier-Oblique";\nconst FONT_BOLD_ITALIC = "Courier-BoldOblique";',
  'const FONT_REGULAR_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Regular.ttf");\nconst FONT_BOLD_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Bold.ttf");\nconst FONT_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Italic.ttf");\nconst FONT_BOLD_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-BoldItalic.ttf");\n\nconst FONT = "CourierPrime";\nconst FONT_BOLD = "CourierPrime-Bold";\nconst FONT_ITALIC = "CourierPrime-Italic";\nconst FONT_BOLD_ITALIC = "CourierPrime-BoldItalic";'
);

// 2. Add Courier Prime registration
code = code.replace(
  '      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },\r\n    });',
  '      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },\n    });\n\n    try {\n      doc.registerFont(FONT, FONT_REGULAR_PATH);\n      doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);\n      doc.registerFont(FONT_ITALIC, FONT_ITALIC_PATH);\n      doc.registerFont(FONT_BOLD_ITALIC, FONT_BOLD_ITALIC_PATH);\n    } catch (err) {\n      console.warn("[screenplayPdf] Failed to register CourierPrime fonts. They may be missing.");\n    }'
);
code = code.replace(
  '      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },\n    });',
  '      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },\n    });\n\n    try {\n      doc.registerFont(FONT, FONT_REGULAR_PATH);\n      doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);\n      doc.registerFont(FONT_ITALIC, FONT_ITALIC_PATH);\n      doc.registerFont(FONT_BOLD_ITALIC, FONT_BOLD_ITALIC_PATH);\n    } catch (err) {\n      console.warn("[screenplayPdf] Failed to register CourierPrime fonts. They may be missing.");\n    }'
);

// 3. Add tpContact parsing
code = code.replace(
  'const tpDraft = (tp?.draftDate || "").trim();',
  'const tpDraft = (tp?.draftDate || "").trim();\n    const tpContact = (tp?.contact || tp?.Contact || "").trim();'
);
code = code.replace(
  'if (tpTitle || tpAuthor || tpSource || tpDraft) {',
  'if (tpTitle || tpAuthor || tpSource || tpDraft || tpContact) {'
);

// 4. Fix draft date and contact rendering
const oldDraftCode = '      // Draft date sits low on the page (industry bottom-left/centre); keep it centred for simplicity.\r\n      if (tpDraft) {\r\n        doc.font(FONT).fontSize(FONT_SIZE);\r\n        doc.text(tpDraft, cx, PAGE.height * 0.82, { width: ACTION_WIDTH, align: "center" });\r\n      }';
const newDraftCode = '      // Draft date sits low on the page (industry bottom-left)\n      let bottomY = PAGE.height * 0.78;\n      if (tpDraft) {\n        doc.font(FONT).fontSize(FONT_SIZE);\n        doc.text(tpDraft, cx, bottomY, { width: ACTION_WIDTH, align: "left" });\n        bottomY += doc.heightOfString(tpDraft, { width: ACTION_WIDTH }) + LINE;\n      }\n      if (tpContact) {\n        doc.font(FONT).fontSize(FONT_SIZE);\n        doc.text(tpContact, cx, bottomY, { width: ACTION_WIDTH, align: "left" });\n      }';
code = code.replace(oldDraftCode, newDraftCode);
const oldDraftCodeLf = '      // Draft date sits low on the page (industry bottom-left/centre); keep it centred for simplicity.\n      if (tpDraft) {\n        doc.font(FONT).fontSize(FONT_SIZE);\n        doc.text(tpDraft, cx, PAGE.height * 0.82, { width: ACTION_WIDTH, align: "center" });\n      }';
code = code.replace(oldDraftCodeLf, newDraftCode);

fs.writeFileSync('server/utils/screenplayPdf.js', code);
console.log("Patched correctly");
