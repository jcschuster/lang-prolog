# Known corpus exceptions

`tools/corpus.mjs` parses every `.pl` file under the library of the pinned `swipl` that
`tools/check.pl` reads without a syntax error. A file is an exception if the parser
gives it an error node, or a different number of clauses than `swipl` reads terms.
Each exception is listed below as `- `library/...`: explanation`; the script fails on
an exception that is not listed and on a listed file that no longer is one.

None at present.
