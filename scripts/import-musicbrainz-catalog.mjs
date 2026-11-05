import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SOURCE_ARTISTS = [
  { mbid: 'c3cceeed-3332-4cf0-8c4c-bbde425147b6', name: 'Scorpions', country: 'DE' },
  { mbid: '5dcdb5eb-cb72-4e6e-9e63-b7bace604965', name: 'Bon Jovi', country: 'US' },
  { mbid: '47685be0-926f-4be9-b1ae-e32da47a3b99', name: 'Legião Urbana', country: 'BR' },
  { mbid: '29b550f2-04a3-4733-b6f5-4e347fac7e11', name: 'Charlie Brown Jr.', country: 'BR' },
  { mbid: '25db5fde-2384-4baf-8e3d-d8299b4c99ef', name: 'Skank', country: 'BR' },
  { mbid: 'c1a669b9-30f4-4171-a2a9-a15d9461ca04', name: 'Titãs', country: 'BR' },
  { mbid: '19499124-36d4-4ccc-b28d-04dde3d2076f', name: 'Jorge Ben Jor', country: 'BR' },
]

export const IMPORT_LIMIT_PER_ARTIST = 20
export const MAX_CATALOG_RECORDINGS = 250
export const MAX_IMPORT_OFFSET = 200
export const MUSICBRAINZ_USER_AGENT =
  'YouDJ/0.1.0 (https://github.com/leo-leite-dev/project-web-youdj)'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const snapshotPath = resolve(projectRoot, 'supabase/seed/musicbrainz-recordings.json')
const seedSqlPath = resolve(projectRoot, 'supabase/seed.sql')

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isLocalSupabaseUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:'
      && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      && url.port === '54321'
  } catch {
    return false
  }
}

function getArtistCredit(components) {
  if (!Array.isArray(components)) return ''
  return components.map((component) => {
    if (typeof component === 'string') return component
    if (!isRecord(component)) return ''
    const artistName = typeof component.name === 'string'
      ? component.name
      : isRecord(component.artist) && typeof component.artist.name === 'string'
        ? component.artist.name
        : ''
    const joinPhrase = typeof component.joinphrase === 'string' ? component.joinphrase : ''
    return `${artistName}${joinPhrase}`
  }).join('').trim()
}

export function normalizeRecording(recording, artist) {
  if (!isRecord(recording) || typeof recording.id !== 'string' || !UUID_PATTERN.test(recording.id)
    || typeof recording.title !== 'string') return null

  const title = recording.title.trim()
  const artistCredit = getArtistCredit(recording['artist-credit'])
  const creditContainsArtist = Array.isArray(recording['artist-credit'])
    && recording['artist-credit'].some((component) => isRecord(component)
      && isRecord(component.artist)
      && typeof component.artist.id === 'string'
      && component.artist.id.toLowerCase() === artist.mbid.toLowerCase())

  if (!creditContainsArtist || title.length < 1 || title.length > 120
    || artistCredit.length < 1 || artistCredit.length > 120) return null

  return {
    mbid: recording.id.toLowerCase(),
    title,
    artist_credit: artistCredit,
    matched_artist_mbids: [artist.mbid.toLowerCase()],
  }
}

export function mergeCatalogSnapshot(snapshot, additions, pageUpdates) {
  const rowsByMbid = new Map()
  for (const row of snapshot.records ?? []) {
    if (!isRecord(row) || typeof row.mbid !== 'string' || !UUID_PATTERN.test(row.mbid)) {
      throw new Error('Snapshot MusicBrainz existente contém um MBID inválido.')
    }
    rowsByMbid.set(row.mbid.toLowerCase(), {
      ...row,
      matched_artist_mbids: Array.isArray(row.matched_artist_mbids) ? row.matched_artist_mbids : [],
    })
  }

  for (const addition of additions) {
    const previous = rowsByMbid.get(addition.mbid)
    const matchedArtistMbids = new Set([
      ...(previous?.matched_artist_mbids ?? []),
      ...addition.matched_artist_mbids,
    ].map((mbid) => mbid.toLowerCase()))
    rowsByMbid.set(addition.mbid, {
      mbid: addition.mbid,
      title: addition.title,
      artist_credit: addition.artist_credit,
      matched_artist_mbids: [...matchedArtistMbids].sort(),
    })
  }

  if (rowsByMbid.size > MAX_CATALOG_RECORDINGS) {
    throw new Error(`O catálogo atingiria mais de ${MAX_CATALOG_RECORDINGS} gravações; limite local mantido.`)
  }

  return {
    source: 'MusicBrainz Core',
    license: 'CC0-1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://musicbrainz.org/doc/MusicBrainz_API',
    userAgent: MUSICBRAINZ_USER_AGENT,
    artists: SOURCE_ARTISTS,
    pages: { ...(snapshot.pages ?? {}), ...pageUpdates },
    retrievedAt: new Date().toISOString(),
    records: [...rowsByMbid.values()].sort((left, right) =>
      left.artist_credit.localeCompare(right.artist_credit)
      || left.title.localeCompare(right.title)
      || left.mbid.localeCompare(right.mbid)),
  }
}

