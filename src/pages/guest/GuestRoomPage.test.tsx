import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function expectArtworkImmediatelyBelowReturnButton() {
  const returnButton = screen.getByRole('button', { name: 'Voltar à sala' })
  const artwork = document.querySelector('img[src="/guest-room-artwork.png"]')

  expect(artwork).not.toBeNull()
  expect(returnButton.nextElementSibling).toBe(artwork)
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

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
    expect(screen.getByRole('heading', { name: 'Sala Festa da Ana' })).toBeInTheDocument()
    expect(screen.getByText(/Código:/)).toBeInTheDocument()
    expect(screen.getByText('A1B2C3D4E5')).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /peça uma música/i })).toBeInTheDocument()
    expect(screen.getByText(/somente o recebimento/i)).toBeInTheDocument()
    expectArtworkImmediatelyBelowReturnButton()
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
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à sala' }))
    expect(screen.getByRole('heading', { name: /peça uma música/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Pesquisar músicas por título ou artista')).toHaveValue('')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    fetchSpy.mockRestore()
  })

  it('requires acceptance of the terms and privacy policy before sending guest data', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })

    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade')
    fireEvent.change(screen.getByLabelText('Pesquisar músicas por título ou artista'), { target: { value: 'artista teste' } })
    expect(screen.getByRole('button', { name: 'Enviar pedido manual' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pesquisar músicas' })).toBeDisabled()
    expect(fetchSpy).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('checkbox'))
    fetchSpy.mockRestore()
  })

  it('preserves manual requests and sends an optional YouTube URL as a reference', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      received: true,
      privateCode: 'c'.repeat(64),
    }), { status: 201 }))
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })

    fireEvent.click(screen.getByText(/faça um pedido manual/i))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Livin’ on a Prayer' } })
    fireEvent.change(screen.getByLabelText('Artista'), { target: { value: 'Bon Jovi' } })
    fireEvent.change(screen.getByLabelText('Link do YouTube (opcional)'), { target: { value: 'https://youtu.be/abcdefghijk' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido manual' }))

    expect(await screen.findByText('c'.repeat(64))).toBeInTheDocument()
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { request: { kind: string; url: string } }
    expect(requestBody.request).toEqual({
      kind: 'youtube-link',
      title: 'Livin’ on a Prayer',
      artist: 'Bon Jovi',
      url: 'https://youtu.be/abcdefghijk',
    })
  })

  it('searches the catalog after 600 ms, paginates below the field, and submits the selected MBID', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const firstRecording = { recordingMbid: '5a6b7c8d-1234-4abc-8def-0123456789ab', title: 'Livin’ on a Prayer', artist: 'Bon Jovi' }
    const secondRecording = { recordingMbid: '6b7c8d9e-2345-4abc-8def-0123456789ab', title: 'You Give Love a Bad Name', artist: 'Bon Jovi' }
    const privateCode = 'b'.repeat(64)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [firstRecording], hasMore: true, nextOffset: 10 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [secondRecording], hasMore: false, nextOffset: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ received: true, privateCode }), { status: 201 }))
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    fireEvent.click(screen.getByRole('checkbox'))
    vi.useFakeTimers()
    try {
      fireEvent.change(screen.getByLabelText('Pesquisar músicas por título ou artista'), { target: { value: '  Bon   Jovi ' } })
      await act(async () => { await vi.advanceTimersByTimeAsync(599) })
      expect(fetchSpy).not.toHaveBeenCalled()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const firstSearch = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { roomCode: string; query: string; offset: number }
      expect(firstSearch).toEqual({ roomCode: 'A1B2C3D4E5', query: 'Bon Jovi', offset: 0 })
      vi.useRealTimers()

      expect(await screen.findByText(firstRecording.title)).toBeInTheDocument()
      expect(screen.getByText(firstRecording.artist)).toBeInTheDocument()
      const input = screen.getByLabelText('Pesquisar músicas por título ou artista')
      const resultList = screen.getByRole('list', { name: 'Resultados do catálogo musical' })
      expect(input.compareDocumentPosition(resultList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(document.querySelector('img[src*="i.ytimg.com"], iframe')).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Carregar mais músicas' }))
      expect(await screen.findByText(secondRecording.title)).toBeInTheDocument()
      const nextPage = JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body)) as { offset: number }
      expect(nextPage.offset).toBe(10)
      expect(screen.queryByRole('button', { name: 'Enviar pedido ao DJ' })).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Livin’ on a Prayer/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido ao DJ' }))
      expect(await screen.findByRole('status')).toHaveTextContent(/pedido recebido/i)
      expect(fetchSpy).toHaveBeenNthCalledWith(3, '/api/guest-requests', expect.any(Object))
      const submittedBody = JSON.parse(String(fetchSpy.mock.calls[2]?.[1]?.body)) as { request: { kind: string; recordingMbid: string } }
      expect(submittedBody.request).toMatchObject({ kind: 'catalog', recordingMbid: firstRecording.recordingMbid })
      expect(screen.getByText(privateCode)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      fetchSpy.mockRestore()
    }
  })

  it('shows the server search error while keeping the manual request fallback available', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 'rate_limited',
      error: 'Muitas pesquisas em sequência. Aguarde um pouco ou faça um pedido manual.',
    }), { status: 429 }))
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Pesquisar músicas por título ou artista'), { target: { value: 'música teste' } })

    expect(await screen.findByText(/muitas pesquisas em sequência/i)).toBeInTheDocument()
    expect(screen.getByText(/Não encontrou\? Faça um pedido manual/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar pedido ao DJ' })).not.toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
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
    expectArtworkImmediatelyBelowReturnButton()
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
