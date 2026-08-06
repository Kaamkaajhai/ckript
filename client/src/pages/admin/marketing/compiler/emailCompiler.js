// Ckript Enterprise Email Compiler
// Converts drag-and-drop JSON blocks into a robust, table-based, responsive HTML email.
// Inspired by premium templates (Apple, Stripe, Notion).

const brandRed = "#8B1E1E";
const offBlack = "#111111";
const lightGray = "#f4f4f5";
const darkGray = "#27272a";

/**
 * Wraps content in a standard full-width table layout for email clients.
 */
const wrapInEmailShell = (contentHTML, preheaderText = "Ckript - A minimal platform for storytellers.") => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Ckript</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    table, td, div, h1, p {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #fafafa;
      color: ${offBlack};
    }
    table {
      border-collapse: collapse;
      border-spacing: 0;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      display: block;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #fafafa;
      padding-bottom: 60px;
    }
    .main-container {
      margin: 0 auto;
      width: 100%;
      max-width: 640px;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.04);
    }
    /* Dark Mode Overrides */
    @media (prefers-color-scheme: dark) {
      body, .wrapper {
        background-color: #000000 !important;
        color: #ffffff !important;
      }
      .main-container {
        background-color: ${offBlack} !important;
        box-shadow: 0 4px 24px rgba(0,0,0,0.2) !important;
      }
      h1, h2, h3, p, span, td, div {
        color: #ffffff !important;
      }
      .muted-text {
        color: #a1a1aa !important;
      }
      .border-divider {
        border-color: ${darkGray} !important;
      }
    }
    @media screen and (max-width: 640px) {
      .main-container {
        border-radius: 0 !important;
        width: 100% !important;
      }
      .px-mobile {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
    }
  </style>
</head>
<body>
  <!-- Preheader text for inbox preview -->
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheaderText} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <div class="wrapper">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td align="center" style="padding: 40px 10px;">
          <!--[if mso]>
          <table role="presentation" align="center" style="width:640px;">
          <tr>
          <td>
          <![endif]-->
          <table role="presentation" class="main-container" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background-color:#ffffff; border-radius:12px;">
            ${contentHTML}
          </table>
          <!--[if mso]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

// BLOCK COMPILERS
// Each function takes block data and returns table-based HTML.

const compileTopBar = (block) => `
<tr>
  <td class="px-mobile" align="center" style="padding: 32px 40px; text-align: center;">
    <a href="https://ckript.com" style="text-decoration:none; display:inline-block;">
      ${block.logoUrl 
        ? `<img src="${block.logoUrl}" alt="Ckript" width="120" style="width:120px; max-width:100%; height:auto;" />`
        : `<span style="font-size:24px; font-weight:700; color:${offBlack}; letter-spacing:-0.5px;">Ckript</span>`
      }
    </a>
  </td>
</tr>
`;

const compileHeroImage = (block) => {
  if (!block.imageUrl) return "";
  return `
<tr>
  <td align="center" style="padding: 0;">
    <img src="${block.imageUrl}" alt="Hero Image" width="640" style="width:100%; max-width:640px; height:auto; display:block; border:0;" />
  </td>
</tr>
`;
};

const compileHeading = (block) => {
  const align = block.align || "center";
  return `
<tr>
  <td class="px-mobile" align="${align}" style="padding: 24px 40px 8px 40px; text-align: ${align};">
    <h1 style="margin:0; font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 1.2; color: ${offBlack};">${block.text}</h1>
    ${block.subtitle ? `<p class="muted-text" style="margin: 12px 0 0 0; font-size: 18px; line-height: 1.5; color: #52525b;">${block.subtitle}</p>` : ''}
  </td>
</tr>
`;
};

const compileText = (block) => {
  const align = block.align || "left";
  return `
<tr>
  <td class="px-mobile" align="${align}" style="padding: 12px 40px; text-align: ${align}; font-size: 16px; line-height: 1.6; color: #3f3f46;">
    ${block.content}
  </td>
</tr>
`;
};

