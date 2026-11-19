import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { LANGUAGES } from '../src/i18n'
import { messages } from '../src/locales/messages'

const src = fileURLToPath(new URL('../src', import.meta.url))
const sources = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name)
  if (entry.isDirectory()) return entry.name === 'locales' ? [] : sources(path)
  return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : []
})

/** the source strings a tr(...) call can be given as written: a literal, or literals picked by ?:, ?? or || */
function literals(node: ts.Expression): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text ? [node.text] : []
  if (ts.isParenthesizedExpression(node)) return literals(node.expression)
  if (ts.isConditionalExpression(node)) return [...literals(node.whenTrue), ...literals(node.whenFalse)]
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)) return [...literals(node.left), ...literals(node.right)]
  return []
}

test('every string literal passed to tr() has all four locales', () => {
  const missing: string[] = []
  let calls = 0
  for (const file of sources(src)) {
    const sourceFile = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'tr' && node.arguments[0]) {
        calls++
        for (const text of literals(node.arguments[0])) {
          if (!LANGUAGES.every(({ id }) => messages[text]?.[id])) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
            missing.push(`${file.slice(src.length + 1)}:${line + 1} ${JSON.stringify(text)}`)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }
  assert.ok(calls > 1000, `the scan found tr() calls (${calls})`)
  assert.deepEqual(missing, [], 'add these to src/locales/messages.ts in zh-Hans, zh-Hant, en and ja')
})
