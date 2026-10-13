import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { api, FlagEnvState, TargetingRule } from '../api/client'
import { Toggle } from '../components/ui/Toggle'
import { RolloutDial } from '../components/flags/RolloutDial'
import { TargetingRules } from '../components/flags/TargetingRules'
import { StaleFlagWarning } from '../components/ui/StaleFlagWarning'
import { clsx } from 'clsx'

function AuditLog({ flagId }: { flagId: string }) {
  const { data: entries = [] } = useQuery({
    queryKey: ['audit', flagId],
    queryFn: () => api.audit.list({ flagId, limit: 10 }),
  })

  if (entries.length === 0) return <p className="text-sm text-gray-400">No activity yet.</p>

  return (
    <ul className="space-y-2">
      {entries.map(e => (
        <li key={e.id} className="flex items-center gap-3 text-sm">
          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded-sm">{e.action}</span>
          <span className="text-gray-500">{e.userEmail ?? 'system'}</span>
          <span className="text-gray-400 ml-auto">{new Date(e.createdAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  )
}

function EnvPanel({ envState, flagId, flagType }: { envState: FlagEnvState; flagId: string; flagType: string }) {
  const qc = useQueryClient()
  const [rules, setRules] = useState<TargetingRule[]>(envState.rules)
  const [rollout, setRollout] = useState(envState.rolloutPercentage)

  const { mutate: patchEnabled } = useMutation({
    mutationFn: (enabled: boolean) => api.flags.patchEnv(flagId, envState.envId, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flag', flagId] }),
  })

  const { mutate: saveRollout, isPending: savingRollout } = useMutation({
    mutationFn: () => api.flags.patchEnv(flagId, envState.envId, { rolloutPercentage: rollout }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flag', flagId] }),
  })

  const { mutate: saveRules, isPending: savingRules } = useMutation({
    mutationFn: () => api.flags.patchEnv(flagId, envState.envId, { rules }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['flag', flagId] }),
  })

  return (
    <div className="space-y-6">
      <StaleFlagWarning updatedAt={envState.updatedAt} />

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
        <div>
          <div className="text-sm font-medium text-gray-900">Flag enabled</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {envState.enabled ? 'This flag is active in this environment' : 'This flag is disabled'}
          </div>
        </div>
        <Toggle checked={envState.enabled} onChange={patchEnabled} />
      </div>

      {/* Rollout dial */}
      {envState.enabled && (
        <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-4">
          <RolloutDial value={rollout} onChange={setRollout} />
          {rollout !== envState.rolloutPercentage && (
            <button
              onClick={() => saveRollout()}
              disabled={savingRollout}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {savingRollout ? 'Saving…' : 'Save rollout'}
            </button>
          )}
        </div>
      )}

      {/* Targeting rules */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <TargetingRules
          rules={rules}
          flagType={flagType}
          onChange={setRules}
          onSave={() => saveRules()}
          saving={savingRules}
        />
      </div>

      {/* Default value */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <div className="text-sm font-medium text-gray-900 mb-1">Default value</div>
        <div className="text-sm text-gray-500">Served when no rule matches and user is outside rollout percentage.</div>
        <div className="mt-2 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {envState.defaultValue}
        </div>
      </div>

      {/* Audit log */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent changes</h3>
        <AuditLog flagId={flagId} />
      </div>
    </div>
  )
}

export function FlagDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null)

  const { data: flag, isLoading } = useQuery({
    queryKey: ['flag', id],
    queryFn: () => api.flags.get(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-sm text-gray-400">Loading…</div>
  if (!flag) return <div className="text-sm text-red-500">Flag not found</div>

  const resolvedEnvId = activeEnvId ?? flag.environments[0]?.envId
  const activeEnv = flag.environments.find(e => e.envId === resolvedEnvId) ?? flag.environments[0]

  const TYPE_COLORS: Record<string, string> = {
    boolean: 'bg-blue-100 text-blue-700',
    string: 'bg-green-100 text-green-700',
    number: 'bg-purple-100 text-purple-700',
    json: 'bg-orange-100 text-orange-700',
  }

  function copyKey() {
    navigator.clipboard.writeText(flag!.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{flag.name}</h1>
              <span className={clsx('text-xs px-1.5 py-0.5 rounded-sm font-medium', TYPE_COLORS[flag.type])}>
                {flag.type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-sm text-gray-600">{flag.key}</span>
              <button onClick={copyKey} className="text-gray-400 hover:text-gray-600">
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            {flag.description && <p className="text-sm text-gray-500 mt-1">{flag.description}</p>}
            {flag.tags.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {flag.tags.map(tag => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded-sm bg-gray-100 text-gray-600">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Environment tabs */}
      {flag.environments.length > 0 && (
        <div>
          <div className="flex gap-1 border-b border-gray-200">
            {flag.environments.map(env => (
              <button
                key={env.envId}
                onClick={() => setActiveEnvId(env.envId)}
                className={clsx(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  env.envId === (resolvedEnvId)
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <span className="flex items-center gap-1.5">
                  {env.envColor && (
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: env.envColor }} />
                  )}
                  {env.envName}
                </span>
              </button>
            ))}
          </div>
          {activeEnv && (
            <div className="mt-6">
              <EnvPanel envState={activeEnv} flagId={flag.id} flagType={flag.type} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
