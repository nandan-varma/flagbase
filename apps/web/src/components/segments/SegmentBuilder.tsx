import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { api, Condition, Segment } from '../../api/client'

const OPERATORS = [
  { value: 'is', label: 'is' },
  { value: 'isNot', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'inList', label: 'in list' },
  { value: 'semverGte', label: 'semver ≥' },
  { value: 'percentile', label: 'percentile <' },
] as const

const COMMON_ATTRIBUTES = ['userId', 'email', 'plan', 'country', 'version']

function newCondition(): Condition {
  return { attribute: 'userId', operator: 'is', value: '' }
}

interface Props {
  segment?: Segment
  onClose: () => void
}

export function SegmentBuilder({ segment, onClose }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState(segment?.name ?? '')
  const [description, setDescription] = useState(segment?.description ?? '')
  const [conditions, setConditions] = useState<Condition[]>(segment?.conditions ?? [])

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => segment
      ? api.segments.update(segment.id, { name, description, conditions })
      : api.segments.create({ name, description, conditions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['segments'] })
      onClose()
    },
  })

  function updateCondition(idx: number, partial: Partial<Condition>) {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, ...partial } : c))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{segment ? 'Edit segment' : 'Create segment'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Beta users"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Conditions (AND)</label>
              <button
                onClick={() => setConditions(prev => [...prev, newCondition()])}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add condition
              </button>
            </div>
            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={cond.attribute}
                    onChange={e => updateCondition(idx, { attribute: e.target.value })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {COMMON_ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
                    {!COMMON_ATTRIBUTES.includes(cond.attribute) && (
                      <option value={cond.attribute}>{cond.attribute}</option>
                    )}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={e => updateCondition(idx, { operator: e.target.value as Condition['operator'] })}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  <input
                    value={Array.isArray(cond.value) ? cond.value.join(', ') : cond.value}
                    onChange={e => {
                      const raw = e.target.value
                      const val = cond.operator === 'inList' ? raw.split(',').map(s => s.trim()) : raw
                      updateCondition(idx, { value: val })
                    }}
                    placeholder="value"
                    className="flex-1 min-w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button onClick={() => setConditions(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {conditions.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                  No conditions. Add one above.
                </p>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => mutate()}
            disabled={!name || isPending}
            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? 'Saving…' : segment ? 'Save changes' : 'Create segment'}
          </button>
        </div>
      </div>
    </div>
  )
}
