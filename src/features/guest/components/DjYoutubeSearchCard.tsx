import { useRef, useState, type FormEvent } from 'react'
import { Plus, Search } from 'lucide-react'
import { searchGuestVideos, type YoutubeVideo } from '../services/guestRequestApi'

interface DjYoutubeSearchCardProps {
  roomCode: string
  queuedVideoIds: ReadonlySet<string>
  addingDisabled?: boolean
  onAddToQueue(video: YoutubeVideo): Promise<void>
}

export function DjYoutubeSearchCard({ roomCode, queuedVideoIds, addingDisabled = false, onAddToQueue }: DjYoutubeSearchCardProps) {
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [videos, setVideos] = useState<YoutubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingIds, setAddingIds] = useState<ReadonlySet<string>>(() => new Set())
  const [addFeedback, setAddFeedback] = useState<Readonly<Record<string, { kind: 'success' | 'error'; message: string }>>>({})
  const addingIdsRef = useRef(new Set<string>())
  const sequence = useRef(0)
  const canSearch = query.trim().length >= 3 && !loading

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedQuery = query.trim().replace(/\s+/g, ' ')
    if (normalizedQuery.length < 3 || loading) return

    const currentSequence = ++sequence.current
    setLoading(true)
    setError(null)
    setVideos([])
    setSearchedQuery(normalizedQuery)
    try {
      const result = await searchGuestVideos(roomCode, normalizedQuery)
      if (currentSequence !== sequence.current) return
      setVideos(result.videos)
      if (!result.available) setError('A busca do YouTube está temporariamente indisponível.')
    } catch (cause) {
      if (currentSequence !== sequence.current) return
      const message = cause instanceof Error ? cause.message : 'Não foi possível pesquisar no YouTube.'
      setError(message.replace(/\s*O pedido manual continua disponível\.?/i, ''))
    } finally {
      if (currentSequence === sequence.current) setLoading(false)
    }
  }

  function updateQuery(value: string) {
    sequence.current += 1
    setLoading(false)
    setQuery(value)
    setVideos([])
    setSearchedQuery('')
    setError(null)
    setAddFeedback({})
  }

  async function addToQueue(video: YoutubeVideo) {
    if (addingDisabled || queuedVideoIds.has(video.videoId) || addingIdsRef.current.has(video.videoId)) return
    addingIdsRef.current.add(video.videoId)
    setAddingIds(new Set(addingIdsRef.current))
    setAddFeedback((current) => ({ ...current, [video.videoId]: { kind: 'success', message: '' } }))
    try {
      await onAddToQueue(video)
      setAddFeedback((current) => ({ ...current, [video.videoId]: { kind: 'success', message: 'Adicionada ao final da fila.' } }))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Não foi possível adicionar esta música.'
      setAddFeedback((current) => ({ ...current, [video.videoId]: { kind: 'error', message } }))
    } finally {
      addingIdsRef.current.delete(video.videoId)
      setAddingIds(new Set(addingIdsRef.current))
    }
  }

  return <section className={`room-youtube-search${videos.length > 0 ? ' room-youtube-search--expanded' : ''}`} aria-labelledby="dj-youtube-search-heading">
    <header className="room-youtube-search__heading">
      <div>
        <h3 id="dj-youtube-search-heading"><Search aria-hidden="true" />Buscar no YouTube</h3>
        <p>Encontre faixas para a programação desta sala.</p>
      </div>
    </header>
    <form className="room-youtube-search__form" onSubmit={(event) => void search(event)}>
      <label className="sr-only" htmlFor="dj-youtube-search-query">Buscar músicas no YouTube</label>
      <input
        id="dj-youtube-search-query"
        type="search"
        value={query}
        onChange={(event) => updateQuery(event.currentTarget.value)}
        maxLength={100}
        minLength={3}
        placeholder="Título, artista ou música"
        autoComplete="off"
      />
      <button type="submit" disabled={!canSearch}>
        <Search aria-hidden="true" />{loading ? 'Buscando…' : 'Buscar'}
      </button>
    </form>
    {loading && <p className="room-youtube-search__status" role="status">Pesquisando no YouTube…</p>}
    {error && <p className="room-youtube-search__status room-youtube-search__status--error" role="alert">{error}</p>}
    {!loading && !error && searchedQuery && videos.length === 0 && <p className="room-youtube-search__status" role="status">Nenhum vídeo encontrado.</p>}
    {videos.length > 0 && <p className="room-youtube-search__status room-youtube-search__status--notice">As faixas adicionadas entram no fim da fila e não iniciam a reprodução automaticamente.</p>}
    {videos.length > 0 && <ol className="room-youtube-search__results" aria-label={`Resultados para ${searchedQuery}`}>
      {videos.map((video) => <li key={video.videoId}>
        <img src={video.thumbnail} alt="" loading="lazy" />
        <div>
          <p>{video.title}</p>
          <span>Artista / canal: {video.channel}</span>
        </div>
        <button type="button" className="room-youtube-search__add" title="Adicionar à fila" aria-label="Adicionar à fila" disabled={addingDisabled || queuedVideoIds.has(video.videoId) || addingIds.has(video.videoId) || addFeedback[video.videoId]?.kind === 'success'} onClick={() => void addToQueue(video)}>
          <Plus aria-hidden="true" />
        </button>
        {addFeedback[video.videoId]?.message && <span className={`room-youtube-search__add-feedback${addFeedback[video.videoId].kind === 'error' ? ' room-youtube-search__add-feedback--error' : ''}`} role={addFeedback[video.videoId].kind === 'error' ? 'alert' : 'status'}>{addFeedback[video.videoId].message}</span>}
      </li>)}
    </ol>}
  </section>
}
