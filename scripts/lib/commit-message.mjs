const headerPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9][a-z0-9._/-]*\))?!?: \S(?:.*\S)?$/;

export function validateCommitMessage(message) {
  const subject = message.split(/\r?\n/, 1)[0];
  if (!headerPattern.test(subject)) {
    return 'Use a Conventional Commit subject, for example: feat(web): add savings confirmation';
  }
  if ([...subject].length > 100) return 'Commit subjects must be at most 100 characters.';
  return null;
}
