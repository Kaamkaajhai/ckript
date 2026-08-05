import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function parse() {
  const dataBuffer = fs.readFileSync('../public/ckript-privacy-policy.pdf');
  const data = await pdf(dataBuffer);

  const text = data.text;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  const sections = [];
  let currentSection = null;
  let inHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^Ckript Privacy Policy$/i) || line.match(/^Version/i) || line.match(/^Effective Date/i) || line.match(/^Last Updated/i)) {
      continue;
    }

    const sectionMatch = line.match(/^(\d+(?:\.\d+)?)\.\s+(.*)/);
    
    if (sectionMatch && !line.includes("Introduction, Definitions & Scope") && !line.includes("PART 1")) {
      inHeader = false;
      currentSection = {
        id: sectionMatch[1],
        title: line,
        content: []
      };
      sections.push(currentSection);
    } else if (!inHeader && currentSection) {
      if (line.startsWith('●') || line.startsWith('-')) {
        currentSection.content.push({ type: 'bullet', text: line.replace(/^[●\-]\s*/, '') });
      } else {
        currentSection.content.push({ type: 'text', text: line });
      }
    }
  }

  const formattedSections = sections.map(sec => {
    const formattedContent = [];
    let currentList = null;

    for (const item of sec.content) {
      if (item.type === 'bullet') {
        if (!currentList) {
          currentList = [];
          formattedContent.push({ type: 'list', items: currentList });
        }
        currentList.push(item.text);
      } else {
        currentList = null;
        formattedContent.push({ type: 'paragraph', text: item.text });
      }
    }

    return {
      id: `section-${sec.id.replace('.', '-')}`,
      title: sec.title,
      content: formattedContent
    };
  });

  fs.mkdirSync('../src/data', { recursive: true });
  fs.writeFileSync('../src/data/privacyPolicy.json', JSON.stringify(formattedSections, null, 2));
  console.log('Successfully parsed PDF to src/data/privacyPolicy.json');
}

parse().catch(console.error);
