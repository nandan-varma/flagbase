import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import rateLimit from '@fastify/rate-limit'
import { db } from '../db/client'
import { organizations, users } from '../db/schema'
import { eq } from 'drizzle-orm'

const registerSchema = z.object({
  orgName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function makeTokens(app: Parameters<FastifyPluginAsync>[0], user: { id: string; orgId: string; role: string }) {
  const accessToken = app.jwt.sign(
    { userId: user.id, orgId: user.orgId, role: user.role },
    { expiresIn: '15m' }
  )
  const refreshToken = app.jwt.sign(
    { userId: user.id, orgId: user.orgId, role: user.role, type: 'refresh' },
    { expiresIn: '7d' }
  )
  return { accessToken, refreshToken }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  await app.register(rateLimit, { max: 10, timeWindow: '1 minute' })

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1)
    if (existing.length > 0) {
      return reply.conflict('Email already registered')
    }

    const [org] = await db.insert(organizations).values({ name: body.orgName }).returning()
    const passwordHash = await bcrypt.hash(body.password, 12)
    const [user] = await db.insert(users).values({
      email: body.email,
      passwordHash,
      orgId: org.id,
      role: 'admin',
    }).returning()

    const tokens = makeTokens(app, user)
    return reply.code(201).send({
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId },
    })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    if (!user) return reply.unauthorized('Invalid credentials')

    const valid = await bcrypt.compare(body.password, user.passwordHash)
    if (!valid) return reply.unauthorized('Invalid credentials')

    const tokens = makeTokens(app, user)
    return { ...tokens, user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId } }
  })

  app.post('/refresh', async (request, reply) => {
    const { token } = (request.body as { token: string })
    try {
      const payload = app.jwt.verify<{ userId: string; orgId: string; role: string; type: string }>(token)
      if (payload.type !== 'refresh') return reply.unauthorized('Not a refresh token')

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1)
      if (!user) return reply.unauthorized('User not found')

      const accessToken = app.jwt.sign(
        { userId: user.id, orgId: user.orgId, role: user.role },
        { expiresIn: '15m' }
      )
      return { accessToken }
    } catch {
      return reply.unauthorized('Invalid refresh token')
    }
  })
}
