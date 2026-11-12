import type {NodePropSource} from "@lezer/common"
import {styleTags, tags as t} from "@lezer/highlight"

export const prologHighlighting: NodePropSource = styleTags({
  Variable: t.variableName,
  Anonymous: t.special(t.variableName),
  "Atom QuotedAtom": t.atom,
  Number: t.number,
  String: t.string,
  "BackquoteString QuasiQuotation": t.special(t.string),
  LineComment: t.lineComment,
  BlockComment: t.blockComment,
  Neck: t.definitionOperator,
  End: t.punctuation,
  Operator: t.operatorKeyword,
  SymbolAtom: t.operator,
  'Control "!" ";"': t.controlKeyword,
  DirectiveName: t.definitionKeyword,
  Builtin: t.standard(t.variableName),
  "HeadFunctor/Atom HeadFunctor/QuotedAtom HeadFunctor/Operator HeadFunctor/Control HeadFunctor/DirectiveName HeadFunctor/Builtin HeadFunctor/SymbolAtom":
    t.definition(t.function(t.variableName)),
  "Functor/Atom Functor/QuotedAtom Functor/SymbolAtom": t.function(t.variableName),
  "Functor/Builtin": t.standard(t.function(t.variableName)),
  '"(" ")" CallOpen': t.paren,
  '"[" "]"': t.squareBracket,
  '"{" "}" DictOpen': t.brace,
  '"," "|" Colon': t.separator,
})
