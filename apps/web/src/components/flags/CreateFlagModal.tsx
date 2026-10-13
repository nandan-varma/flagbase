import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '../../api/client'

interface Props {
  onClose: () => void
}

export function CreateFlagModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'boolean' | 'string' | 'number' | 'json'>('boolean')
  const [tagsInput, setTagsInput] = useState('')

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => api.flags.create({
      key: key.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: description || undefined,
      type,
      tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flags'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create flag</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
            <input
              value={key}
              onChange={e => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
              placeholder="new-checkout-flow"
              className="w-full font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens, underscores only</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="New checkout flow"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="checkout, experiment"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutate()}
            disabled={!key || !name || isPending}
            className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create flag'}
          </button>
        </div>
      </div>
    </div>
  )
}
