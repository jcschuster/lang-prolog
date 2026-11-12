# lang-prolog

Editor language support for [SWI-Prolog](https://www.swi-prolog.org):
[`codemirror-lang-swipl`](packages/codemirror-lang-swipl), a CodeMirror 6 language with a
hand-written Lezer grammar. Its README says what it parses and what it does not.

## Working on it

The devshell (`nix develop`, or direnv) has every tool, `swipl` included. Then:

```sh
pnpm install
pnpm generate                  # tables from swipl: spec/prolog/, src/tables.ts
.github/scripts/test-all.sh    # every check CI runs
```

`pnpm corpus` parses SWI-Prolog's own library (see `tools/corpus.mjs`); `tools/check.pl`
is the reference reader it compares against.

The tables come from the `swi-prolog` that `flake.lock` pins. To move to a newer one:
`nix flake update`, then `pnpm generate` in the new devshell, and commit the table diff.

## Releasing

See `.github/workflows/release.yml`.
