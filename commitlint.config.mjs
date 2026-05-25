/**
 * Conventional Commits enforcement (commitlint), run by `.husky/commit-msg` on
 * every local commit. Standard types (feat/fix/docs/chore/refactor/test/perf/
 * build/ci/style/revert); **scope is optional** — `feat: …` and `feat(retrieve): …`
 * both pass.
 *
 * Squash-merge caveat: this governs LOCAL commit messages. The commit that lands
 * on `main` takes its subject from the PR title, which this hook never sees — the
 * PR title is linted separately by `.github/workflows/pr-title.yml`.
 */
export default {
  extends: ["@commitlint/config-conventional"],
};
