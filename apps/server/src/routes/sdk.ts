import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../db/client'
import { environments } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { evaluateFlags } from '../services/flagEvaluator'
import { createToken, listTokens, deleteToken, validateToken } from '../services/sdkTokens'

const createTokenSchema = z.object({
  envId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(['server', 'client']),
})

export const sdkRoutes: FastifyPluginAsync = async (app) => {
  // SDK evaluation — authenticated via SDK token in Authorization header
  app.get('/flags', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing SDK token' })
    }

    const plain = authHeader.slice(7)
    const tokenData = await validateToken(plain)
    if (!tokenData) {
      return reply.code(401).send({ error: 'Invalid SDK token' })
    }

    const { context } = request.query as { context?: string }
    let ctx: Record<string, unknown> = {}
    if (context) {
      try {
        ctx = JSON.parse(Buffer.from(context, 'base64').toString('utf8'))
      } catch {
        return reply.badRequest('Invalid context encoding')
      }
    }

    const flags = await evaluateFlags(tokenData.envId, ctx)
    return { flags }
  })

  // SDK token management — authenticated via user JWT
  app.get('/tokens', { preHandler: [app.authenticate] }, async (request) => {
    const { orgId } = request.user
    const { envId } = request.query as { envId?: string }

    if (envId) {
      const [env] = await db.select({ id: environments.id }).from(environments).where(
        and(eq(environments.id, envId), eq(environments.orgId, orgId))
      ).limit(1)
      if (!env) return []
      return listTokens(envId)
    }

    // Return tokens for all envs in the org
    const envs = await db.select({ id: environments.id }).from(environments).where(eq(environments.orgId, orgId))
    const allTokens = await Promise.all(envs.map(e => listTokens(e.id)))
    return allTokens.flat()
  })

  app.post('/tokens', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { orgId } = request.user
    const body = createTokenSchema.parse(request.body)

    const [env] = await db.select({ id: environments.id }).from(environments).where(
      and(eq(environments.id, body.envId), eq(environments.orgId, orgId))
    ).limit(1)
    if (!env) return reply.notFound('Environment not found')

    const token = await createToken(body.envId, body.name, body.type)
    return reply.code(201).send(token)
  })

  app.delete('/tokens/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await deleteToken(id)
    return { success: true }
  })
}
