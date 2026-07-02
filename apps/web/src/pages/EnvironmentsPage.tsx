import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { api } from '../api/client'

const PRESET_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#1D9E75']

function CreateEnvModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => api.environments.create({ name, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['environments'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New environment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="staging"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
          <div className="flex gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-all"
                style={{ backgroundColor: c, borderColor: color === c ? '#1a1a1a' : 'transparent' }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => mutate()}
            disabled={!name || isPending}
            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EnvironmentsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: envs = [], isLoading } = useQuery({
    queryKey: ['environments'],
    queryFn: api.environments.list,
  })

  const { mutate: deleteEnv } = useMutation({
    mutationFn: api.environments.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['environments'] }),
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your deployment environments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> New environment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : envs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No environments yet.</div>
        ) : (
          envs.map(env => (
            <div key={env.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3 flex-1">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: env.color ?? '#9CA3AF' }}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{env.name}</div>
                  <div className="text-xs text-gray-400">Created {new Date(env.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              <button
                onClick={() => deleteEnv(env.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && <CreateEnvModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
