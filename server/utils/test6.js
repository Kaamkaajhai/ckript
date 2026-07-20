import { generateScreenplayPdf } from './screenplayPdf.js';
import fs from 'fs';
generateScreenplayPdf("test", { title: 'Test' }).then(buffer => {
  fs.writeFileSync('test_font.pdf', buffer);
}).catch(console.error);
