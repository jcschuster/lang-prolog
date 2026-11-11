# PLAN — lang-prolog

CodeMirror 6 language package for SWI-Prolog with a hand-written, token-level Lezer grammar. Operator and built-in tables are generated from a pinned `swipl`. Written 2026-11-11. Status: nothing started.

## Rules for the agent

- Work through the phases in order. Tick a box only when its check passes.
- `[verify]` = from memory or unchecked. Confirm against the named source first; correct this file if it is wrong.
- `[ask]` = decision for Johannes. Stop and ask; do not pick silently.
- Environment: NixOS, fish, direnv. Use only tools from the flake devshell; no global installs; `pnpm`, not `npm`/`npx`.
- Do not publish to npm, push tags, or open upstream issues/PRs without asking.
- Generated files are committed. Every hand-written part is listed in the package README.
- README and NOTICE claim no conformance beyond what the tests show.

## Conventions shared by the five lang-* repos

- Layout as in lang-tptp: `spec/` (inputs + `SOURCE` with URL, version, sha256, date), `gen/` (Node ESM scripts), `fixtures/`, `packages/<npm name>/`.
- Exports: `prolog()` → `LanguageSupport`, `prologLanguage` → `LRLanguage`.
- CamelCase node names; shared names where the concept exists: `LineComment`, `BlockComment`, `String`, `Number`, `Variable`.
- Root scripts: `pnpm generate`, `pnpm build`, `pnpm test`. `pnpm generate` is idempotent (`git diff --exit-code` afterwards, checked in CI).

## Facts

Checked 2026-11-11:

- I found no official machine-readable grammar for SWI-Prolog.
- Prolog syntax depends on the operator table, which programs change at run time with `op/3`. A fixed context-free grammar therefore cannot build correct operator trees for every program.
- `codemirror-lang-prolog` is taken on npm (0.1.0, third party, MIT, Lezer-based).

Consequence: the grammar tokenises precisely and recognises clause and bracket structure, but leaves operators flat. Operators declared inside the edited file still tokenise; they only lose operator styling.

Unchecked (all `[verify]` against the SWI-Prolog manual, sections "syntax" and "extensions" under `https://www.swi-prolog.org/pldoc/man?section=…`, and against `swipl` itself):

- Number forms: `0'c` character codes and their escapes, `0x`/`0o`/`0b`, `Radix'Digits`, digit groups, rationals, special floats.
- SWI-Prolog 7 extensions: `"strings"`, back-quoted text, dicts `Tag{…}`, quasi-quotations `{|Syntax||Text|}`.
- Block comments `/* … */` do not nest.
- End of clause: `.` followed by whitespace, `%` or EOF.
- SWI-Prolog ships `library(prolog_colour)`; its token classes are a useful reference for node names.
- nixpkgs attribute `swi-prolog`; SWI-Prolog's licence (for NOTICE).

## Decisions needed

- [ ] `[ask]` npm package name, since `codemirror-lang-prolog` is taken (for example `codemirror-lang-swipl` or a scoped name).
- [ ] `[ask]` Target is SWI-Prolog 7+ syntax only; other Prologs and strict ISO mode are out of scope. Confirm.

## Phase 0 — Bootstrap

- [ ] Read the template copy under `packages/` (from lang-tptp) and the root files; note its build, test and generate commands.
- [ ] Rename everything: `git grep -il tptp` must end empty apart from deliberate credit lines.
- [ ] Remove TPTP-specific parts: mix-based `gen/`, nightly `tptp.yml`, `tools/differential`.
- [ ] `flake.nix` devshell: `nodejs`, `pnpm`, `swi-prolog`. Commit `flake.lock` (this pins the `swipl` version the tables come from).
- [ ] `pnpm install && pnpm build && pnpm test` pass on a stub grammar.

## Phase 1 — Tables (`gen/tables.mjs` → `spec/prolog/`)

- [ ] `ops.json`: all `current_op(Priority, Type, Name)` triples from a fresh `swipl` (no user init file), sorted.
- [ ] `builtins.json`: name/arity of predicates with `predicate_property(_, built_in)`, plus the ISO flag where present.
- [ ] `control.json`: control constructs and directive names (`dynamic`, `discontiguous`, `module`, `use_module`, `table`, …) — hand-curated list, checked for existence against `builtins.json` / `ops.json`.
- [ ] `spec/prolog/SOURCE`: `swipl --version` output and the nixpkgs revision.
- [ ] Self-check: script fails if `ops.json` lacks `:-`, `-->`, `is`, `,` or has fewer than a sane minimum of entries.

