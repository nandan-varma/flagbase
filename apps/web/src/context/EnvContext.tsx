import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, Environment } from '../api/client'

interface EnvContextValue {
  envId: string | null
  setEnvId: (id: string) => void
  environments: Environment[]
  activeEnv: Environment | null
}

const EnvContext = createContext<EnvContextValue | null>(null)

export function EnvProvider({ children }: { children: ReactNode }) {
  const [envId, setEnvIdState] = useState<string | null>(() => localStorage.getItem('activeEnvId'))

  const { data: environments = [] } = useQuery({
    queryKey: ['environments'],
    queryFn: api.environments.list,
  })

  const setEnvId = useCallback((id: string) => {
    localStorage.setItem('activeEnvId', id)
    setEnvIdState(id)
  }, [])

  // Auto-select first env if none selected
  const resolvedEnvId = envId ?? environments[0]?.id ?? null
  const activeEnv = environments.find(e => e.id === resolvedEnvId) ?? null

  return (
    <EnvContext.Provider value={{ envId: resolvedEnvId, setEnvId, environments, activeEnv }}>
      {children}
    </EnvContext.Provider>
  )
}

export function useEnv() {
  const ctx = useContext(EnvContext)
  if (!ctx) throw new Error('useEnv must be used within EnvProvider')
  return ctx
}
