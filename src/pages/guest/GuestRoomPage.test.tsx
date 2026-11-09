import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GuestIdentity } from '../../features/guest/services/guestIdentity'
import { readGuestIdentity, saveGuestIdentity } from '../../features/guest/services/guestIdentity'
import type { GuestPresenceStore } from '../../features/guest/services/guestPresenceStore'
import { FakePublicRoomStore, makePublicRoom } from '../../test/roomTestDoubles'
import { GuestRoomPage } from './GuestRoomPage'

const DEFAULT_IDENTITY: GuestIdentity = {
  guestId: 'a1111111-1111-4111-8111-111111111111',
  nickname: 'Convidado de teste',
}
const DEFAULT_PRESENCE_STORE: GuestPresenceStore = { heartbeat: async () => {} }

function renderRoom(
  path: string,
  store: FakePublicRoomStore,
  options: { identity?: GuestIdentity | null; presenceStore?: GuestPresenceStore; seedIdentity?: boolean } = {},
) {
  const identity = options.identity === undefined ? DEFAULT_IDENTITY : options.identity
  if (options.seedIdentity !== false) {
    if (identity) saveGuestIdentity(identity)
    else localStorage.clear()
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sala/:roomCode" element={<GuestRoomPage store={store} presenceStore={options.presenceStore ?? DEFAULT_PRESENCE_STORE} />} />
      </Routes>
    </MemoryRouter>,
  )
}

function expectArtworkImmediatelyBelowReturnButton() {
  const artwork = document.querySelector('img[src="/guest-room-artwork.png"]')

  expect(artwork).not.toBeNull()
}

