import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateCommitMessage } from '../lib/commit-message.mjs';

test('accepts Conventional Commit types and optional scopes', () => {
  for (const type of ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']) {
    assert.equal(validateCommitMessage(`${type}: update Mochi`), null);
    assert.equal(validateCommitMessage(`${type}(web): update Mochi`), null);
  }
});

test('accepts breaking changes and a multiline body', () => {
  assert.equal(validateCommitMessage('feat(contracts)!: update state schema\n\nBREAKING CHANGE: new field'), null);
  assert.equal(validateCommitMessage('fix!: correct schema\r\n\r\nDetails'), null);
});

test('rejects empty, untyped, and unsupported subjects', () => {
  for (const subject of ['', 'update app', 'Feature: update app', 'feat: ', 'feat(web):', 'feat(): update app']) {
    assert.ok(validateCommitMessage(subject), subject);
  }
});

test('rejects leading and trailing whitespace in subjects', () => {
  assert.ok(validateCommitMessage(' feat: update app'));
  assert.ok(validateCommitMessage('feat: update app '));
});

test('enforces the 100-character subject limit', () => {
  assert.equal(validateCommitMessage('docs: ' + 'a'.repeat(94)), null);
  assert.ok(validateCommitMessage('docs: ' + 'a'.repeat(95)));
});

test('commit-msg hook accepts valid messages and rejects invalid ones', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mochi-commit-test-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const messageFile = join(directory, 'message');
  const hook = fileURLToPath(new URL('../../.githooks/commit-msg', import.meta.url));
  writeFileSync(messageFile, 'feat(web): add savings confirmation\n');
  const accepted = spawnSync('sh', [hook, messageFile], { encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stderr);
  writeFileSync(messageFile, 'updates\n');
  const rejected = spawnSync('sh', [hook, messageFile], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Commit rejected/);
});

test('pre-commit hook blocks the commit when the shared check fails', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'mochi-precommit-test-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'pnpm'), '#!/bin/sh\ntest "$1" = check || exit 99\nexit 42\n', { mode: 0o755 });
  const hook = fileURLToPath(new URL('../../.githooks/pre-commit', import.meta.url));
  const result = spawnSync('sh', [hook], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
  });
  assert.equal(result.status, 42, result.stderr);
});
