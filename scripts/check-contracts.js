#!/usr/bin/env node
const { execSync } = require('child_process');

function changedFiles() {
  try {
    const out = execSync('git diff --name-only HEAD~1', { stdio: ['ignore','pipe','ignore'] })
      .toString()
      .trim();
    if (!out) return [];
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const changed = changedFiles();
const touchedContracts = changed.some(f => /packages\/shared\/types\.(ts|js)$/.test(f));
if (!touchedContracts) { console.log('contracts unchanged'); process.exit(0); }

const hasTests = changed.some(f => /^apps\/api\/test\//.test(f));
const hasMigration = changed.some(f => /^(migrations\/|apps\/api\/migrations\/)/.test(f)) || changed.some(f => /(MIGRATION\.md|docs\/CONTRACTS\.md)$/.test(f));

if (!hasTests) { console.error('✖ Contracts changed but no tests updated'); process.exit(1); }
if (!hasMigration) { console.error('✖ Contracts changed but no migration or MIGRATION note found'); process.exit(1); }

console.log('✔ Contracts gate passed');