function searchUsageResponse(callsToday: number, nextResetAt = new Date(Date.now() + 60_000).toISOString()) {
  return Response.json({
    callsToday,
    dailyQuota: 100,
    quotaDay: '2026-11-05',
    nextResetAt,
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('GuestRoomPage', () => {
  it('asks for a nickname before entry and reuses that browser identity on the next visit', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const presenceStore: GuestPresenceStore = { heartbeat: vi.fn().mockResolvedValue(undefined) }
    const firstVisit = renderRoom('/sala/a1b2c3d4e5', store, { identity: null, presenceStore })

    expect(await screen.findByRole('heading', { name: 'Como podemos chamar você?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome ou apelido')).toBeRequired()
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()
    expect(presenceStore.heartbeat).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Nome ou apelido'), { target: { value: '  Ana   DJ  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar na sala' }))

    expect(await screen.findByRole('heading', { name: /peça uma música/i })).toBeInTheDocument()
    const identity = readGuestIdentity()
    expect(identity).toMatchObject({ nickname: 'Ana DJ' })
    expect(identity?.guestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(presenceStore.heartbeat).toHaveBeenCalledWith('A1B2C3D4E5', identity, expect.stringMatching(/^[a-f0-9]{64}$/))

    firstVisit.unmount()
    renderRoom('/sala/a1b2c3d4e5', store, { seedIdentity: false, presenceStore })
    expect(await screen.findByRole('heading', { name: /peça uma música/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome ou apelido')).not.toBeInTheDocument()
    await waitFor(() => expect(presenceStore.heartbeat).toHaveBeenCalledTimes(2))
  })

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

  it('does not confirm entry until presence is registered and shows the backend failure', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    let rejectHeartbeat: ((error: Error) => void) | undefined
    const presenceStore: GuestPresenceStore = {
      heartbeat: vi.fn(() => new Promise<void>((_resolve, reject) => { rejectHeartbeat = reject })),
    }
    renderRoom('/sala/a1b2c3d4e5', store, { presenceStore })

    expect((await screen.findAllByText('Conectando à sala…')).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Você entrou como/)).not.toBeInTheDocument()

    await act(async () => {
      rejectHeartbeat?.(new Error('Falha original de presença'))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha original de presença')
    expect(screen.queryByText(/Você entrou como/)).not.toBeInTheDocument()
  })

  it('sends a manual request only after explicit submission and confirms receipt', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const presenceStore: GuestPresenceStore = { heartbeat: vi.fn().mockResolvedValue(undefined) }
    const privateCode = 'a'.repeat(64)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === '/api/youtube-search-usage') return searchUsageResponse(0)
      if (String(input) === '/api/guest-requests') return new Response(JSON.stringify({ received: true, privateCode }), { status: 201 })
      if (String(input) === '/api/guest-request-status') return Response.json({ requests: [{ title: 'Canção de teste', artist: 'Artista teste', status: 'pending', createdAt: '2026-11-06T12:00:00Z' }] })
      throw new Error(`Unexpected request: ${String(input)}`)
    })
    renderRoom('/sala/a1b2c3d4e5', store, { presenceStore })
    await screen.findByRole('heading', { name: /peça uma música/i })
    expect(await screen.findByText('Pesquisas ao YouTube hoje: 0/100')).toBeInTheDocument()
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(0)

    fireEvent.click(screen.getByText(/faça um pedido manual/i))
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Canção de teste' } })
    fireEvent.change(screen.getByLabelText('Artista'), { target: { value: 'Artista teste' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido manual' }))

    expect(await screen.findByText(/pedido recebido/i)).toBeInTheDocument()
    expect(screen.getByText(privateCode)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar exclusão por e-mail' })).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(privateCode)))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/guest-requests', expect.objectContaining({ method: 'POST' })))
    const requestCall = fetchSpy.mock.calls.find(([url]) => url === '/api/guest-requests')
    const requestBody = JSON.parse(String(requestCall?.[1]?.body)) as { acceptedLegal: boolean; guestId: string }
    expect(requestBody.acceptedLegal).toBe(true)
    expect(requestBody.guestId).toBe(DEFAULT_IDENTITY.guestId)
    expect(JSON.parse(localStorage.getItem('youdj.guest.request-receipts.v1.A1B2C3D4E5') ?? '[]')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Meus pedidos' }))
    expect(await screen.findByRole('heading', { name: 'Meus pedidos' })).toBeInTheDocument()
    expect(await screen.findByText('Pendente')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Voltar à sala/ }))
    expect(await screen.findByRole('heading', { name: 'Pedido enviado ao DJ' })).toBeInTheDocument()
    const anotherRequestButton = screen.getByRole('button', { name: 'Pedir outra música' })
    const myRequestsButton = screen.getByRole('button', { name: 'Meus pedidos' })
    expect(myRequestsButton.compareDocumentPosition(anotherRequestButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(anotherRequestButton)
    expect(screen.getByRole('heading', { name: /peça uma música/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Pesquisar no YouTube')).toHaveValue('')
    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.getByLabelText('Artista')).toHaveValue('')
    expect(screen.getByLabelText('Link do YouTube (opcional)')).toHaveValue('')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(readGuestIdentity()).toEqual(DEFAULT_IDENTITY)
    expect(presenceStore.heartbeat).toHaveBeenCalledTimes(1)
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/guest-requests')).toHaveLength(1)
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
    expect(screen.getByRole('button', { name: 'Enviar pedido manual' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Buscar músicas' })).toBeDisabled()
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(0)

    fireEvent.click(screen.getByRole('checkbox'))
    fetchSpy.mockRestore()
  })

  it('does not search while typing; the lupa searches once and selection/request do not repeat it', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const video = { videoId: 'abcdefghijk', title: 'Música exemplo', channel: 'Canal exemplo', thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' }
    let usageRefreshCount = 0
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const path = String(input)
      if (path === '/api/youtube-search-usage') return searchUsageResponse(usageRefreshCount++)
      if (path === '/api/youtube-search') return Response.json({ available: true, videos: [video] })
      if (path === '/api/guest-requests') return new Response(JSON.stringify({ received: true, privateCode: 'b'.repeat(64) }), { status: 201 })
      throw new Error(`Unexpected request: ${path}`)
    })
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(await screen.findByText('Pesquisas ao YouTube hoje: 0/100')).toBeInTheDocument()
    expect(fetchSpy.mock.calls.some(([url]) => url === '/api/youtube-search')).toBe(false)
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Pesquisar no YouTube'), { target: { value: '  música   exemplo ' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Buscar músicas' })).toBeEnabled()
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Buscar músicas' }))
    expect(await screen.findByText('Música exemplo')).toBeInTheDocument()
    expect(await screen.findByText('Pesquisas ao YouTube hoje: 1/100')).toBeInTheDocument()
    expect(screen.getByText('Canal exemplo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar pedido ao DJ' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /música exemplo/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido ao DJ' }))
    expect(await screen.findByText(/pedido recebido/i)).toBeInTheDocument()
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(1)
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search-usage')).toHaveLength(2)
    const requestCall = fetchSpy.mock.calls.find(([url]) => url === '/api/guest-requests')
    const submittedBody = JSON.parse(String(requestCall?.[1]?.body)) as { guestId: string; request: { video: { videoId: string } } }
    expect(submittedBody.request.video.videoId).toBe(video.videoId)
    expect(submittedBody.guestId).toBe(DEFAULT_IDENTITY.guestId)
  })

  it('shows the server search error while keeping the manual request fallback available', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) === '/api/youtube-search-usage') return searchUsageResponse(0)
      return new Response(JSON.stringify({
        code: 'youtube_quota_exceeded',
        error: 'A cota diária do YouTube foi atingida. O pedido manual continua disponível.',
      }), { status: 429 })
    })
    renderRoom('/sala/a1b2c3d4e5', store)
    await screen.findByRole('heading', { name: /peça uma música/i })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Pesquisar no YouTube'), { target: { value: 'música teste' } })
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(0)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Buscar músicas' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Buscar músicas' }))

    expect(await screen.findByText(/cota diária do youtube foi atingida/i)).toBeInTheDocument()
    expect(screen.getByText(/Não encontrou\? Faça um pedido manual/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar pedido ao DJ' })).not.toBeInTheDocument()
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(1)
  })

  it('refreshes usage at the next Pacific quota-day boundary without querying YouTube', async () => {
    const store = new FakePublicRoomStore({ rooms: [makePublicRoom({ code: 'A1B2C3D4E5' })] })
    let reads = 0
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input) !== '/api/youtube-search-usage') throw new Error(`Unexpected request: ${String(input)}`)
      reads += 1
      const resetAt = new Date(Date.now() + (reads === 1 ? 20 : 60_000)).toISOString()
      return searchUsageResponse(reads === 1 ? 37 : 0, resetAt)
    })

    renderRoom('/sala/a1b2c3d4e5', store)

    expect(await screen.findByText('Pesquisas ao YouTube hoje: 37/100')).toBeInTheDocument()
    expect(await screen.findByText('Pesquisas ao YouTube hoje: 0/100')).toBeInTheDocument()
    expect(reads).toBeGreaterThanOrEqual(2)
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/youtube-search')).toHaveLength(0)
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
