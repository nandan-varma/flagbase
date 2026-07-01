import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { api, Segment } from '../api/client'
import { SegmentBuilder } from '../components/segments/SegmentBuilder'

export function SegmentsPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Segment | null | 'new'>(null)

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['segments'],
    queryFn: api.segments.list,
  })

  const { mutate: deleteSegment } = useMutation({
    mutationFn: api.segments.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['segments'] }),
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reusable user groups for targeting rules</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> New segment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : segments.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No segments yet.</div>
        ) : (
          segments.map(seg => (
            <div key={seg.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{seg.name}</div>
                {seg.description && <div className="text-xs text-gray-500 mt-0.5">{seg.description}</div>}
                <div className="text-xs text-gray-400 mt-0.5">
                  {seg.conditions.length} condition{seg.conditions.length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(seg)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteSegment(seg.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <SegmentBuilder
          segment={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
