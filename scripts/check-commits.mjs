import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateCommitMessage } from './lib/commit-message.mjs';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Unable to read Git history');
  return result.stdout;
}

function check(message, label) {
  const error = validateCommitMessage(message);
  if (error) {
    console.error(`${label}: ${error}\nReceived: ${JSON.stringify(message.split(/\r?\n/, 1)[0])}`);
    process.exitCode = 1;
  }
}

const args = process.argv.slice(2);
if (args[0] === '--message-file' && args.length === 2) {
  check(readFileSync(args[1], 'utf8'), 'Commit rejected');
} else if (args[0] === '--range' && args.length === 2) {
  const hashes = git(['log', '--no-merges', '--format=%H', args[1], '--']).trim();
  if (hashes) {
    for (const hash of hashes.split('\n')) check(git(['show', '-s', '--format=%B', hash]), hash.slice(0, 7));
  }
} else if (args.length === 0) {
  // Merge subjects are Git-generated; PR checks cover their individual commits.
  const hash = git(['log', '-1', '--no-merges', '--format=%H', 'HEAD', '--']).trim();
  if (hash) check(git(['show', '-s', '--format=%B', hash]), hash.slice(0, 7));
} else {
  console.error('Usage: node scripts/check-commits.mjs [--message-file PATH | --range BASE..HEAD]');
  process.exitCode = 1;
}
