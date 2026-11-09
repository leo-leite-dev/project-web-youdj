export type YouTubePlayerState = 'playing' | 'paused' | 'ended'

export interface YouTubePlayerHandle {
  playVideo(): void
  pauseVideo(): void
  loadVideoById(videoId: string): void
  getCurrentTime(): number
  getDuration(): number
  getVolume(): number
  setVolume(volume: number): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
}

export interface YouTubePlayerCallbacks {
  onStateChange(state: YouTubePlayerState): void
  onError(code: number): void
  onAutoplayBlocked(): void
}

export type YouTubePlayerFactory = (
  element: HTMLElement,
  videoId: string,
  callbacks: YouTubePlayerCallbacks,
) => Promise<YouTubePlayerHandle>

type YouTubeApiPlayer = YouTubePlayerHandle

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      playerVars: { autoplay: 1; controls: 1; playsinline: 1; origin: string }
      events: {
        onStateChange(event: { data: number }): void
        onError(event: { data: number }): void
        onAutoplayBlocked(): void
      }
    },
  ) => YouTubeApiPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_SCRIPT_URL = 'https://www.youtube.com/iframe_api'
let apiPromise: Promise<YouTubeApi> | undefined

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('A API oficial do YouTube não ficou disponível.'))
      previousCallback?.()
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${API_SCRIPT_URL}"]`)
    if (script?.dataset.loadFailed === 'true') {
      script.remove()
      script = null
    }
    if (!script) {
      script = document.createElement('script')
      script.src = API_SCRIPT_URL
      script.async = true
      script.addEventListener('error', () => {
        script?.setAttribute('data-load-failed', 'true')
        reject(new Error('Não foi possível carregar o player oficial do YouTube.'))
      }, { once: true })
      document.head.append(script)
    } else {
      script.addEventListener('error', () => {
        script?.setAttribute('data-load-failed', 'true')
        reject(new Error('Não foi possível carregar o player oficial do YouTube.'))
      }, { once: true })
    }
  }).catch((error: unknown) => {
    apiPromise = undefined
    throw error
  })

  return apiPromise
}

export const createYouTubeIframePlayer: YouTubePlayerFactory = async (element, videoId, callbacks) => {
  const api = await loadYouTubeApi()

  return new Promise<YouTubePlayerHandle>((resolve) => {
    const player = new api.Player(element, {
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onStateChange: ({ data }) => {
          if (data === api.PlayerState.PLAYING) callbacks.onStateChange('playing')
          else if (data === api.PlayerState.PAUSED) callbacks.onStateChange('paused')
          else if (data === api.PlayerState.ENDED) callbacks.onStateChange('ended')
        },
        onError: ({ data }) => callbacks.onError(data),
        onAutoplayBlocked: callbacks.onAutoplayBlocked,
      },
    })
    resolve(player)
  })
}
