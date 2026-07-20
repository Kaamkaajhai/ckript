const fs = require('fs');
let content = fs.readFileSync('server/utils/screenplayPdf.js', 'utf8');

// Replace top imports
content = content.replace(
  'import { textToBlocks, parseInlineEmphasis } from "./classify.js";',
  'import { textToBlocks, parseInlineEmphasis } from "./classify.js";\nimport path from "path";\nimport { fileURLToPath } from "url";\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);'
);

// Replace FONT constants
content = content.replace(
  'const FONT = "Courier";\nconst FONT_BOLD = "Courier-Bold";\nconst FONT_ITALIC = "Courier-Oblique";\nconst FONT_BOLD_ITALIC = "Courier-BoldOblique";',
  'const FONT_REGULAR_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Regular.ttf");\nconst FONT_BOLD_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Bold.ttf");\nconst FONT_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-Italic.ttf");\nconst FONT_BOLD_ITALIC_PATH = path.join(__dirname, "../assets/fonts/CourierPrime-BoldItalic.ttf");\n\nconst FONT = "CourierPrime";\nconst FONT_BOLD = "CourierPrime-Bold";\nconst FONT_ITALIC = "CourierPrime-Italic";\nconst FONT_BOLD_ITALIC = "CourierPrime-BoldItalic";'
);

// Register fonts in generateScreenplayPdf
content = content.replace(
  '    const doc = new PDFDocument({\n      size: [PAGE.width, PAGE.height],\n      bufferPages: true,\n      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },\n    });',
  '    const doc = new PDFDocument({\n      size: [PAGE.width, PAGE.height],\n      bufferPages: true,\n      margins: { top: MARGIN.top, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },\n    });\n\n    try {\n      doc.registerFont(FONT, FONT_REGULAR_PATH);\n      doc.registerFont(FONT_BOLD, FONT_BOLD_PATH);\n      doc.registerFont(FONT_ITALIC, FONT_ITALIC_PATH);\n      doc.registerFont(FONT_BOLD_ITALIC, FONT_BOLD_ITALIC_PATH);\n    } catch (err) {\n      console.warn("[screenplayPdf] Failed to register CourierPrime fonts. They may be missing.");\n    }'
);

fs.writeFileSync('server/utils/screenplayPdf.js', content);
