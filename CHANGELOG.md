# Changelog

All notable changes to `codemirror-lang-swipl` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semantic versioning](https://semver.org/spec/v2.0.0.html) over what the package
exposes: node names and the exported JavaScript API.

The SWI-Prolog version the operator and built-in tables come from is recorded in
`spec/prolog/SOURCE`; it moves with `flake.lock`, not with the package version.

## [Unreleased]

### Added

- `codemirror-lang-swipl`: a CodeMirror 6 language (Lezer parser) for SWI-Prolog 7+
  syntax, with highlighting, indentation, folding and completion of built-in
  predicates; operator and built-in tables from SWI-Prolog 10.0.2.
