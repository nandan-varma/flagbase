import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { segments } from '../db/schema'
import { eq, and } from 'drizzle-orm'

const conditionSchema = z.object({
  attribute: z.string(),
  operator: z.enum(['is', 'isNot', 'contains', 'startsWith', 'inList', 'semverGte', 'percentile']),
  value: z.union([z.string(), z.array(z.string())]),
})

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  conditions: z.array(conditionSchema).default([]),
})

export const segmentRoutes: FastifyPluginAsync = async (app) => {
  app.get('/segments', { preHandler: [app.authenticate] }, async (request) => {
    const { orgId } = request.user
    return db.select().from(segments).where(eq(segments.orgId, orgId))
  })

  app.post('/segments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const body = createSchema.parse(request.body)

    const [segment] = await db.insert(segments).values({
      orgId,
      name: body.name,
      description: body.description,
      conditions: body.conditions,
    }).returning()

    return reply.code(201).send(segment)
  })

  app.get('/segments/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }

    const [segment] = await db.select().from(segments).where(
      and(eq(segments.id, id), eq(segments.orgId, orgId))
    ).limit(1)
    if (!segment) return reply.notFound('Segment not found')
    return segment
  })

  app.put('/segments/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }
    const body = createSchema.partial().parse(request.body)

    const [existing] = await db.select({ id: segments.id }).from(segments).where(
      and(eq(segments.id, id), eq(segments.orgId, orgId))
    ).limit(1)
    if (!existing) return reply.notFound('Segment not found')

    const [updated] = await db.update(segments)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(segments.id, id))
      .returning()

    return updated
  })

  app.delete('/segments/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const { id } = request.params as { id: string }

    const [existing] = await db.select({ id: segments.id }).from(segments).where(
      and(eq(segments.id, id), eq(segments.orgId, orgId))
    ).limit(1)
    if (!existing) return reply.notFound('Segment not found')

    await db.delete(segments).where(eq(segments.id, id))
    return { success: true }
  })
}