const compileCTA = (block) => {
  const align = block.align || "center";
  return `
<tr>
  <td class="px-mobile" align="${align}" style="padding: 32px 40px; text-align: ${align};">
    <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${block.url}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="${brandRed}">
        <w:anchorlock/>
        <center>
      <![endif]-->
          <a href="${block.url}" style="background-color: ${brandRed}; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; line-height: 48px; text-align: center; text-decoration: none; width: 200px; -webkit-text-size-adjust: none;">
            ${block.text}
          </a>
      <!--[if mso]>
        </center>
      </v:roundrect>
    <![endif]-->
  </td>
</tr>
`;
};

const compileDivider = (block) => `
<tr>
  <td class="px-mobile" align="center" style="padding: 32px 40px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr>
        <td class="border-divider" style="border-top: 1px solid ${lightGray}; font-size: 1px; line-height: 1px;">&nbsp;</td>
      </tr>
    </table>
  </td>
</tr>
`;

const compileFooter = (block) => `
<tr>
  <td class="px-mobile" align="center" style="padding: 48px 40px; background-color: #f8fafc; border-top: 1px solid ${lightGray};">
    <p class="muted-text" style="margin:0; font-size: 13px; line-height: 1.6; color: #71717a;">
      <strong>Ckript Private Limited</strong><br>
      A minimal platform for storytellers.
    </p>
    <p class="muted-text" style="margin:16px 0 0 0; font-size: 13px; line-height: 1.6; color: #71717a;">
      <a href="https://ckript.com" style="color: ${brandRed}; text-decoration: none;">Website</a> &nbsp;&middot;&nbsp; 
      <a href="https://ckript.com/privacy-policy" style="color: ${brandRed}; text-decoration: none;">Privacy</a> &nbsp;&middot;&nbsp; 
      <a href="https://ckript.com/terms-of-service" style="color: ${brandRed}; text-decoration: none;">Terms</a>
    </p>
    <p class="muted-text" style="margin:16px 0 0 0; font-size: 12px; line-height: 1.6; color: #a1a1aa;">
      &copy; ${new Date().getFullYear()} Ckript. All rights reserved.<br>
      You are receiving this email because you opted in via our website.
    </p>
  </td>
</tr>
`;

const compileFeatureCardRow = (block) => {
  // block.cards is an array of { title, description, iconUrl }
  if (!block.cards || block.cards.length === 0) return "";
  const cellWidth = Math.floor(100 / block.cards.length);
  const tds = block.cards.map(card => `
    <td class="stack-column" valign="top" width="${cellWidth}%" style="padding: 0 10px; text-align: left;">
      ${card.iconUrl ? `<img src="${card.iconUrl}" alt="" width="32" style="width:32px; height:auto; margin-bottom: 16px;" />` : ''}
      <h3 style="margin:0 0 8px 0; font-size: 16px; font-weight: 600; color: ${offBlack};">${card.title || 'Feature'}</h3>
      <p class="muted-text" style="margin:0; font-size: 14px; line-height: 1.5; color: #52525b;">${card.description || ''}</p>
    </td>
  `).join("");

  return `
<tr>
  <td class="px-mobile" style="padding: 24px 30px;">
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr>
        ${tds}
      </tr>
    </table>
  </td>
</tr>
`;
};

/**
 * Main export function to compile blocks to full HTML.
 */
export const compileEmailBlocksToHtml = (blocks, preheaderText = "") => {
  let contentHTML = "";

  blocks.forEach(block => {
    switch (block.type) {
      case "TopBar":
        contentHTML += compileTopBar(block);
        break;
      case "HeroImage":
        contentHTML += compileHeroImage(block);
        break;
      case "Heading":
        contentHTML += compileHeading(block);
        break;
      case "Text":
        contentHTML += compileText(block);
        break;
      case "CTA":
        contentHTML += compileCTA(block);
        break;
      case "Divider":
        contentHTML += compileDivider(block);
        break;
      case "FeatureCards":
        contentHTML += compileFeatureCardRow(block);
        break;
      case "Footer":
        contentHTML += compileFooter(block);
        break;
      default:
        console.warn("Unknown block type:", block.type);
    }
  });

  // Inject a signature flag into the HTML so the backend knows this is a builder template
  contentHTML += '\n<!-- EMAIL_BUILDER_V2 -->\n';

  return wrapInEmailShell(contentHTML, preheaderText);
};
