import { useNavigate } from 'react-router-dom'

interface Props {
  connected: boolean
  onSync?: () => void
  syncing?: boolean
}

export default function NoDataBanner({ connected, onSync, syncing }: Props) {
  const navigate = useNavigate()

  if (!connected) {
    return (
      <div className="mx-5 mt-4 bg-surface rounded-2xl p-5 flex flex-col gap-3 border border-white/10">
        <p className="text-gray-300 text-sm">Conecte seu Fitbit para ver seus dados aqui.</p>
        <button
          onClick={() => navigate('/configuracoes')}
          className="bg-bhr-green text-black font-semibold py-2.5 px-5 rounded-xl text-sm w-full"
        >
          Conectar Fitbit
        </button>
      </div>
    )
  }

  return (
    <div className="mx-5 mt-4 bg-surface rounded-2xl p-5 flex flex-col gap-3 border border-white/10">
      <p className="text-gray-300 text-sm">Nenhum dado encontrado. Sincronize para carregar seus dados.</p>
      <button
        onClick={onSync}
        disabled={syncing}
        className="bg-bhr-green text-black font-semibold py-2.5 px-5 rounded-xl text-sm w-full disabled:opacity-50"
      >
        {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
      </button>
    </div>
  )
}
