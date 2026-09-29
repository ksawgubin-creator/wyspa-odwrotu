// Runs the pure tests in Node:  node tests/run-node.mjs [filter]
import { runAll } from './framework.js';
await import('./pure.test.js');
const filter = process.argv[2] || '';
const res = await runAll(filter, (r) => console.log(`${r.ok ? '  ok ' : ' FAIL'}  ${r.name}${r.ok ? '' : '\n        ' + r.error}`));
const bad = res.filter((r) => !r.ok);
console.log(`\n${res.length - bad.length}/${res.length} testów przeszło${bad.length ? ', BŁĘDY: ' + bad.length : ''}`);
process.exit(bad.length ? 1 : 0);
