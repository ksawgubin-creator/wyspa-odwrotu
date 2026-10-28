// Kopiuje pliki gry do katalogu www/ (źródło dla Capacitora).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const files = ['index.html', 'style.css', 'data.js', 'engine.js', 'world.js', 'events.js', 'ui.js', 'manifest.webmanifest', 'sw.js'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
fs.mkdirSync(path.join(out, 'data'));
for (const f of fs.readdirSync(path.join(root, 'data'))) fs.copyFileSync(path.join(root, 'data', f), path.join(out, 'data', f));
for (const f of fs.readdirSync(path.join(root, 'icons'))) fs.copyFileSync(path.join(root, 'icons', f), path.join(out, 'icons', f));
console.log('www/ gotowe:', files.length, 'plików');
