import type { AuthUser } from '../authTypes'
import { getDisplayNameError, normalizeDisplayName } from './authValidation'

const FALLBACK_DISPLAY_NAME = 'DJ'

export function resolveProfileDisplayName(
  user: Pick<AuthUser, 'metadataDisplayName'>,
): string {
  const metadataDisplayName = normalizeDisplayName(user.metadataDisplayName ?? '')

  if (getDisplayNameError(metadataDisplayName) === null) {
    return metadataDisplayName
  }

  return FALLBACK_DISPLAY_NAME
}
