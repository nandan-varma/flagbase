import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '../db/client'
import { sdkTokens } from '../db/schema'
import { eq } from 'drizzle-orm'

function generateToken(type: string): string {
  const suffix = randomBytes(18).toString('hex')
  const typeSlug = type === 'server' ? 'srv' : 'cli'
  return `sdk_${typeSlug}_${suffix}`
}

export async function createToken(envId: string, name: string, type: string) {
  const plain = generateToken(type)
  const tokenHash = await bcrypt.hash(plain, 10)
  const tokenPrefix = plain.slice(0, 12)

  const [record] = await db.insert(sdkTokens).values({
    envId,
    name,
    tokenHash,
    tokenPrefix,
    type,
  }).returning()

  return { ...record, plainToken: plain }
}

export async function validateToken(plain: string): Promise<{ envId: string; tokenId: string } | null> {
  // Use prefix to narrow candidates — avoids bcrypt-comparing every token in the DB
  const prefix = plain.slice(0, 12)
  const candidates = await db.select().from(sdkTokens).where(eq(sdkTokens.tokenPrefix, prefix))

  for (const candidate of candidates) {
    const match = await bcrypt.compare(plain, candidate.tokenHash)
    if (match) {
      // Update last used timestamp (fire and forget)
      db.update(sdkTokens).set({ lastUsedAt: new Date() }).where(eq(sdkTokens.id, candidate.id)).catch(() => {})
      return { envId: candidate.envId, tokenId: candidate.id }
    }
  }
  return null
}

export async function listTokens(envId: string) {
  const tokens = await db.select({
    id: sdkTokens.id,
    name: sdkTokens.name,
    tokenPrefix: sdkTokens.tokenPrefix,
    type: sdkTokens.type,
    lastUsedAt: sdkTokens.lastUsedAt,
    createdAt: sdkTokens.createdAt,
  }).from(sdkTokens).where(eq(sdkTokens.envId, envId))

  return tokens
}

export async function deleteToken(id: string) {
  await db.delete(sdkTokens).where(eq(sdkTokens.id, id))
}
