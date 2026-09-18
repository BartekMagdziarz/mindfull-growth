import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')
const seed = asModule(await readFile(new URL('../../src/design-system/icons/seedIcons.ts', root), 'utf8'))
const source = (await readFile(new URL('../../src/design-system/icons/organicIcons.ts', root), 'utf8')).replace("'./seedIcons'", JSON.stringify(seed))
const { organicIcons, organicSvg, organicSprite } = await import(asModule(source))
const destination = new URL('public/icon-library/', root)
await mkdir(destination, { recursive: true })
for (const icon of organicIcons) await writeFile(new URL(`mg-${icon.id}.svg`, destination), organicSvg(icon) + '\n')
await writeFile(new URL('mindful-organic.svg', destination), organicSprite() + '\n')
await writeFile(new URL('catalog.json', destination), JSON.stringify(organicIcons.map(({ markup, ...meta }) => meta), null, 2) + '\n')
console.log(`Exported ${organicIcons.length} icons and sprite to ${fileURLToPath(destination)}`)
