import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const targets = ['server.js', 'src', 'public/js'];
const files = [];

function collect(target) {
  const full = join(root, target);
  const stat = statSync(full);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(full)) collect(join(target, entry));
    return;
  }
  if (full.endsWith('.js') || full.endsWith('.mjs')) files.push(full);
}

for (const target of targets) collect(target);

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`\n✖ ${relative(root, file)}\n${result.stderr || result.stdout}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} archivo(s) con errores de sintaxis.`);
  process.exit(1);
}

console.log(`✔ Sintaxis verificada en ${files.length} archivos JavaScript.`);
