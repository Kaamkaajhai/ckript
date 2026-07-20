import { generateScreenplayPdf } from './screenplayPdf.js';
import fs from 'fs';

const text = "DAVID (V.O.)\nThey say love is patient. Mine wore eye...";
generateScreenplayPdf(text, { title: 'Test' }).then(buffer => {
  fs.writeFileSync('test.pdf', buffer);
  console.log('PDF generated.');
}).catch(console.error);
