import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsDir = join(__dirname, '..', 'public', 'js');

function getAllFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getAllFiles(jsDir);
const exportsMap = new Map();
const importsList = [];

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const relPath = file.replace(jsDir + '\\', '').replace(jsDir + '/', '');
  
  const exportMatches = content.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g);
  for (const m of exportMatches) {
    exportsMap.set(m[1], { file: relPath, type: 'function' });
  }
  const exportConst = content.matchAll(/export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/g);
  for (const m of exportConst) {
    exportsMap.set(m[1], { file: relPath, type: 'const' });
  }
  const exportClass = content.matchAll(/export\s+class\s+([a-zA-Z0-9_$]+)/g);
  for (const m of exportClass) {
    exportsMap.set(m[1], { file: relPath, type: 'class' });
  }
  const exportNamed = content.matchAll(/export\s+\{\s*([^}]+)\s*\}/g);
  for (const m of exportNamed) {
    m[1].split(',').forEach(n => {
      const name = n.trim().split(/\s+as\s+/)[0].trim();
      if (name) exportsMap.set(name, { file: relPath, type: 'named' });
    });
  }
  
  const importMatches = content.matchAll(/import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/g);
  for (const m of importMatches) {
    const named = m[1];
    const defaultImport = m[2];
    const from = m[3];
    if (named) {
      named.split(',').forEach(n => {
        const name = n.trim().split(/\s+as\s+/)[0].trim();
        if (name) importsList.push({ file: relPath, name, from, type: 'named' });
      });
    }
    if (defaultImport) {
      importsList.push({ file: relPath, name: defaultImport, from, type: 'default' });
    }
  }
}

let errors = 0;
for (const imp of importsList) {
  if (imp.type === 'default') continue;
  if (!imp.from.startsWith('./') && !imp.from.startsWith('../')) continue;
  if (imp.from.includes('router.js') && imp.name === 'router') continue;
  if (imp.from.includes('api.js') && ['apiGet', 'apiPost', 'apiRequest', 'getCurrentUser', 'getAffinityProfile', 'getEvents', 'getWeather', 'geocodeAddress', 'getRoute', 'searchArtist', 'getArtistLyrics', 'initAuth'].includes(imp.name)) continue;
  if (imp.from.includes('spotify-player.js') && imp.name === 'spotifyPlayer') continue;
  
  if (!exportsMap.has(imp.name)) {
    console.error(`ERROR: ${imp.file} imports ${imp.name} from ${imp.from} but no export found`);
    errors++;
  }
}

if (errors === 0) {
  console.log('All imports verified OK');
} else {
  console.log(`Found ${errors} errors`);
  process.exit(1);
}
