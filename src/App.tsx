import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Recovery from './pages/Recovery'
import Sleep from './pages/Sleep'
import Strain from './pages/Strain'
import Settings from './pages/Settings'
import Health from './pages/Health'
import AIAnalysis from './pages/AIAnalysis'
import ConnectWhoop from './pages/ConnectWhoop'
import BottomNav from './components/BottomNav'
import LoadingScreen from './components/LoadingScreen'
import { useWhoopData } from './hooks/useWhoopData'
import { useSync } from './hooks/useSync'

function AppWithAutoSync() {
  const { syncStatus, refresh } = useWhoopData()
  const { sync } = useSync(refresh)

  useEffect(() => {
    const lastSync = syncStatus?.last_sync_at
    if (lastSync == null) {
      sync()
      return
    }
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
    if (new Date(lastSync).getTime() < sixHoursAgo) {
      sync()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncStatus?.last_sync_at])

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recuperacao" element={<Recovery />} />
          <Route path="/sono" element={<Sleep />} />
          <Route path="/esforco" element={<Strain />} />
          <Route path="/saude" element={<Health />} />
          <Route path="/ia" element={<AIAnalysis />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="/conectar-whoop" element={<ConnectWhoop />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!user) {
    return (
      <BrowserRouter basename="/whoop">
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter basename="/whoop">
      <AppWithAutoSync />
    </BrowserRouter>
  )
}
