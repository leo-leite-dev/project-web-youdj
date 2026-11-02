import { describe, expect, it } from 'vitest'
import { FakeDjProfileStore, makeDjProfile } from '../../../test/authTestDoubles'
import { ensureDjProfile } from './ensureDjProfile'

const userId = '11111111-1111-4111-8111-111111111111'

describe('ensureDjProfile', () => {
  it('reuses an existing profile without creating another one', async () => {
    const profile = makeDjProfile()
    const store = new FakeDjProfileStore({ profiles: [profile] })

    await expect(ensureDjProfile(store, userId, 'Outro nome')).resolves.toEqual(profile)
    expect(store.findCalls).toEqual([userId])
    expect(store.createCalls).toHaveLength(0)
  })

  it('creates an idempotent profile when it does not exist', async () => {
    const store = new FakeDjProfileStore()

    const profile = await ensureDjProfile(store, userId, 'DJ Normandy')

    expect(profile).toMatchObject({ displayName: 'DJ Normandy', id: userId })
    expect(store.findCalls).toEqual([userId, userId])
    expect(store.createCalls).toEqual([{ displayName: 'DJ Normandy', userId }])
  })
})
