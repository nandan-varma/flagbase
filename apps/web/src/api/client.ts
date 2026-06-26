const BASE = '/api'

function getToken() {
  return localStorage.getItem('accessToken')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    localStorage.setItem('accessToken', data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

export async function apiFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${BASE}${path}`, { ...init, headers })
    } else {
      clearTokens()
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || err.error || 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// Typed API helpers
export const api = {
  auth: {
    register: (body: { orgName: string; email: string; password: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; orgId: string } }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; orgId: string } }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  },
  environments: {
    list: () => apiFetch<Environment[]>('/environments'),
    create: (body: { name: string; color?: string }) =>
      apiFetch<Environment>('/environments', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) => apiFetch<void>(`/environments/${id}`, { method: 'DELETE' }),
  },
  flags: {
    list: (envId: string, params?: { search?: string; tag?: string; archived?: boolean }) => {
      const q = new URLSearchParams({ env: envId })
      if (params?.search) q.set('search', params.search)
      if (params?.tag) q.set('tag', params.tag)
      if (params?.archived) q.set('archived', 'true')
      return apiFetch<Flag[]>(`/flags?${q}`)
    },
    get: (id: string) => apiFetch<FlagDetail>(`/flags/${id}`),
    create: (body: CreateFlagBody) =>
      apiFetch<Flag>('/flags', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<CreateFlagBody>) =>
      apiFetch<Flag>(`/flags/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    archive: (id: string) => apiFetch<void>(`/flags/${id}`, { method: 'DELETE' }),
    patchEnv: (id: string, envId: string, body: PatchEnvBody) =>
      apiFetch<FlagEnvState>(`/flags/${id}/environments/${envId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  },
  segments: {
    list: () => apiFetch<Segment[]>('/segments'),
    create: (body: { name: string; description?: string; conditions: Condition[] }) =>
      apiFetch<Segment>('/segments', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ name: string; description: string; conditions: Condition[] }>) =>
      apiFetch<Segment>(`/segments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => apiFetch<void>(`/segments/${id}`, { method: 'DELETE' }),
  },
  audit: {
    list: (params?: { flagId?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams()
      if (params?.flagId) q.set('flagId', params.flagId)
      if (params?.limit) q.set('limit', String(params.limit))
      if (params?.offset) q.set('offset', String(params.offset))
      return apiFetch<AuditEntry[]>(`/audit?${q}`)
    },
  },
  sdk: {
    listTokens: (envId?: string) => {
      const q = envId ? `?envId=${envId}` : ''
      return apiFetch<SdkToken[]>(`/sdk/tokens${q}`)
    },
    createToken: (body: { envId: string; name: string; type: 'server' | 'client' }) =>
      apiFetch<SdkToken & { plainToken: string }>('/sdk/tokens', { method: 'POST', body: JSON.stringify(body) }),
    deleteToken: (id: string) => apiFetch<void>(`/sdk/tokens/${id}`, { method: 'DELETE' }),
  },
}

// Shared types
export interface Environment {
  id: string
  name: string
  color?: string
  createdAt: string
}

export interface Flag {
  id: string
  key: string
  name: string
  type: 'boolean' | 'string' | 'number' | 'json'
  tags: string[]
  archived: boolean
  createdAt: string
  updatedAt: string
  envState: {
    enabled: boolean
    rolloutPercentage: number
    rulesCount: number
    lastModified: string
  } | null
}

export interface FlagEnvState {
  id: string
  flagId: string
  envId: string
  envName: string
  envColor?: string
  enabled: boolean
  rolloutPercentage: number
  defaultValue: string
  rules: TargetingRule[]
  updatedAt: string
}

export interface FlagDetail {
  id: string
  key: string
  name: string
  type: 'boolean' | 'string' | 'number' | 'json'
  tags: string[]
  archived: boolean
  description?: string
  createdAt: string
  updatedAt: string
  environments: FlagEnvState[]
}

export interface Condition {
  attribute: string
  operator: 'is' | 'isNot' | 'contains' | 'startsWith' | 'inList' | 'semverGte' | 'percentile'
  value: string | string[]
}

export interface TargetingRule {
  id: string
  name: string
  conditions: Condition[]
  serveValue: string
  rolloutPercentage: number
}

export interface Segment {
  id: string
  orgId: string
  name: string
  description?: string
  conditions: Condition[]
  createdAt: string
  updatedAt: string
}

export interface AuditEntry {
  id: string
  action: string
  before: unknown
  after: unknown
  createdAt: string
  flagId?: string
  userId?: string
  userEmail?: string
}

export interface SdkToken {
  id: string
  envId: string
  name: string
  tokenPrefix: string
  type: 'server' | 'client'
  lastUsedAt?: string
  createdAt: string
}

export interface CreateFlagBody {
  key: string
  name: string
  description?: string
  type: 'boolean' | 'string' | 'number' | 'json'
  tags: string[]
}

export interface PatchEnvBody {
  enabled?: boolean
  rolloutPercentage?: number
  defaultValue?: string
  rules?: TargetingRule[]
}
