import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { FakePublicRoomStore, makePublicRoom } from '../../test/roomTestDoubles'
import { GuestRoomPage } from './GuestRoomPage'

function renderRoom(path: string, store: FakePublicRoomStore) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sala/:roomCode" element={<GuestRoomPage store={store} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuestRoomPage', () => {
  it('shows an invalid link message for malformed room codes without querying', () => {
    const store = new FakePublicRoomStore()
    renderRoom('/sala/abc', store)

    expect(screen.getByRole('heading', { name: /link inválido/i })).toBeInTheDocument()
    expect(screen.getByText(/deve ter 10 letras ou números/i)).toBeInTheDocument()
    expect(store.findCalls).toHaveLength(0)
  })

  it('loads the room and shows its name and status', async () => {
    const store = new FakePublicRoomStore({
      rooms: [makePublicRoom({ code: 'A1B2C3D4E5', name: 'Festa da Ana' })],
    })
    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByText('Festa da Ana')).toBeInTheDocument()
    expect(store.findCalls).toEqual(['A1B2C3D4E5'])
    expect(screen.getByRole('heading', { name: 'Sala A1B2C3D4E5' })).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /peça uma música/i })).toBeInTheDocument()
    expect(screen.getByText(/somente o recebimento/i)).toBeInTheDocument()
  })

  it('sends a manual request only after explicit submission and confirms receipt', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const privateCode = 'a'.repeat(64)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ received: true, privateCode }), { status: 201 }))
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    expect(fetchSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText(/faça um pedido manual/i))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Canção de teste' } })
    fireEvent.change(screen.getByLabelText('Artista'), { target: { value: 'Artista teste' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido manual' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/pedido recebido/i)
    expect(screen.getByText(privateCode)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar exclusão por e-mail' })).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(privateCode)))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/guest-requests', expect.objectContaining({ method: 'POST' })))
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { acceptedLegal: boolean }
    expect(requestBody.acceptedLegal).toBe(true)
    fetchSpy.mockRestore()
  })

  it('requires acceptance of the terms and privacy policy before sending guest data', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })

    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
    fireEvent.change(screen.getByLabelText('Pesquisar no YouTube'), { target: { value: 'artista teste' } })
    expect(screen.getByRole('button', { name: 'Buscar agora' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Enviar pedido manual' })).toBeDisabled()
    expect(fetchSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: 'Buscar agora' })).toBeEnabled()
    fetchSpy.mockRestore()
  })

  it('searches only after submit, displays YouTube results, and submits the selected video', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const video = { videoId: 'abcdefghijk', title: 'Música exemplo', channel: 'Canal exemplo', thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true, videos: [video] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ received: true, privateCode: 'b'.repeat(64) }), { status: 201 }))
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Pesquisar no YouTube'), { target: { value: '  música   exemplo ' } })
    expect(fetchSpy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar agora' }))
    expect(await screen.findByText('Música exemplo')).toBeInTheDocument()
    expect(screen.getByText('Canal exemplo')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /música exemplo/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e enviar pedido' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/pedido recebido/i)
    expect(fetchSpy).toHaveBeenNthCalledWith(1, '/api/youtube-search', expect.any(Object))
    expect(fetchSpy).toHaveBeenNthCalledWith(2, '/api/guest-requests', expect.any(Object))
    const submittedBody = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body)) as { request: { video: { videoId: string } } }
    expect(submittedBody.request.video.videoId).toBe(video.videoId)
    fetchSpy.mockRestore()
  })

  it('debounces typing before querying the search API', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const video = { videoId: 'abcdefghijk', title: 'Resultado', channel: 'Canal', thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ available: true, videos: [video] }), { status: 200 }))
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    fireEvent.click(screen.getByRole('checkbox'))
    vi.useFakeTimers()
    try {
      fireEvent.change(screen.getByLabelText('Pesquisar no YouTube'), { target: { value: 'Estação Fandangueira' } })
      await act(async () => { vi.advanceTimersByTime(899) })
      expect(fetchSpy).not.toHaveBeenCalled()
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Resultado')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      fetchSpy.mockRestore()
    }
  })

  it('shows when the room does not exist', async () => {
    const store = new FakePublicRoomStore()
    renderRoom('/sala/ZZ99ZZ99ZZ', store)

    expect(await screen.findByRole('heading', { name: /sala não encontrada/i })).toBeInTheDocument()
    expect(screen.getByText(/não corresponde a nenhuma sala/i)).toBeInTheDocument()
  })

  it('shows the unavailable state for a paused room', async () => {
    const store = new FakePublicRoomStore({
      rooms: [makePublicRoom({ code: 'A1B2C3D4E5', name: 'Festa Pausada', status: 'paused' })],
    })
    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByText(/pausado no momento/i)).toBeInTheDocument()
    expect(screen.getByText('Pausada')).toBeInTheDocument()
  })

  it('retries after a load error and then shows the room', async () => {
    const store = new FakePublicRoomStore({ findError: new Error('falha de rede') })
    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByRole('heading', { name: /não foi possível carregar/i })).toBeInTheDocument()
    expect(screen.getByText(/não foi possível carregar a sala/i)).toBeInTheDocument()

    store.findError = undefined
    store.rooms = [makePublicRoom({ code: 'A1B2C3D4E5', name: 'Festa da Ana' })]

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    expect(await screen.findByText('Festa da Ana')).toBeInTheDocument()
  })
})
