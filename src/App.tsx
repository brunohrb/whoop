import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Recovery from './pages/Recovery'
import Sleep from './pages/Sleep'
import Strain from './pages/Strain'
import Settings from './pages/Settings'
import ConnectWhoop from './pages/ConnectWhoop'
import BottomNav from './components/BottomNav'
import LoadingScreen from './components/LoadingScreen'

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
      <div className="flex flex-col h-full bg-black text-white overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Recovery />} />
            <Route path="/sono" element={<Sleep />} />
            <Route path="/esforco" element={<Strain />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/conectar-whoop" element={<ConnectWhoop />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
