import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { flags, flagEnvironments, environments, auditLog } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { invalidateEnvCache } from '../services/flagEvaluator'

const createFlagSchema = z.object({
  key: z.string().regex(/^[a-z0-9-_]+$/, 'Key must be lowercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['boolean', 'string', 'number', 'json']).default('boolean'),
  tags: z.array(z.string()).default([]),
})

const updateFlagSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const patchEnvSchema = z.object({
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  defaultValue: z.string().optional(),
  rules: z.array(z.any()).optional(),
})

export const flagRoutes: FastifyPluginAsync = async (app) => {
  app.get('/flags', { preHandler: [app.authenticate] }, async (request) => {
    const { orgId } = request.user
    const { env, search, tag, archived } = request.query as {
      env?: string
      search?: string
      tag?: string
      archived?: string
    }

    let query = db
      .select({
        id: flags.id,
        key: flags.key,
        name: flags.name,
        type: flags.type,
        tags: flags.tags,
        archived: flags.archived,
        createdAt: flags.createdAt,
        updatedAt: flags.updatedAt,
        envState: env ? {
          enabled: flagEnvironments.enabled,
          rolloutPercentage: flagEnvironments.rolloutPercentage,
          updatedAt: flagEnvironments.updatedAt,
          rules: flagEnvironments.rules,
        } : sql<null>`null`,
      })
      .from(flags)
      .$dynamic()

    if (env) {
      query = query.leftJoin(
        flagEnvironments,
        and(eq(flagEnvironments.flagId, flags.id), eq(flagEnvironments.envId, env))
      ) as typeof query
    }

    const results = await query.where(
      and(
        eq(flags.orgId, orgId),
        archived === 'true' ? eq(flags.archived, true) : eq(flags.archived, false)
      )
    )

    let filtered = results
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(f => f.key.includes(q) || f.name.toLowerCase().includes(q))
    }
    if (tag) {
      filtered = filtered.filter(f => Array.isArray(f.tags) && f.tags.includes(tag))
    }

    return filtered.map(f => ({
      ...f,
      envState: f.envState && env ? {
        enabled: (f.envState as any).enabled,
        rolloutPercentage: (f.envState as any).rolloutPercentage,
        rulesCount: Array.isArray((f.envState as any).rules) ? (f.envState as any).rules.length : 0,
        lastModified: (f.envState as any).updatedAt,
      } : null,
    }))
  })

  app.post('/flags', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const body = createFlagSchema.parse(request.body)

    const existing = await db.select({ id: flags.id }).from(flags).where(
      and(eq(flags.orgId, orgId), eq(flags.key, body.key))
    ).limit(1)
    if (existing.length > 0) return reply.conflict(`Flag key "${body.key}" already exists`)

    const [flag] = await db.insert(flags).values({
      orgId,
      key: body.key,
      name: body.name,
      description: body.description,
      type: body.type,
      tags: body.tags,
    }).returning()

    // Create flagEnvironment records for each existing environment
    const envs = await db.select({ id: environments.id }).from(environments).where(eq(environments.orgId, orgId))
    if (envs.length > 0) {
      await db.insert(flagEnvironments).values(
        envs.map(e => ({ flagId: flag.id, envId: e.id }))
      )
    }

    return reply.code(201).send(flag)
  })

  app.get('/flags/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }

    const [flag] = await db.select().from(flags).where(
      and(eq(flags.id, id), eq(flags.orgId, orgId))
    ).limit(1)
    if (!flag) return reply.notFound('Flag not found')

    const envStates = await db
      .select({
        envId: flagEnvironments.envId,
        envName: environments.name,
        envColor: environments.color,
        enabled: flagEnvironments.enabled,
        rolloutPercentage: flagEnvironments.rolloutPercentage,
        defaultValue: flagEnvironments.defaultValue,
        rules: flagEnvironments.rules,
        updatedAt: flagEnvironments.updatedAt,
      })
      .from(flagEnvironments)
      .innerJoin(environments, eq(environments.id, flagEnvironments.envId))
      .where(eq(flagEnvironments.flagId, id))

    return { ...flag, environments: envStates }
  })

  app.put('/flags/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }
    const body = updateFlagSchema.parse(request.body)

    const [flag] = await db.select().from(flags).where(
      and(eq(flags.id, id), eq(flags.orgId, orgId))
    ).limit(1)
    if (!flag) return reply.notFound('Flag not found')

    const [updated] = await db.update(flags)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(flags.id, id))
      .returning()

    return updated
  })

  app.delete('/flags/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }

    const [flag] = await db.select().from(flags).where(
      and(eq(flags.id, id), eq(flags.orgId, orgId))
    ).limit(1)
    if (!flag) return reply.notFound('Flag not found')

    await db.update(flags).set({ archived: true, updatedAt: new Date() }).where(eq(flags.id, id))
    return { success: true }
  })

  app.patch('/flags/:id/environments/:envId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId, userId } = request.user
    const { id, envId } = request.params as { id: string; envId: string }
    const body = patchEnvSchema.parse(request.body)

    const [flag] = await db.select().from(flags).where(
      and(eq(flags.id, id), eq(flags.orgId, orgId))
    ).limit(1)
    if (!flag) return reply.notFound('Flag not found')

    const [existing] = await db.select().from(flagEnvironments).where(
      and(eq(flagEnvironments.flagId, id), eq(flagEnvironments.envId, envId))
    ).limit(1)
    if (!existing) return reply.notFound('Flag environment not found')

    const beforeState = { ...existing }

    const [updated] = await db.update(flagEnvironments)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(flagEnvironments.flagId, id), eq(flagEnvironments.envId, envId)))
      .returning()

    // Write audit log
    const action = body.enabled !== undefined
      ? (body.enabled ? 'flag.enabled' : 'flag.disabled')
      : body.rolloutPercentage !== undefined
      ? 'rollout.changed'
      : 'rules.changed'

    await db.insert(auditLog).values({
      orgId,
      userId,
      flagId: id,
      action,
      before: beforeState as any,
      after: updated as any,
    })

    invalidateEnvCache(envId)
    return updated
  })
}
