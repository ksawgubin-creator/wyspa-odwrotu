// Dostosowuje wygenerowany projekt Android: ikony, splash, orientacja pionowa, numer wersji.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), res = path.join(root, 'android/app/src/main/res'), src = path.join(root, 'android-res');
for (const d of fs.readdirSync(src)) {
  if (!d.startsWith('mipmap-')) continue;
  for (const f of fs.readdirSync(path.join(src, d))) fs.copyFileSync(path.join(src, d, f), path.join(res, d, f));
}
const bg = path.join(res, 'values/ic_launcher_background.xml');
if (fs.existsSync(bg)) fs.writeFileSync(bg, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B1220</color>\n</resources>\n');
for (const d of fs.readdirSync(res)) {
  const f = path.join(res, d, 'splash.png');
  if (d.startsWith('drawable') && fs.existsSync(f)) fs.copyFileSync(path.join(src, 'splash.png'), f);
}
const mf = path.join(root, 'android/app/src/main/AndroidManifest.xml');
let m = fs.readFileSync(mf, 'utf8');
if (!m.includes('screenOrientation')) m = m.replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"');
if (!m.includes('windowSoftInputMode')) m = m.replace(/<activity\b/, '<activity\n            android:windowSoftInputMode="adjustResize"');   // klawiatura zmniejsza widok zamiast go zasłaniać
fs.writeFileSync(mf, m);
const gf = path.join(root, 'android/app/build.gradle');
let g = fs.readFileSync(gf, 'utf8');
const run = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
g = g.replace(/versionCode \d+/, `versionCode ${run}`).replace(/versionName "[^"]*"/, `versionName "2.0.${run}"`);
fs.writeFileSync(gf, g);
console.log('Android: ikony, splash, orientacja i wersja 2.0.' + run);
