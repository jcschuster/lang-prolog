// Parses every .pl file of the library of the `swipl` on PATH that tools/check.pl reads
// without a syntax error. A file fails if Lezer gives it an error node or a different
// number of clauses than swipl read terms. Exits 1 unless exactly the files listed in
// packages/codemirror-lang-swipl/test/KNOWN.md fail. Needs `pnpm build`.
import {execFileSync} from "node:child_process"
import {readdirSync, readFileSync} from "node:fs"
import {join} from "node:path"
import {prologLanguage} from "../packages/codemirror-lang-swipl/dist/index.js"

const root = new URL("..", import.meta.url)
const home = /PLBASE="([^"]*)"/.exec(execFileSync("swipl", ["--dump-runtime-variables"], {encoding: "utf8"}))[1]
const files = readdirSync(join(home, "library"), {recursive: true})
  .filter(file => file.endsWith(".pl")).map(file => join("library", file)).sort()

let checked
try {
  checked = execFileSync("swipl", ["-f", "none", new URL("tools/check.pl", root).pathname, "--", ...files],
    {cwd: home, encoding: "utf8"})
} catch (error) {
  checked = error.stdout
}
const accepted = checked.split("\n").filter(line => line.startsWith("ok ")).map(line => line.slice(3).split(" "))

const failures = new Map()
for (const [file, terms] of accepted) {
  const text = readFileSync(join(home, file), "utf8")
  const tree = prologLanguage.parser.parse(text)
  tree.iterate({
    enter: node => {
      if (!node.type.isError || failures.has(file)) return
      const line = text.slice(0, node.from).split("\n").length
      failures.set(file, `error node at line ${line}: ${JSON.stringify(text.slice(node.from, node.from + 40))}`)
    },
  })
  // swipl stops reading at a clause `end_of_file.`
  let clauses = 0
  for (let node = tree.topNode.firstChild; node; node = node.nextSibling) {
    if (!["Directive", "Rule", "Fact"].includes(node.name)) continue
    if (/^end_of_file\s*\.$/.test(text.slice(node.from, node.to))) break
    clauses++
  }
  if (!failures.has(file) && clauses != Number(terms)) failures.set(file, `${clauses} clauses, swipl read ${terms} terms`)
}

const known = new Set(
  [...readFileSync(new URL("packages/codemirror-lang-swipl/test/KNOWN.md", root), "utf8")
    .matchAll(/^- `([^`]+)`/gm)].map(match => match[1]))

console.log(`${files.length} library files, ${accepted.length} read by tools/check.pl, ` +
  `${accepted.length - failures.size} of those parse without error nodes into as many clauses ` +
  `(${(100 * (accepted.length - failures.size) / accepted.length).toFixed(1)}%)`)
let failed = false
for (const [file, where] of failures) {
  console.log(`${known.has(file) ? "known" : "NEW"}  ${file} ${where}`)
  failed ||= !known.has(file)
}
for (const file of known) {
  if (!failures.has(file)) {
    console.log(`STALE ${file} is listed in KNOWN.md but parses`)
    failed = true
  }
}
process.exit(failed ? 1 : 0)
