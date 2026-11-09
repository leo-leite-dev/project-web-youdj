import { afterEach, describe, expect, it, vi } from 'vitest'
import { createYouTubeIframePlayer } from './youtubeIframePlayer'

describe('createYouTubeIframePlayer', () => {
  const previousApi = window.YT

  afterEach(() => {
    window.YT = previousApi
  })

  it('uses the official visible player with explicit autoplay and maps playback events', async () => {
    let options: ConstructorParameters<NonNullable<typeof window.YT>['Player']>[1] | undefined
    const player = {
      playVideo: vi.fn(), pauseVideo: vi.fn(), loadVideoById: vi.fn(),
      getCurrentTime: vi.fn(() => 12), getDuration: vi.fn(() => 180), getVolume: vi.fn(() => 70),
      setVolume: vi.fn(), seekTo: vi.fn(), destroy: vi.fn(),
    }
    window.YT = {
      Player: class {
        constructor(_element: HTMLElement, playerOptions: NonNullable<typeof window.YT>['Player'] extends new (...args: infer Args) => unknown ? Args[1] : never) {
          options = playerOptions
          return player
        }
      } as NonNullable<typeof window.YT>['Player'],
      PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    }
    const callbacks = { onStateChange: vi.fn(), onError: vi.fn(), onAutoplayBlocked: vi.fn() }

    const handle = await createYouTubeIframePlayer(document.createElement('div'), 'abcdefghijk', callbacks)

    expect(options?.videoId).toBe('abcdefghijk')
    expect(options?.playerVars).toEqual({ autoplay: 1, controls: 1, playsinline: 1, origin: window.location.origin })
    expect(handle).toBe(player)
    expect(handle.getCurrentTime()).toBe(12)
    expect(handle.getDuration()).toBe(180)
    expect(handle.getVolume()).toBe(70)
    handle.setVolume(45)
    handle.seekTo(30, true)
    expect(player.setVolume).toHaveBeenCalledWith(45)
    expect(player.seekTo).toHaveBeenCalledWith(30, true)
    options?.events.onStateChange({ data: 1 })
    options?.events.onStateChange({ data: 2 })
    options?.events.onStateChange({ data: 0 })
    options?.events.onError({ data: 150 })
    options?.events.onAutoplayBlocked()
    expect(callbacks.onStateChange.mock.calls).toEqual([['playing'], ['paused'], ['ended']])
    expect(callbacks.onError).toHaveBeenCalledWith(150)
    expect(callbacks.onAutoplayBlocked).toHaveBeenCalledOnce()
  })
})
