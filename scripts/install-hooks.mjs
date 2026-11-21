import { spawnSync } from 'node:child_process';

// CI validates committed code directly and does not create local commits.
if (process.env.CI) process.exit(0);

const insideRepo = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
if (insideRepo.status !== 0 || insideRepo.stdout.trim() !== 'true') {
  console.log('Git hooks skipped: no Git working tree.');
  process.exit(0);
}

const configured = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
if (configured.error) throw configured.error;
if (configured.status !== 0) process.exit(configured.status ?? 1);
console.log('Enabled Mochi pre-commit and commit-msg hooks in .githooks.');
