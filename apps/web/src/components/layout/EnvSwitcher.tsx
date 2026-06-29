import { useEnv } from '../../context/EnvContext'

export function EnvSwitcher() {
  const { envId, setEnvId, environments, activeEnv } = useEnv()

  if (environments.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {activeEnv?.color && (
        <span
          className="w-2.5 h-2.5 rounded-full inline-block"
          style={{ backgroundColor: activeEnv.color }}
        />
      )}
      <select
        value={envId ?? ''}
        onChange={e => setEnvId(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {environments.map(env => (
          <option key={env.id} value={env.id}>
            {env.name}
          </option>
        ))}
      </select>
    </div>
  )
}
