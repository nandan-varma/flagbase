import { pgTable, uuid, text, boolean, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  role: text('role').default('member').notNull(),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
})

export const environments = pgTable('environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
})

export const flags = pgTable('flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('boolean'),
  tags: jsonb('tags').$type<string[]>().default([]),
  archived: boolean('archived').default(false).notNull(),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`now()`).notNull(),
})

export const flagEnvironments = pgTable('flag_environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  flagId: uuid('flag_id').notNull().references(() => flags.id, { onDelete: 'cascade' }),
  envId: uuid('env_id').notNull().references(() => environments.id),
  enabled: boolean('enabled').default(false).notNull(),
  rolloutPercentage: integer('rollout_percentage').default(100).notNull(),
  defaultValue: text('default_value').default('false').notNull(),
  rules: jsonb('rules').$type<TargetingRule[]>().default([]),
  updatedAt: timestamp('updated_at').default(sql`now()`).notNull(),
})

export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  description: text('description'),
  conditions: jsonb('conditions').$type<Condition[]>().default([]),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`now()`).notNull(),
})

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').references(() => users.id),
  flagId: uuid('flag_id').references(() => flags.id),
  action: text('action').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
})

export const sdkTokens = pgTable('sdk_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  envId: uuid('env_id').notNull().references(() => environments.id),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull(),
  tokenPrefix: text('token_prefix').notNull(),
  type: text('type').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').default(sql`now()`).notNull(),
})

export interface Condition {
  attribute: string
  operator: 'is' | 'isNot' | 'contains' | 'startsWith' | 'inList' | 'semverGte' | 'percentile'
  value: string | string[]
}

export interface TargetingRule {
  id: string
  name: string
  conditions: Condition[]
  serveValue: string
  rolloutPercentage: number
}
