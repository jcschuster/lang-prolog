#!/usr/bin/env bash
# Runs every check in the repository, keeps going past a failure, and ends with one
# `PASS name` or `FAIL name` line per check. Exits non-zero if any failed. Expects the
# devshell (`nix develop`):
#
#     .github/scripts/test-all.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

results=()
failed=0

check() {
  local name=$1
  shift
  echo "== $name"
  if "$@"; then
    results+=("PASS $name")
  else
    results+=("FAIL $name")
    failed=1
  fi
}

package=packages/codemirror-lang-swipl

check "LICENSE and NOTICE copies match" bash -c \
  "cmp LICENSE $package/LICENSE && cmp NOTICE $package/NOTICE"
# Compared with the working tree, not with HEAD, so that this also runs before a commit.
generated="spec/prolog/ops.json spec/prolog/builtins.json spec/prolog/SOURCE $package/src/tables.ts"
check "generated files are current" bash -c \
  "before=\$(cat $generated | sha256sum) && node gen/tables.mjs && [ \"\$(cat $generated | sha256sum)\" = \"\$before\" ]"
check "README names the pinned swipl" bash -c \
  "grep -qF \"\$(sed -nE 's/^swipl: SWI-Prolog version //p' spec/prolog/SOURCE)\" $package/README.md"
check "fixtures are read by swipl" bash -c 'swipl -f none tools/check.pl -- fixtures/*.pl'
check "pnpm install" pnpm install --frozen-lockfile
check "pnpm build" pnpm -r run build
check "pnpm test" pnpm -r test
check "corpus" node tools/corpus.mjs

echo
printf '%s\n' "${results[@]}"
exit "$failed"
