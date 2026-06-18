import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { environments, flagEnvironments, flags } from '../db/schema'
import { eq, and } from 'drizzle-orm'

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
})

export const environmentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/environments', { preHandler: [app.authenticate] }, async (request) => {
    const { orgId } = request.user
    const envs = await db.select().from(environments).where(eq(environments.orgId, orgId))
    return envs
  })

  app.post('/environments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const body = createSchema.parse(request.body)

    const [env] = await db.insert(environments).values({
      orgId,
      name: body.name,
      color: body.color,
    }).returning()

    // Create flagEnvironment records for all existing flags in this org
    const existingFlags = await db.select({ id: flags.id }).from(flags).where(
      and(eq(flags.orgId, orgId), eq(flags.archived, false))
    )
    if (existingFlags.length > 0) {
      await db.insert(flagEnvironments).values(
        existingFlags.map(f => ({ flagId: f.id, envId: env.id }))
      )
    }

    return reply.code(201).send(env)
  })

  app.delete('/environments/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }

    const [env] = await db.select().from(environments).where(
      and(eq(environments.id, id), eq(environments.orgId, orgId))
    ).limit(1)
    if (!env) return reply.notFound('Environment not found')

    await db.delete(environments).where(eq(environments.id, id))
    return { success: true }
  })
}