export function renderSeedSql(snapshot) {
  const calls = []
  for (const artist of SOURCE_ARTISTS) {
    const rows = snapshot.records
      .filter((record) => record.matched_artist_mbids.includes(artist.mbid))
      .map(({ mbid, title, artist_credit }) => ({ mbid, title, artist_credit }))
    for (let offset = 0; offset < rows.length; offset += IMPORT_LIMIT_PER_ARTIST) {
      const batch = rows.slice(offset, offset + IMPORT_LIMIT_PER_ARTIST)
      const json = JSON.stringify(batch).replaceAll("'", "''")
      calls.push(
        `select public.music_catalog_import_batch('${artist.mbid}'::uuid, '${json}'::jsonb, ${offset});`,
      )
    }
  }

  return [
    '-- Generated by scripts/import-musicbrainz-catalog.mjs. Do not edit by hand.',
    `-- Source: MusicBrainz Core (CC0-1.0); snapshot retrieved ${snapshot.retrievedAt}.`,
    '-- This seed is for local Supabase resets only; deployment migrations do not import catalog data.',
    ...calls,
    '',
  ].join('\n')
}

export function estimateStorage(snapshot) {
  const snapshotBytes = Buffer.byteLength(`${JSON.stringify(snapshot, null, 2)}\n`)
  const textBytes = snapshot.records.reduce(
    (total, row) => total + Buffer.byteLength(row.title) + Buffer.byteLength(row.artist_credit),
    0,
  )
  // Approximation: payload strings plus 320 bytes/row for tuple, generated tsvector and indexes.
  const estimatedPostgresBytes = textBytes + snapshot.records.length * 320
  return { snapshotBytes, textBytes, estimatedPostgresBytes }
}

function readSnapshot(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return { records: [], pages: {} }
    throw error
  }
}

function readDevVars() {
  const devVarsPath = resolve(projectRoot, '.dev.vars')
  if (!existsSync(devVarsPath)) return {}
  return Object.fromEntries(readFileSync(devVarsPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^["']|["']$/g, '')]
    }))
}

function parseOffsetArgument(args) {
  const value = args.find((argument) => argument.startsWith('--offset='))?.slice('--offset='.length)
  if (value === undefined) return null
  const offset = Number(value)
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_IMPORT_OFFSET
    || offset % IMPORT_LIMIT_PER_ARTIST !== 0) {
    throw new Error(`--offset deve ser múltiplo de ${IMPORT_LIMIT_PER_ARTIST}, entre 0 e ${MAX_IMPORT_OFFSET}.`)
  }
  return offset
}

async function fetchArtistPage(artist, offset) {
  const query = `arid:${artist.mbid}`
  const url = new URL('https://musicbrainz.org/ws/2/recording/')
  url.search = new URLSearchParams({
    query,
    fmt: 'json',
    limit: String(IMPORT_LIMIT_PER_ARTIST),
    offset: String(offset),
  }).toString()

  const response = await fetch(url, {
    headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`MusicBrainz respondeu HTTP ${response.status} para ${artist.name}.`)

  const payload = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.recordings) || typeof payload.count !== 'number') {
    throw new Error(`Resposta MusicBrainz inválida para ${artist.name}.`)
  }

  const records = payload.recordings
    .map((recording) => normalizeRecording(recording, artist))
    .filter((recording) => recording !== null)
  const nextOffset = offset + payload.recordings.length
  const hasMore = payload.count > nextOffset && nextOffset <= MAX_IMPORT_OFFSET
  return { records, nextOffset: hasMore ? nextOffset : null }
}

