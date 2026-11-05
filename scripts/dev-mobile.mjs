import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isIPv4 } from 'node:net'
import QRCode from 'qrcode'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  return Object.fromEntries(readFileSync(filePath, 'utf8').split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
    }))
}

function argument(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function isPrivateIPv4(address) {
  if (!isIPv4(address)) return false
  const [first, second] = address.split('.').map(Number)
  return first === 10 || first === 192 && second === 168 || first === 172 && second >= 16 && second <= 31
}

function listPrivateIPv4Addresses() {
  return [...new Set(Object.values(networkInterfaces()).flatMap((entries) =>
    (entries ?? []).filter((entry) => entry.family === 'IPv4' && !entry.internal && isPrivateIPv4(entry.address))
      .map((entry) => entry.address)))].sort((left, right) => {
    const priority = (address) => address.startsWith('192.168.') ? 0 : address.startsWith('10.') ? 1 : 2
    return priority(left) - priority(right)
  })
}

function stop(child) {
  if (child && !child.killed) child.kill('SIGTERM')
}

const devVarsPath = path.join(root, '.dev.vars')
const envPath = path.join(root, '.env.local')
const serverEnv = readEnvFile(devVarsPath)
const clientEnv = readEnvFile(envPath)
const missingSecrets = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  .filter((name) => !serverEnv[name] || serverEnv[name].startsWith('replace_with_') || serverEnv[name].includes('your-project-ref'))

if (missingSecrets.length) {
  console.error(`Configure os seguintes nomes em .dev.vars (arquivo ignorado pelo Git): ${missingSecrets.join(', ')}`)
  console.error('Copie .dev.vars.example para .dev.vars e preencha localmente. Não cole chaves no chat.')
  process.exit(1)
}

if (!clientEnv.VITE_SUPABASE_URL || !clientEnv.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local ignorado pelo Git.')
  process.exit(1)
}

const serverProject = new URL(serverEnv.SUPABASE_URL).host
const clientProject = new URL(clientEnv.VITE_SUPABASE_URL).host
if (serverProject !== clientProject) {
  console.error('SUPABASE_URL em .dev.vars e VITE_SUPABASE_URL em .env.local precisam apontar para o mesmo projeto.')
  process.exit(1)
}

const roomCode = (argument('--room-code') ?? serverEnv.YOUDJ_TEST_ROOM_CODE ?? '').trim().toUpperCase()
if (!/^[A-Z0-9]{10}$/.test(roomCode)) {
  console.error('Informe --room-code com uma sala ativa de teste pertencente à sua própria conta de DJ.')
  process.exit(1)
}

const ip = argument('--ip') ?? process.env.YOUDJ_LAN_IP
const candidates = listPrivateIPv4Addresses()
const lanIp = ip ?? candidates[0]
if (!lanIp || !isPrivateIPv4(lanIp)) {
  console.error(`Não encontrei IP privado da LAN. Informe --ip; candidatos: ${candidates.join(', ') || 'nenhum'}`)
  process.exit(1)
}

const url = `http://${lanIp}:5173/sala/${roomCode}`
const tmpDir = path.join(root, '.tmp')
mkdirSync(tmpDir, { recursive: true })
await QRCode.toFile(path.join(tmpDir, 'youdj-dev-room-qr.png'), url, { width: 360, margin: 2 })

console.log('\nQR Code de DESENVOLVIMENTO (não altera o QR de produção):')
console.log(await QRCode.toString(url, { type: 'terminal', small: true }))
console.log(`Celular: ${url}`)
console.log(`PNG local: ${path.join(tmpDir, 'youdj-dev-room-qr.png')}`)
console.log('A Function Wrangler fica somente em 127.0.0.1:8788; a Vite escuta apenas neste IP privado.')
console.log('Use uma sala de teste sua: os pedidos enviados serão persistidos nessa sala no Supabase configurado.\n')

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const build = spawnSync(npmCommand, ['run', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
if (build.status !== 0) process.exit(build.status ?? 1)

const wranglerBin = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
if (!existsSync(wranglerBin) || !existsSync(viteBin)) {
  console.error('Dependências locais ausentes; execute npm install antes de iniciar.')
  process.exit(1)
}

const wrangler = spawn(process.execPath, [wranglerBin, 'pages', 'dev', 'dist', '--ip', '127.0.0.1', '--port', '8788'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
let vite
const stopServers = () => {
  stop(vite)
  stop(wrangler)
}
process.on('SIGINT', stopServers)
process.on('SIGTERM', stopServers)

wrangler.once('error', (error) => {
  console.error(`Não foi possível iniciar Wrangler: ${error.message}`)
  stopServers()
  process.exitCode = 1
})
wrangler.once('exit', (code) => {
  if (code !== 0 && code !== null) process.exitCode = code
  stop(vite)
})

vite = spawn(process.execPath, [viteBin, '--host', lanIp, '--port', '5173', '--strictPort'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
})
vite.once('error', (error) => {
  console.error(`Não foi possível iniciar Vite: ${error.message}`)
  stopServers()
  process.exitCode = 1
})
vite.once('exit', (code) => {
  if (code !== 0 && code !== null) process.exitCode = code
  stop(wrangler)
})
