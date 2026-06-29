import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Toggle } from '../ui/Toggle'
import { api, Flag } from '../../api/client'
import { useEnv } from '../../context/EnvContext'
import { clsx } from 'clsx'

const TYPE_COLORS: Record<string, string> = {
  boolean: 'bg-blue-100 text-blue-700',
  string: 'bg-green-100 text-green-700',
  number: 'bg-purple-100 text-purple-700',
  json: 'bg-orange-100 text-orange-700',
}

interface Props {
  flag: Flag
}

export function FlagRow({ flag }: Props) {
  const qc = useQueryClient()
  const { envId } = useEnv()

  const { mutate: toggleEnabled, isPending } = useMutation({
    mutationFn: (enabled: boolean) => api.flags.patchEnv(flag.id, envId!, { enabled }),
    onMutate: async (enabled) => {
      await qc.cancelQueries({ queryKey: ['flags', envId] })
      const prev = qc.getQueryData<Flag[]>(['flags', envId])
      qc.setQueryData<Flag[]>(['flags', envId], old =>
        old?.map(f => f.id === flag.id
          ? { ...f, envState: f.envState ? { ...f.envState, enabled } : null }
          : f
        )
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['flags', envId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['flags', envId] }),
  })

  const isEnabled = flag.envState?.enabled ?? false

  return (
    <Link
      to={`/flags/${flag.id}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-900 truncate">{flag.key}</span>
          <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium', TYPE_COLORS[flag.type] || 'bg-gray-100 text-gray-600')}>
            {flag.type}
          </span>
          {flag.tags?.map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {tag}
            </span>
          ))}
        </div>
        <div className="text-sm text-gray-500 mt-0.5 truncate">{flag.name}</div>
      </div>

      {flag.envState && (
        <div className="flex items-center gap-3 flex-shrink-0" onClick={e => e.preventDefault()}>
          {flag.envState.rulesCount > 0 && (
            <span className="text-xs text-gray-500">{flag.envState.rulesCount} rule{flag.envState.rulesCount !== 1 ? 's' : ''}</span>
          )}
          {flag.envState.rolloutPercentage < 100 && (
            <span className="text-xs text-gray-500">{flag.envState.rolloutPercentage}%</span>
          )}
          <Toggle
            checked={isEnabled}
            onChange={toggleEnabled}
            disabled={isPending || !envId}
            size="sm"
          />
        </div>
      )}
    </Link>
  )
}
