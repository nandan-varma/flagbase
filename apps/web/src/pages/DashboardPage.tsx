import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { useEnv } from '../context/EnvContext'
import { FlagList } from '../components/flags/FlagList'

export function DashboardPage() {
  const { envId } = useEnv()

  const { data: flags = [] } = useQuery({
    queryKey: ['flags', envId],
    queryFn: () => api.flags.list(envId!),
    enabled: !!envId,
  })

  const now = Date.now()
  const STALE_MS = 90 * 24 * 60 * 60 * 1000

  const stats = {
    total: flags.length,
    enabled: flags.filter(f => f.envState?.enabled).length,
    withRules: flags.filter(f => (f.envState?.rulesCount ?? 0) > 0).length,
    stale: flags.filter(f => {
      const updatedAt = f.envState?.lastModified ?? f.updatedAt
      return now - new Date(updatedAt).getTime() > STALE_MS
    }).length,
  }

  const statCards = [
    { label: 'Total flags', value: stats.total },
    { label: 'Enabled now', value: stats.enabled },
    { label: 'With targeting', value: stats.withRules },
    { label: 'Stale (90+ days)', value: stats.stale },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Flags</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage feature flags for your application</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <FlagList />
    </div>
  )
}
