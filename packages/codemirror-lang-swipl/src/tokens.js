import {ExternalTokenizer} from "@lezer/lr"
import {
  BlockComment, End, Neck, Colon, Control, SymbolAtom, Atom, Operator, DirectiveName, Builtin,
  Variable, Anonymous, QuasiQuotation, CallOpen, DictOpen,
} from "./prolog.grammar.terms"
import {operators, control, directives, builtins} from "./tables"

const controlNames = new Set(control)
const directiveNames = new Set(directives)
const operatorNames = new Set(operators)
const builtinNames = new Set(builtins.map(([name]) => name))
const necks = new Set([":-", "-->", "?-"])

// The character classes of SWI-Prolog's reader (manual section "Unicode Prolog source"):
// identifiers are ID_Start ID_Continue*, variables start with an uppercase letter or `_`,
// non-ASCII symbols and punctuation glue like the ASCII symbol characters.
const symbolChar = /^(?:[#$&*+\-./:<=>?@^~\\]|(?![\0-\x7f])[\p{S}\p{P}])$/u
const nameStart = /^[\p{ID_Start}_]$/u
const nameChar = /^\p{ID_Continue}$/u
const variableStart = /^[\p{Lu}\p{Lt}_]$/u
const layout = /^\s$/u

const chr = (input, offset) => {
  const code = input.peek(offset)
  if (code < 0) return ""
  if (code >= 0xd800 && code < 0xdc00) {
    const low = input.peek(offset + 1)
    if (low >= 0xdc00 && low < 0xe000) return String.fromCharCode(code, low)
  }
  return String.fromCharCode(code)
}

// The character before `(` or `{`: `f(` is a compound and `t{` a dict, `f (` and `t {`
// are not.
const before = input => String.fromCharCode(input.peek(-1))
const endsTag = c => c == "'" || nameChar.test(c)

function scan(input, text, test) {
  let c
  while ((c = chr(input, text.length)) && test.test(c)) text += c
  return text
}

function nameKind(text) {
  if (controlNames.has(text)) return Control
  if (directiveNames.has(text)) return DirectiveName
  if (operatorNames.has(text)) return Operator
  if (builtinNames.has(text)) return Builtin
  return Atom
}

function symbolKind(text) {
  if (necks.has(text)) return Neck
  if (text == ":") return Colon
  if (controlNames.has(text)) return Control
  return SymbolAtom
}

// SWI-Prolog nests block comments.
function blockComment(input) {
  let depth = 0
  for (let i = 0; ; i++) {
    const c = input.peek(i)
    if (c < 0) return input.acceptToken(BlockComment, i)
    if (c == 47 /* / */ && input.peek(i + 1) == 42 /* * */) { depth++; i++ }
    else if (c == 42 && input.peek(i + 1) == 47) {
      i++
      if (--depth == 0) return input.acceptToken(BlockComment, i + 1)
    }
  }
}

function quasiQuotation(input) {
  for (let i = 2; ; i++) {
    const c = input.peek(i)
    if (c < 0) return input.acceptToken(QuasiQuotation, i)
    if (c == 124 /* | */ && input.peek(i + 1) == 125 /* } */) return input.acceptToken(QuasiQuotation, i + 2)
  }
}

export const prologTokens = new ExternalTokenizer((input, stack) => {
  const next = input.next
  if (next == 47 && input.peek(1) == 42) return blockComment(input)
  if (next == 40 /* ( */) {
    const c = before(input)
    if ((endsTag(c) || symbolChar.test(c)) && stack.canShift(CallOpen)) input.acceptToken(CallOpen, 1)
    return
  }
  if (next == 123 /* { */) {
    if (input.peek(1) == 124) return quasiQuotation(input)
    if (endsTag(before(input)) && stack.canShift(DictOpen)) input.acceptToken(DictOpen, 1)
    return
  }
  const first = chr(input, 0)
  if (symbolChar.test(first)) {
    const text = scan(input, "", symbolChar)
    if (text == ".") {
      const after = chr(input, 1)
      if (!after || after == "%" || layout.test(after)) return input.acceptToken(End, 1)
    }
    return input.acceptToken(symbolKind(text), text.length)
  }
  if (nameStart.test(first)) {
    const text = scan(input, first, nameChar)
    if (text == "_") return input.acceptToken(Anonymous, 1)
    return input.acceptToken(variableStart.test(first) ? Variable : nameKind(text), text.length)
  }
}, {contextual: true})
