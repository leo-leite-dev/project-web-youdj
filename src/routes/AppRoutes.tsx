import { Route, Routes } from 'react-router-dom'
import { DjLayout } from '../layouts/DjLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { NotFoundPage } from '../pages/NotFoundPage'
import { DjDashboardPage } from '../pages/dj/DjDashboardPage'
import { DjLoginPage } from '../pages/dj/DjLoginPage'
import { GuestRoomPage } from '../pages/guest/GuestRoomPage'
import { HomePage } from '../pages/HomePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="dj" element={<DjLoginPage />} />
        <Route path="sala/:roomCode" element={<GuestRoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="dj/painel" element={<DjLayout />}>
        <Route index element={<DjDashboardPage />} />
      </Route>
    </Routes>
  )
}
