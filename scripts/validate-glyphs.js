#!/usr/bin/env node
/*
 Validates glyph mesh and files.
 - Ensures every ID in glyphs/MESH.md has a corresponding file
 - Ensures filenames follow patterns and IDs are unique
 - Warns for files present but not referenced in MESH
*/
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const meshPath = path.join(repoRoot, 'glyphs', 'MSH-000.md');

function fail(msg){
  console.error(`✖ ${msg}`);
  process.exitCode = 1;
}
function info(msg){ console.log(`• ${msg}`); }
function ok(msg){ console.log(`✔ ${msg}`); }

function readMeshIds(){
  if (!fs.existsSync(meshPath)) {
    info(`Mesh index not found (${path.relative(repoRoot, meshPath)}). Assuming glyphs are private and excluded; skipping mesh validation.`);
    return [];
  }
  const text = fs.readFileSync(meshPath, 'utf8');
  // Match IDs like BLG-001, GVN-001, GOV-SEC-001, GOV-CORE-006
  const regex = /\b([A-Z]{3,}(?:-[A-Z]{3,})?-\d{3})\b/g;
  const ids = new Set();
  let m;
  while ((m = regex.exec(text))) ids.add(m[1]);
  return [...ids];
}

function fileForId(id){
  if (id.startsWith('BLG-')) return path.join('glyphs', `${id}.md`);
  if (id.startsWith('MSH-')) return path.join('glyphs', `${id}.md`);
  return path.join('glyphs', 'gov', `${id}.md`);
}

function scanGlyphFiles(){
  const files = [];
  const addIf = p => { if (fs.existsSync(p)) files.push(...fs.readdirSync(p).filter(f => f.endsWith('.md')).map(f => path.join(p, f))); };
  addIf(path.join(repoRoot, 'glyphs'));
  addIf(path.join(repoRoot, 'glyphs', 'gov'));
  return files;
}

function idFromFilename(rel){
  const base = path.basename(rel, '.md');
  return base;
}

(function main(){
  const meshIds = readMeshIds();
  if (!meshIds.length) info('No glyph IDs found in MESH.md (is it intentional?)');

  // Existence check for mesh IDs
  const missing = [];
  for (const id of meshIds){
    const rel = fileForId(id);
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) missing.push(rel);
  }
  if (missing.length){
    fail(`Missing files for MESH IDs:\n  - ${missing.join('\n  - ')}`);
  } else if (meshIds.length) {
    ok('All MESH IDs have corresponding files');
  }

  // Filename pattern checks and uniqueness
  const files = scanGlyphFiles().map(p => path.relative(repoRoot, p));
  const badPattern = [];
  const seen = new Set();
  const dup = new Set();
  for (const rel of files){
    if (rel === 'glyphs/MESH.md' || rel === 'glyphs/MSH-000.md') continue; // control/index files
    const id = idFromFilename(rel);
    const isBLG = rel.startsWith('glyphs/') && !rel.startsWith('glyphs/gov/');
    const isGOV = rel.startsWith('glyphs/gov/');
    const okBLG = isBLG ? /^BLG-\d{3}$/.test(id) : true;
    const okGOV = isGOV ? /^(?:GVN|GOV)(?:-[A-Z]{3,})?-\d{3}$/.test(id) : true;
    if (!okBLG || !okGOV) badPattern.push(rel);
    if (seen.has(id)) dup.add(id); else seen.add(id);
  }
  if (badPattern.length) fail(`Files with invalid naming pattern:\n  - ${badPattern.join('\n  - ')}`);
  if (dup.size) fail(`Duplicate IDs detected: ${[...dup].join(', ')}`);
  if (!process.exitCode) ok('Glyph filenames valid and IDs unique');

  // Fail for unreferenced files (must appear at least once in mesh index)
  const unref = files
    .filter(rel => rel !== 'glyphs/MESH.md' && rel !== 'glyphs/MSH-000.md')
    .map(rel => ({ rel, id: idFromFilename(rel) }))
    .filter(({id}) => !meshIds.includes(id))
    .map(({rel}) => rel);
  if (unref.length) fail(`Glyph files not listed in mesh index (${path.basename(meshPath)}):\n  - ${unref.join('\n  - ')}`);

  if (process.exitCode) process.exit(process.exitCode);
})();
