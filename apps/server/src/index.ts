import 'dotenv/config'
import './types'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import { authRoutes } from './routes/auth'
import { flagRoutes } from './routes/flags'
import { environmentRoutes } from './routes/environments'
import { segmentRoutes } from './routes/segments'
import { sdkRoutes } from './routes/sdk'
import { auditRoutes } from './routes/audit'
import { warmCache } from './services/flagEvaluator'

const app = Fastify({ logger: { level: 'info' } })

async function bootstrap() {
  await app.register(cors, { origin: true })
  await app.register(sensible)
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
  })

  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
    } catch {
      return reply.unauthorized('Invalid or missing token')
    }
  })

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(flagRoutes, { prefix: '/api' })
  await app.register(environmentRoutes, { prefix: '/api' })
  await app.register(segmentRoutes, { prefix: '/api' })
  await app.register(sdkRoutes, { prefix: '/api/sdk' })
  await app.register(auditRoutes, { prefix: '/api' })

  const port = parseInt(process.env.PORT || '3001')
  await app.listen({ port, host: '0.0.0.0' })

  await warmCache()
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
