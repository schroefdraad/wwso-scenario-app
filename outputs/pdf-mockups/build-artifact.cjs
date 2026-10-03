const fs = require('fs');
const path = require('path');

const dir = __dirname + '/png/';
function b64(f) {
  return 'data:image/png;base64,' + fs.readFileSync(dir + f).toString('base64');
}

const lichtP1 = b64('licht-p1-1.png');
const lichtP2 = b64('licht-p2-2.png');
const bandP1 = b64('band-p1-1.png');
const bandP2 = b64('band-p2-2.png');

const template = fs.readFileSync(__dirname + '/artifact-template.html', 'utf-8');
const out = template
  .replace('__LICHT_P1__', lichtP1)
  .replace('__LICHT_P2__', lichtP2)
  .replace('__BAND_P1__', bandP1)
  .replace('__BAND_P2__', bandP2);

fs.writeFileSync(__dirname + '/pdf-mockup-vergelijking.html', out, 'utf-8');
console.log('written', out.length, 'chars');
