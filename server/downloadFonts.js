import https from 'https';
import fs from 'fs';
import path from 'path';

const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });

const download = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest);
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, response => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      return download(response.headers.location, dest).then(resolve).catch(reject);
    }
    response.pipe(file);
    file.on('finish', () => { file.close(); resolve(); });
  }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
});

async function run() {
  await download('https://github.com/quoteunquoteapps/CourierPrime/raw/master/ttf/Courier%20Prime.ttf', path.join(fontsDir, 'CourierPrime-Regular.ttf'));
  await download('https://github.com/quoteunquoteapps/CourierPrime/raw/master/ttf/Courier%20Prime%20Bold.ttf', path.join(fontsDir, 'CourierPrime-Bold.ttf'));
  await download('https://github.com/quoteunquoteapps/CourierPrime/raw/master/ttf/Courier%20Prime%20Italic.ttf', path.join(fontsDir, 'CourierPrime-Italic.ttf'));
  await download('https://github.com/quoteunquoteapps/CourierPrime/raw/master/ttf/Courier%20Prime%20Bold%20Italic.ttf', path.join(fontsDir, 'CourierPrime-BoldItalic.ttf'));
  console.log('Fonts downloaded.');
}
run();