## Phase 2 — Grammar (`src/prolog.grammar`, `src/tokens.js`, hand-written)

- [ ] Tokens: `Atom`, `QuotedAtom` (escapes, `''`), `Variable`, `Anonymous`, `Number` (all forms verified above), `String`, `BackquoteString`, `SymbolAtom` (runs of symbol characters), solo characters (`!`, `;`, `,`, `|`), brackets, `LineComment`, `BlockComment`.
- [ ] `End` token: clause-terminating `.`, distinguished from `.` inside symbol atoms, numbers, `0'.` and dicts. External tokenizer if a plain token cannot express the lookahead.
- [ ] Functor application: atom directly followed by `(` gives `Compound` with `Functor` and `ArgList`; atom followed by space and `(` does not.
- [ ] Structure: `Program` of clauses; each clause is `Directive` (`:- …`), `Rule` (with `Neck` `:-` or `-->`) or `Fact`, ended by `End`. Bodies are flat item sequences with nested brackets.
- [ ] Lists `[H|T]`, curly terms `{…}`, dicts and quasi-quotations (the latter as one opaque token) parse without error nodes.
- [ ] Alphanumeric operators from `ops.json` (`is`, `mod`, `rem`, `xor`, `dynamic`, …) via a generated `@specialize` block; symbolic operators stay `SymbolAtom`.
- [ ] Head functor of `Rule` and `Fact` gets its own node (`HeadFunctor`) for definition styling and outline.
- [ ] Error recovery: a broken clause must not swallow the following clauses (test with a missing `)` before `End`).

## Phase 3 — CodeMirror package

- [ ] `styleTags`: variables, anonymous, atoms, quoted atoms, numbers, strings, comments, `Neck`, `End`, operator keywords, symbolic operators, control constructs, directive names, `HeadFunctor` (definition), `Functor` (call), built-ins (`standard`), brackets, separators.
- [ ] Built-in and control styling by functor name from `builtins.json` / `control.json` (name only; arity check optional).
- [ ] `languageData`: `commentTokens: {line: "%", block: {open: "/*", close: "*/"}}`, `closeBrackets`.
- [ ] Indentation: body goals indented under the head, continued after `,` / `;` / `->`; `End` dedents. Folding: multi-line clauses, block comments.
- [ ] Completion source: built-in predicates with arity from `builtins.json`.
- [ ] Package README: pinned SWI-Prolog version, the flat-operator limitation stated plainly, generated versus hand-written files.

## Phase 4 — Tests

- [ ] `test/*.txt` in Lezer `fileTests` format: every token class with edge cases (`0'c`, `0''`, `a.b`, `"a""b"`, `'\\n'`, `X = 'End'.`, `foo :- bar.%c`), clause kinds, DCG rules, dicts, user-defined operators.
- [ ] `tools/check.pl`: reads a file term by term with `read_term/2` and `syntax_errors(error)`; exit status reports success. It must not load or execute the file.
- [ ] Corpus: the `.pl` files of the pinned SWI-Prolog's own library (from the Nix store path; not committed).
- [ ] Script: every corpus file that `tools/check.pl` accepts parses in Lezer without error nodes. Report the pass rate; list and explain every exception in `test/KNOWN.md`.
- [ ] Highlight coverage test: every named node has a tag or is listed as intentionally untagged.

## Phase 5 — CI and release

- [ ] `.github/scripts/test-all.sh` runs generate (with diff check), build, tests, corpus check; CI runs it inside `nix develop`.
- [ ] Table refresh is a `flake.lock` bump followed by `pnpm generate`; a scheduled workflow may open that PR with the table diff.
- [ ] Carry over `version.sh`, `release.yml` and `CHANGELOG.md` from lang-tptp; adapt names.
- [ ] `NOTICE`: tables derived from SWI-Prolog, with its licence.

## Done when

- [ ] All boxes above ticked or explicitly waived by Johannes.
- [ ] `nix develop -c .github/scripts/test-all.sh` passes from a clean clone.

## After this plan (Johannes)

Configure npm trusted publishing, first release, add the package to the Loge cell bundle.
