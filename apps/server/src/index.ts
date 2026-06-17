import 'dotenv/config'
import './types'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import { authRoutes } from './routes/auth'

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

  const port = parseInt(process.env.PORT || '3001')
  await app.listen({ port, host: '0.0.0.0' })
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
