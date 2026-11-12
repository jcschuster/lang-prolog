import {prolog, prologLanguage} from "../dist/index.js"
import {highlightTree, tagHighlighter, getStyleTags, tags as t} from "@lezer/highlight"
import {EditorState} from "@codemirror/state"
import {getIndentation, foldable} from "@codemirror/language"
import {CompletionContext} from "@codemirror/autocomplete"
import assert from "assert"
import * as fs from "fs"
import * as path from "path"
import {fileURLToPath} from "url"

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "fixtures")

describe("fixtures", () => {
  for (const file of fs.readdirSync(fixtures).sort()) {
    it(`${file} parses without error nodes`, () => {
      const text = fs.readFileSync(path.join(fixtures, file), "utf8")
      const errors = []
      prologLanguage.parser.parse(text).iterate({
        enter: node => { if (node.type.isError) errors.push(JSON.stringify(text.slice(node.from, node.from + 30))) },
      })
      assert.deepStrictEqual(errors, [])
    })
  }
})

describe("highlighting", () => {
  // One class per tag the highlight table uses, so modified tags stay distinct.
  const highlighter = tagHighlighter([
    {tag: t.variableName, class: "variable"},
    {tag: t.special(t.variableName), class: "anonymous"},
    {tag: t.atom, class: "atom"},
    {tag: t.number, class: "number"},
    {tag: t.string, class: "string"},
    {tag: t.special(t.string), class: "text"},
    {tag: t.lineComment, class: "comment"},
    {tag: t.blockComment, class: "block-comment"},
    {tag: t.definitionOperator, class: "neck"},
    {tag: t.punctuation, class: "end"},
    {tag: t.operatorKeyword, class: "operator-word"},
    {tag: t.operator, class: "operator"},
    {tag: t.controlKeyword, class: "control"},
    {tag: t.definitionKeyword, class: "directive"},
    {tag: t.standard(t.variableName), class: "builtin"},
    {tag: t.definition(t.function(t.variableName)), class: "definition"},
    {tag: t.function(t.variableName), class: "call"},
    {tag: t.standard(t.function(t.variableName)), class: "builtin-call"},
    {tag: t.paren, class: "paren"},
    {tag: t.squareBracket, class: "square"},
    {tag: t.brace, class: "brace"},
    {tag: t.separator, class: "separator"},
  ])

  // Map each highlighted piece of text to its class.
  function classes(text) {
    const result = {}
    highlightTree(prologLanguage.parser.parse(text), highlighter, (from, to, cls) => {
      result[text.slice(from, to)] = cls
    })
    return result
  }

  it("separates definitions, calls, built-ins, control and operators", () => {
    assert.deepStrictEqual(
      classes("p(X, _) :- q(X), format(\"~w\", [X]), nl, !, X is 1 + 2, ( a -> b ; c )."),
      {p: "definition", "(": "paren", X: "variable", ",": "separator", _: "anonymous", ")": "paren",
       ":-": "neck", q: "call", format: "builtin-call", '"~w"': "string", "[": "square", "]": "square",
       nl: "builtin", "!": "control", is: "operator-word", 1: "number", "+": "operator", 2: "number",
       a: "atom", "->": "control", b: "atom", ";": "control", c: "atom", ".": "end"},
    )
  })

  it("highlights directives, comments, quoted text and dicts", () => {
    assert.deepStrictEqual(
      classes("% c\n:- dynamic f/1. /* b */\nx('q', `bq`, _{k: 1})."),
      {"% c": "comment", ":-": "neck", dynamic: "directive", f: "atom", "/": "operator", 1: "number",
       ".": "end", "/* b */": "block-comment", x: "definition", "(": "paren", "'q'": "atom", ",": "separator",
       "`bq`": "text", _: "anonymous", "{": "brace", k: "atom", ":": "separator", "}": "brace", ")": "paren"},
    )
  })

  // Nodes that only group other nodes.
  const untagged = ["Program", "Directive", "Rule", "Fact", "HeadFunctor", "Compound", "Functor", "ArgList",
    "Parenthesized", "List", "Curly", "Dict"]

  it("tags every named node or lists it as untagged", () => {
    const missing = prologLanguage.parser.nodeSet.types
      .filter(type => type.name && !type.isError && !untagged.includes(type.name))
      .filter(type => !getStyleTags({type, matchContext: () => true}))
      .map(type => type.name)
    assert.deepStrictEqual(missing, [])
  })
})

describe("editing", () => {
  const state = doc => EditorState.create({doc, extensions: [prolog()]})
  const indentAt = (doc, line) => { const s = state(doc); return getIndentation(s, s.doc.line(line).from) }

  it("indents the body under the head and dedents after the end", () => {
    assert.strictEqual(indentAt("foo :-\nbar", 2), 2)
    assert.strictEqual(indentAt("foo :-\n  bar,\nbaz", 3), 2)
    assert.strictEqual(indentAt("foo :-\n  bar.\nbaz", 3), 0)
  })

  it("lines up if-then-else with its parenthesis", () => {
    const doc = "foo :-\n  (   a\n  ->  b\n  ;   c\n  )."
    assert.deepStrictEqual([3, 4, 5].map(line => indentAt(doc, line)), [2, 2, 2])
    assert.strictEqual(indentAt("foo :-\n  (   a,\nb", 3), 4)
  })

  it("folds multi-line clauses and block comments", () => {
    const s = state("foo :-\n  bar,\n  baz.\n/* a\nb */")
    const line = n => [s.doc.line(n).from, s.doc.line(n).to]
    assert.deepStrictEqual(foldable(s, ...line(1)), {from: 6, to: 19})
    assert.deepStrictEqual(foldable(s, ...line(4)), {from: 23, to: 28})
  })

  it("completes built-in predicates with their arity", () => {
    const s = state("x :- atom_len")
    const [source] = s.languageDataAt("autocomplete", s.doc.length)
    const result = source(new CompletionContext(s, s.doc.length, true))
    assert.ok(result.options.some(o => o.label == "atom_length" && o.detail == "/2"))
  })
})
