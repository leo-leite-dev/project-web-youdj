import { describe, expect, it } from 'vitest'
import {
  MAX_CATALOG_RECORDINGS,
  SOURCE_ARTISTS,
  estimateStorage,
  isLocalSupabaseUrl,
  mergeCatalogSnapshot,
  normalizeRecording,
  renderSeedSql,
} from './import-musicbrainz-catalog.mjs'

const bonJovi = SOURCE_ARTISTS.find((artist) => artist.name === 'Bon Jovi')
const scorpions = SOURCE_ARTISTS.find((artist) => artist.name === 'Scorpions')
const recording = {
  id: '5a6b7c8d-1234-4abc-8def-0123456789ab',
  title: 'Example Title',
  'artist-credit': [{
    name: 'Bon Jovi',
    artist: { id: bonJovi.mbid, name: 'Bon Jovi' },
    joinphrase: '',
  }],
}

describe('MusicBrainz importer', () => {
  it('accepts only real-shaped recordings whose artist credit matches the allowlist MBID', () => {
    expect(normalizeRecording(recording, bonJovi)).toEqual({
      mbid: recording.id,
      title: 'Example Title',
      artist_credit: 'Bon Jovi',
      matched_artist_mbids: [bonJovi.mbid],
    })
    expect(normalizeRecording({ ...recording, 'artist-credit': [] }, bonJovi)).toBeNull()
    expect(normalizeRecording({ ...recording, id: 'not-an-mbid' }, bonJovi)).toBeNull()
  })

  it('deduplicates by recording MBID while merging allowlisted artist origins', () => {
    const duplicate = { ...normalizeRecording(recording, bonJovi), matched_artist_mbids: [scorpions.mbid] }
    const snapshot = mergeCatalogSnapshot({ records: [], pages: {} }, [
      normalizeRecording(recording, bonJovi),
      duplicate,
    ], {})

    expect(snapshot.records).toHaveLength(1)
    expect(snapshot.records[0]?.matched_artist_mbids).toEqual([bonJovi.mbid, scorpions.mbid].sort())
  })

  it('enforces the catalog cap and renders local-only seed RPC calls', () => {
    const oversized = Array.from({ length: MAX_CATALOG_RECORDINGS + 1 }, (_, index) => ({
      mbid: `${String(index).padStart(8, '0')}-1234-4abc-8def-0123456789ab`,
      title: `Title ${index}`,
      artist_credit: 'Bon Jovi',
      matched_artist_mbids: [bonJovi.mbid],
    }))
    expect(() => mergeCatalogSnapshot({ records: [], pages: {} }, oversized, {})).toThrow(/limite local/i)

    const snapshot = mergeCatalogSnapshot({ records: [], pages: {} }, [normalizeRecording(recording, bonJovi)], {})
    const seedSql = renderSeedSql(snapshot)
    expect(seedSql).toContain('music_catalog_import_batch')
    expect(seedSql).toContain(recording.id)
    expect(seedSql).toContain('local Supabase resets only')
    expect(estimateStorage(snapshot).estimatedPostgresBytes).toBeGreaterThan(0)
  })

  it('refuses to write to Supabase URLs outside the local loopback API', () => {
    expect(isLocalSupabaseUrl('http://127.0.0.1:54321')).toBe(true)
    expect(isLocalSupabaseUrl('http://localhost:54321')).toBe(true)
    expect(isLocalSupabaseUrl('https://prod-project.supabase.co')).toBe(false)
    expect(isLocalSupabaseUrl('http://192.168.1.10:54321')).toBe(false)
  })
})
