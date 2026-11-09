import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchGuestVideos } from '../services/guestRequestApi'
import { DjYoutubeSearchCard } from './DjYoutubeSearchCard'

vi.mock('../services/guestRequestApi', () => ({ searchGuestVideos: vi.fn() }))

const search = vi.mocked(searchGuestVideos)
const results = [{
  videoId: 'abcdefghijk',
  title: 'Música encontrada no YouTube',
  channel: 'Canal oficial',
  thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
}]

describe('DjYoutubeSearchCard', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not show results or suggestions before an explicit search', () => {
    render(<DjYoutubeSearchCard roomCode="FESTA00001" queuedVideoIds={new Set()} onAddToQueue={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Buscar no YouTube' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /Resultados para/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/sugest/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled()
    expect(search).not.toHaveBeenCalled()
  })

  it('uses the server-backed YouTube search and renders validated metadata', async () => {
    search.mockResolvedValue({ available: true, videos: results })
    render(<DjYoutubeSearchCard roomCode="FESTA00001" queuedVideoIds={new Set()} onAddToQueue={vi.fn()} />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar músicas no YouTube' }), { target: { value: '  música   ao vivo  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    expect(search).toHaveBeenCalledWith('FESTA00001', 'música ao vivo')
    expect(await screen.findByRole('list', { name: 'Resultados para música ao vivo' })).toBeInTheDocument()
    expect(screen.getByText('Música encontrada no YouTube')).toBeInTheDocument()
    expect(screen.getByText('Artista / canal: Canal oficial')).toBeInTheDocument()
    expect(document.querySelector('.room-youtube-search__results img')).toHaveAttribute('src', results[0].thumbnail)
    expect(screen.getByRole('button', { name: 'Adicionar à fila' })).toHaveAttribute('title', 'Adicionar à fila')
  })

  it('clears old results as the DJ edits the query and reports a real empty search', async () => {
    search.mockResolvedValueOnce({ available: true, videos: results }).mockResolvedValueOnce({ available: true, videos: [] })
    render(<DjYoutubeSearchCard roomCode="FESTA00001" queuedVideoIds={new Set()} onAddToQueue={vi.fn()} />)
    const input = screen.getByRole('searchbox', { name: 'Buscar músicas no YouTube' })

    fireEvent.change(input, { target: { value: 'primeira busca' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText('Música encontrada no YouTube')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'segunda busca' } })
    expect(screen.queryByText('Música encontrada no YouTube')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /Resultados para/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText('Nenhum vídeo encontrado.')).toBeInTheDocument()
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2))
  })

  it('prevents repeated clicks, confirms a successful add, and disables a queued result', async () => {
    let finishAdd: (() => void) | undefined
    const onAddToQueue = vi.fn(() => new Promise<void>((resolve) => { finishAdd = resolve }))
    render(<DjYoutubeSearchCard roomCode="FESTA00001" queuedVideoIds={new Set()} onAddToQueue={onAddToQueue} />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar músicas no YouTube' }), { target: { value: 'música ao vivo' } })
    search.mockResolvedValue({ available: true, videos: results })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    const addButton = await screen.findByRole('button', { name: 'Adicionar à fila' })
    fireEvent.click(addButton)
    expect(addButton).toBeDisabled()
    fireEvent.click(addButton)
    expect(onAddToQueue).toHaveBeenCalledOnce()
    finishAdd?.()

    expect(await screen.findByText('Adicionada ao final da fila.')).toBeInTheDocument()
    expect(addButton).toBeDisabled()
  })

  it('shows the actual failure and permits a retry', async () => {
    const onAddToQueue = vi.fn().mockRejectedValueOnce(new Error('A inclusão direta ainda não está habilitada neste backend.')).mockResolvedValueOnce(undefined)
    search.mockResolvedValue({ available: true, videos: results })
    render(<DjYoutubeSearchCard roomCode="FESTA00001" queuedVideoIds={new Set()} onAddToQueue={onAddToQueue} />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar músicas no YouTube' }), { target: { value: 'música ao vivo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar à fila' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A inclusão direta ainda não está habilitada neste backend.')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar à fila' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Adicionada ao final da fila.')
    expect(onAddToQueue).toHaveBeenCalledTimes(2)
  })
})
