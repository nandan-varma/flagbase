import NodeCache from 'node-cache'
import { db } from '../db/client'
import { flagEnvironments, flags, environments } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { Condition, TargetingRule } from '../db/schema'

const cache = new NodeCache({ stdTTL: 30, checkperiod: 10 })

interface FlagState {
  key: string
  type: string
  enabled: boolean
  rolloutPercentage: number
  defaultValue: string
  rules: TargetingRule[]
}

async function loadEnvFlags(envId: string): Promise<FlagState[]> {
  const rows = await db
    .select({
      key: flags.key,
      type: flags.type,
      enabled: flagEnvironments.enabled,
      rolloutPercentage: flagEnvironments.rolloutPercentage,
      defaultValue: flagEnvironments.defaultValue,
      rules: flagEnvironments.rules,
    })
    .from(flagEnvironments)
    .innerJoin(flags, eq(flags.id, flagEnvironments.flagId))
    .where(eq(flagEnvironments.envId, envId))

  return rows as FlagState[]
}

function getEnvFlags(envId: string): Promise<FlagState[]> {
  const cached = cache.get<FlagState[]>(envId)
  if (cached) return Promise.resolve(cached)

  return loadEnvFlags(envId).then(states => {
    cache.set(envId, states)
    return states
  })
}

export function invalidateEnvCache(envId: string) {
  cache.del(envId)
}

export async function warmCache() {
  const envs = await db.select({ id: environments.id }).from(environments)
  await Promise.all(envs.map(e => loadEnvFlags(e.id).then(s => cache.set(e.id, s))))
}

// FNV-1a 32-bit hash — fast, no external dep, good distribution for bucketing
function fnv1a(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash
}

function matchCondition(condition: Condition, ctx: Record<string, unknown>): boolean {
  const val = ctx[condition.attribute]
  const target = condition.value

  switch (condition.operator) {
    case 'is':
      return String(val) === String(target)
    case 'isNot':
      return String(val) !== String(target)
    case 'contains':
      return typeof val === 'string' && val.includes(String(target))
    case 'startsWith':
      return typeof val === 'string' && val.startsWith(String(target))
    case 'inList':
      return Array.isArray(target) && target.map(String).includes(String(val))
    case 'semverGte': {
      const parseVer = (v: string) => v.split('.').map(Number)
      const [aM, am, ap] = parseVer(String(val))
      const [bM, bm, bp] = parseVer(String(target))
      if (aM !== bM) return aM > bM
      if (am !== bm) return am > bm
      return ap >= bp
    }
    case 'percentile': {
      const pct = fnv1a(String(val)) % 100
      return pct < Number(target)
    }
    default:
      return false
  }
}

function matchRule(rule: TargetingRule, ctx: Record<string, unknown>): boolean {
  if (rule.conditions.length === 0) return false
  return rule.conditions.every(c => matchCondition(c, ctx))
}

function parseValue(raw: string, type: string): unknown {
  if (type === 'boolean') return raw === 'true'
  if (type === 'number') return Number(raw)
  if (type === 'json') {
    try { return JSON.parse(raw) } catch { return raw }
  }
  return raw
}

export async function evaluateFlags(
  envId: string,
  context: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const flagStates = await getEnvFlags(envId)
  const userId = String(context.userId ?? '')
  const result: Record<string, unknown> = {}

  for (const flag of flagStates) {
    if (!flag.enabled) {
      result[flag.key] = parseValue(flag.defaultValue, flag.type)
      continue
    }

    let served = false
    for (const rule of flag.rules ?? []) {
      if (matchRule(rule, context)) {
        // Optional per-rule rollout within matched segment
        if (rule.rolloutPercentage < 100) {
          const bucket = fnv1a(`${userId}:${flag.key}:rule:${rule.id}`) % 100
          if (bucket >= rule.rolloutPercentage) continue
        }
        result[flag.key] = parseValue(rule.serveValue, flag.type)
        served = true
        break
      }
    }

    if (!served) {
      const bucket = fnv1a(`${userId}:${flag.key}`) % 100
      if (bucket < flag.rolloutPercentage) {
        result[flag.key] = parseValue('true', flag.type)
      } else {
        result[flag.key] = parseValue(flag.defaultValue, flag.type)
      }
    }
  }

  return result
}