async function writeLocalCatalog(snapshot) {
  const devVars = readDevVars()
  const supabaseUrl = process.env.SUPABASE_URL ?? devVars.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? devVars.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('--apply-local requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do Supabase local.')
  }
  if (!isLocalSupabaseUrl(supabaseUrl)) {
    throw new Error('--apply-local só aceita http://localhost:54321 ou loopback; URL remota recusada.')
  }

  for (const artist of SOURCE_ARTISTS) {
    const rows = snapshot.records
      .filter((record) => record.matched_artist_mbids.includes(artist.mbid))
      .map(({ mbid, title, artist_credit }) => ({ mbid, title, artist_credit }))
    for (let offset = 0; offset < rows.length; offset += IMPORT_LIMIT_PER_ARTIST) {
      const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/music_catalog_import_batch`, {
        method: 'POST',
        headers: { apikey: serviceRoleKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          p_artist_mbid: artist.mbid,
          p_records: rows.slice(offset, offset + IMPORT_LIMIT_PER_ARTIST),
          p_offset: offset,
        }),
      })
      if (!response.ok) throw new Error(`Importação local recusada pelo RPC (HTTP ${response.status}).`)
      const result = await response.json()
      if (isRecord(result) && typeof result.error === 'string') {
        throw new Error(`Importação local recusada pelo RPC: ${result.error}.`)
      }
    }
  }
}

function writeAtomically(path, contents) {
  mkdirSync(dirname(path), { recursive: true })
  const temporaryPath = `${path}.tmp`
  writeFileSync(temporaryPath, contents, 'utf8')
  renameSync(temporaryPath, path)
}

async function main(args) {
  const existing = readSnapshot(snapshotPath)
  const applyLocal = args.includes('--apply-local')
  const shouldRefresh = !applyLocal || args.includes('--refresh')
  if (applyLocal && !shouldRefresh && !existsSync(snapshotPath)) {
    throw new Error('Snapshot MusicBrainz ausente; execute primeiro node scripts/import-musicbrainz-catalog.mjs.')
  }
  if (!shouldRefresh && args.some((argument) => argument.startsWith('--offset='))) {
    throw new Error('--offset requer atualização da fonte; use --refresh --offset=<valor>.')
  }

  const explicitOffset = shouldRefresh ? parseOffsetArgument(args) : null
  const additions = []
  const pageUpdates = {}
  let fetchedPages = 0

  if (shouldRefresh) {
    for (const artist of SOURCE_ARTISTS) {
      const currentPage = existing.pages?.[artist.mbid]
      const offset = explicitOffset ?? currentPage?.nextOffset ?? 0
      if (explicitOffset === null && currentPage?.complete === true) continue

      if (fetchedPages > 0) await new Promise((resolvePromise) => setTimeout(resolvePromise, 1100))
      const page = await fetchArtistPage(artist, offset)
      additions.push(...page.records)
      fetchedPages += 1
      pageUpdates[artist.mbid] = {
        nextOffset: page.nextOffset,
        complete: page.nextOffset === null,
        importedPageCount: (currentPage?.importedPageCount ?? 0) + 1,
      }
    }
  }

  const snapshot = shouldRefresh ? mergeCatalogSnapshot(existing, additions, pageUpdates) : existing
  if (shouldRefresh) {
    writeAtomically(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`)
    writeAtomically(seedSqlPath, renderSeedSql(snapshot))
  }

  if (applyLocal) await writeLocalCatalog(snapshot)

  const estimate = estimateStorage(snapshot)
  console.log(JSON.stringify({
    source: snapshot.source,
    license: snapshot.license,
    fetchedPages,
    realRecordingCount: snapshot.records.length,
    artistCount: new Set(snapshot.records.flatMap((record) => record.matched_artist_mbids)).size,
    snapshotBytes: estimate.snapshotBytes,
    estimatedPostgresBytes: estimate.estimatedPostgresBytes,
    localDatabaseApplied: args.includes('--apply-local'),
    output: shouldRefresh ? ['supabase/seed/musicbrainz-recordings.json', 'supabase/seed.sql'] : [],
  }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Importação MusicBrainz falhou.')
    process.exitCode = 1
  })
}
