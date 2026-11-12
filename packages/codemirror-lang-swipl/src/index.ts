import {parser} from "./prolog.grammar"
import {prologHighlighting} from "./highlight"
import {builtins} from "./tables"
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  foldNodeProp,
  continuedIndent,
  delimitedIndent,
  TreeIndentContext,
} from "@codemirror/language"
import {completeFromList, ifNotIn} from "@codemirror/autocomplete"
import type {SyntaxNode} from "@lezer/common"

const clauses = "Directive Rule Fact"

// Folds a clause from the end of its first line's construct (the neck, or the head of a
// fact) to its end token.
function foldClause(node: SyntaxNode) {
  const end = node.lastChild, from = (node.getChild("Neck") ?? node.firstChild)!.to
  return end?.name == "End" && end.from > from ? {from, to: end.from} : null
}

// SWI-Prolog's layout of if-then-else: `->`, `*->`, `;`, `|` and `)` line up with the
// opening parenthesis, the goals one unit further in.
function parenthesized(cx: TreeIndentContext) {
  const column = cx.column(cx.node.from)
  return /^\s*(->|\*->|;|\||\))/.test(cx.textAfter) ? column : column + cx.unit
}

export const prologLanguage = LRLanguage.define({
  name: "prolog",
  parser: parser.configure({
    props: [
      prologHighlighting,
      indentNodeProp.add({
        [clauses]: continuedIndent(),
        Parenthesized: parenthesized,
        ArgList: delimitedIndent({closing: ")"}),
        List: delimitedIndent({closing: "]"}),
        "Curly Dict": delimitedIndent({closing: "}"}),
      }),
      foldNodeProp.add({
        [clauses]: foldClause,
        BlockComment: node => ({from: node.from + 2, to: node.to - 2}),
      }),
    ],
  }),
  languageData: {
    commentTokens: {line: "%", block: {open: "/*", close: "*/"}},
    closeBrackets: {brackets: ["(", "[", "{", "'", '"', "`"]},
  },
})

const builtinCompletion = ifNotIn(
  ["LineComment", "BlockComment", "QuotedAtom", "String", "BackquoteString", "QuasiQuotation"],
  completeFromList(builtins.map(([label, arity]) => ({label, detail: `/${arity}`, type: "function"}))),
)

/// SWI-Prolog language support for CodeMirror, with completion of built-in predicates.
export function prolog() {
  return new LanguageSupport(prologLanguage, prologLanguage.data.of({autocomplete: builtinCompletion}))
}
