import fs from 'fs';
const buffer = fs.readFileSync('test_font.pdf');
console.log('PDF length:', buffer.length);
console.log('Includes CourierPrime?', buffer.includes('CourierPrime'));
