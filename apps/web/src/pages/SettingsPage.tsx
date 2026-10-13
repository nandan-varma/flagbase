import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Eye } from 'lucide-react'
import { api, Environment, SdkToken } from '../api/client'
import { clsx } from 'clsx'

function NewTokenModal({ environments, onClose }: { environments: Environment[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [envId, setEnvId] = useState(environments[0]?.id ?? '')
  const [type, setType] = useState<'server' | 'client'>('server')
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => api.sdk.createToken({ envId, name, type }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sdk-tokens'] })
      setCreatedToken(data.plainToken)
    },
  })

  if (createdToken) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h2 className="text-lg font-semibold">Token created</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 mb-2">Copy this token now — it won't be shown again.</p>
            <p className="font-mono text-sm break-all text-gray-900">{createdToken}</p>
          </div>
          <button onClick={onClose} className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New SDK token</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Production server key"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
            <select value={envId} onChange={e => setEnvId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500">
              {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as 'server' | 'client')}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500">
              <option value="server">Server</option>
              <option value="client">Client</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutate()} disabled={!name || !envId || isPending}
            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            {isPending ? 'Creating…' : 'Create token'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: environments = [] } = useQuery({ queryKey: ['environments'], queryFn: api.environments.list })
  const { data: tokens = [], isLoading } = useQuery({ queryKey: ['sdk-tokens'], queryFn: () => api.sdk.listTokens() })

  const { mutate: deleteToken } = useMutation({
    mutationFn: api.sdk.deleteToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sdk-tokens'] }),
  })

  const envMap = Object.fromEntries(environments.map(e => [e.id, e]))

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage SDK tokens for your environments</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">SDK tokens</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            <Plus className="h-4 w-4" /> New token
          </button>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : tokens.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No tokens yet.</div>
        ) : (
          tokens.map((tok: SdkToken) => (
            <div key={tok.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{tok.name}</span>
                  <span className={clsx(
                    'text-xs px-1.5 py-0.5 rounded-sm font-medium',
                    tok.type === 'server' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                  )}>{tok.type}</span>
                  {envMap[tok.envId] && (
                    <span className="text-xs text-gray-500">{envMap[tok.envId].name}</span>
                  )}
                </div>
                <div className="font-mono text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {tok.tokenPrefix}…
                  {tok.lastUsedAt && <span className="ml-2">Last used {new Date(tok.lastUsedAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <button onClick={() => deleteToken(tok.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-sm">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && <NewTokenModal environments={environments} onClose={() => setShowModal(false)} />}
    </div>
  )
}
