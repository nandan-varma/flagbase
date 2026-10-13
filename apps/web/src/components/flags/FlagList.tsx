import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { api } from '../../api/client'
import { useEnv } from '../../context/EnvContext'
import { FlagRow } from './FlagRow'
import { CreateFlagModal } from './CreateFlagModal'

export function FlagList() {
  const { envId } = useEnv()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['flags', envId, search, showArchived],
    queryFn: () => api.flags.list(envId!, { search: search || undefined, archived: showArchived }),
    enabled: !!envId,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search flags…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="rounded-sm"
          />
          Archived
        </label>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          New flag
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : flags.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {search ? 'No flags match your search.' : 'No flags yet. Create your first flag!'}
          </div>
        ) : (
          flags.map(flag => <FlagRow key={flag.id} flag={flag} />)
        )}
      </div>

      {showModal && <CreateFlagModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
