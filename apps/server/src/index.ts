import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'

const app = Fastify({ logger: { level: 'info' } })

async function bootstrap() {
  await app.register(cors, { origin: true })
  await app.register(sensible)

  app.get('/health', async () => ({ ok: true }))

  const port = parseInt(process.env.PORT || '3001')
  await app.listen({ port, host: '0.0.0.0' })
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
