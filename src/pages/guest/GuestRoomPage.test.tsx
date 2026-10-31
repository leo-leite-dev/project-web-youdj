import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { GuestRoomPage } from './GuestRoomPage'

function renderRoom(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/sala/:roomCode" element={<GuestRoomPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('GuestRoomPage', () => {
  it('shows an invalid link message for malformed room codes', () => {
    renderRoom('/sala/abc')

    expect(screen.getByRole('heading', { name: /link inválido/i })).toBeInTheDocument()
    expect(screen.getByText(/deve ter 6 letras ou números/i)).toBeInTheDocument()
  })

  it('shows the guest construction state for a valid room code', () => {
    renderRoom('/sala/a1b2c3')

    expect(screen.getByRole('heading', { name: /sala a1b2c3/i })).toBeInTheDocument()
    expect(screen.getByText(/em construção/i)).toBeInTheDocument()
    expect(screen.getByText(/nenhum dado de evento foi consultado/i)).toBeInTheDocument()
  })
})
