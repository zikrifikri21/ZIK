// Compiles rpc.js into one executable (bun --compile) named the way Tauri's `externalBin` wants:
// src-tauri/binaries/zik-wa-<target triple>[.exe]. Skips when up to date. Run by tauri's before*Command hooks.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, '..', 'src-tauri', 'binaries')
const host = /host: (\S+)/.exec(execFileSync('rustc', ['-vV'], { encoding: 'utf8' }))[1]
const mac = host.endsWith('apple-darwin')
// [target triple, bun target]; on macOS both archs, then a universal copy for `--target universal-apple-darwin`
const jobs = mac ? [['aarch64-apple-darwin', 'bun-darwin-arm64'], ['x86_64-apple-darwin', 'bun-darwin-x64']]
  : [[host, host.includes('windows') ? 'bun-windows-x64' : 'bun-linux-x64']]
const ext = host.includes('windows') ? '.exe' : ''
const file = (t) => path.join(out, `zik-wa-${t}${ext}`)
const srcTime = Math.max(...['rpc.js', 'package.json', 'build.mjs'].map((f) => fs.statSync(path.join(here, f)).mtimeMs))
const fresh = (f) => fs.existsSync(f) && fs.statSync(f).mtimeMs > srcTime
if (jobs.every(([t]) => fresh(file(t))) && (!mac || fresh(file('universal-apple-darwin')))) { console.log('zik-wa: up to date'); process.exit(0) }

if (!fs.existsSync(path.join(here, 'node_modules'))) execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: here, stdio: 'inherit', shell: true })
fs.mkdirSync(out, { recursive: true })
for (const [triple, target] of jobs) {
  execFileSync('bun', ['build', '--compile', `--target=${target}`, path.join(here, 'rpc.js'), '--outfile', file(triple)], { stdio: 'inherit', shell: true })
}
if (mac) execFileSync('lipo', ['-create', '-output', file('universal-apple-darwin'), ...jobs.map(([t]) => file(t))], { stdio: 'inherit' })
console.log('zik-wa: built')
