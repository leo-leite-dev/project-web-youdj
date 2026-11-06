import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const wranglerBin = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const staticAssets = path.join(root, '.tmp', 'dev-pages-assets')

if (!existsSync(viteBin) || !existsSync(wranglerBin)) {
  console.error('Dependências locais ausentes; instale as dependências do projeto antes de desenvolver.')
  process.exit(1)
}

mkdirSync(staticAssets, { recursive: true })

const wrangler = spawn(process.execPath, [
  wranglerBin,
  'pages',
  'dev',
  staticAssets,
  '--ip',
  '127.0.0.1',
  '--port',
  '8788',
], { cwd: root, stdio: 'inherit', env: process.env })

const vite = spawn(process.execPath, [
  viteBin,
  '--host',
  '127.0.0.1',
  '--port',
  '3000',
  '--strictPort',
], { cwd: root, stdio: 'inherit', env: process.env })

let shuttingDown = false

function stopServers(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  process.exitCode = exitCode
  if (!wrangler.killed) wrangler.kill('SIGTERM')
  if (!vite.killed) vite.kill('SIGTERM')
}

process.on('SIGINT', () => stopServers())
process.on('SIGTERM', () => stopServers())

for (const server of [wrangler, vite]) {
  server.once('error', (error) => {
    console.error(`Não foi possível iniciar ${server === wrangler ? 'Wrangler' : 'Vite'}: ${error.message}`)
    stopServers(1)
  })
  server.once('exit', (code) => {
    if (!shuttingDown) stopServers(code ?? 1)
  })
}
