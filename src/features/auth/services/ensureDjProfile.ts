import type { DjProfile } from '../authTypes'
import type { DjProfileStore } from './djProfileStore'

export async function ensureDjProfile(
  store: DjProfileStore,
  userId: string,
  displayName: string,
): Promise<DjProfile> {
  const existingProfile = await store.findById(userId)

  if (existingProfile) {
    return existingProfile
  }

  return store.createIfMissing(userId, displayName)
}
