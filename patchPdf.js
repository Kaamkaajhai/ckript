const fs = require('fs');
let content = fs.readFileSync('server/utils/screenplayPdf.js', 'utf8');

// Add tpContact
content = content.replace(
  'const tpDraft = (tp?.draftDate || "").trim();',
  'const tpDraft = (tp?.draftDate || "").trim();\n    const tpContact = (tp?.contact || tp?.Contact || "").trim();'
);

// Check if any title page field exists
content = content.replace(
  'if (tpTitle || tpAuthor || tpSource || tpDraft) {',
  'if (tpTitle || tpAuthor || tpSource || tpDraft || tpContact) {'
);

// Update Draft/Contact drawing
const oldDraftCode =       // Draft date sits low on the page (industry bottom-left/centre); keep it centred for simplicity.
      if (tpDraft) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpDraft, cx, PAGE.height * 0.82, { width: ACTION_WIDTH, align: "center" });
      };

const newDraftCode =       // Industry standard: Draft date and Contact info sit bottom-left.
      let bottomY = PAGE.height * 0.78;
      if (tpDraft) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpDraft, cx, bottomY, { width: ACTION_WIDTH, align: "left" });
        bottomY += doc.heightOfString(tpDraft, { width: ACTION_WIDTH }) + LINE;
      }
      if (tpContact) {
        doc.font(FONT).fontSize(FONT_SIZE);
        doc.text(tpContact, cx, bottomY, { width: ACTION_WIDTH, align: "left" });
      };

content = content.replace(oldDraftCode, newDraftCode);

fs.writeFileSync('server/utils/screenplayPdf.js', content);
