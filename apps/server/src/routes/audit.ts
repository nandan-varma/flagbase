import { FastifyPluginAsync } from 'fastify'
import { db } from '../db/client'
import { auditLog, users } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get('/audit', { preHandler: [app.authenticate] }, async (request) => {
    const { orgId } = request.user
    const { flagId, limit = '50', offset = '0' } = request.query as {
      flagId?: string
      limit?: string
      offset?: string
    }

    const conditions = [eq(auditLog.orgId, orgId)]
    if (flagId) conditions.push(eq(auditLog.flagId, flagId))

    const entries = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        before: auditLog.before,
        after: auditLog.after,
        createdAt: auditLog.createdAt,
        flagId: auditLog.flagId,
        userId: auditLog.userId,
        userEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset))

    return entries
  })
}
