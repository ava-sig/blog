#!/usr/bin/env node
/*
 Guard that fails if internal/private doc paths are in the diff.
 Patterns derived from internal/GOV-SEC-001.md
*/
const { execSync } = require('child_process');

const patterns = [
  /^docs\//,
  /^glyphs\//,
  /\/GLYPHS\.md$/,
  /\/GOVERNANCE\.md$/,
  /\/CONTRACTS\.md$/
];

function getChangedFiles() {
  try {
    const base = process.env.GITHUB_BASE_REF ? 'origin/' + process.env.GITHUB_BASE_REF : 'HEAD~1';
    const out = execSync(`git diff --name-only ${base}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out.split('\n').filter(Boolean);
  } catch {
    // Fallback to unstaged + staged changes
    try {
      const out = execSync('git diff --name-only HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
      return out.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

const changed = getChangedFiles();
const offenders = changed.filter(f => patterns.some(rx => rx.test(f)));
if (offenders.length) {
  console.error('✖ Forbidden files in diff (see GOV-SEC-001 Hidden Glyph Layer):');
  offenders.forEach(f => console.error('  - ' + f));
  process.exit(1);
} else {
  console.log('✔ No forbidden internal doc paths in diff');
}
