import { generateScreenplayPdf } from './screenplayPdf.js';
generateScreenplayPdf("test", { title: 'Test' }).then(buffer => console.log('Done')).catch(console.error);
