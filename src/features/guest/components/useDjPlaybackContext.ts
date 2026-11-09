import { useContext } from 'react'
import { DjPlaybackContext } from './DjPlaybackContext'

export function useDjPlaybackContext() {
  return useContext(DjPlaybackContext)
}
