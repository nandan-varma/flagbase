export interface UserContext {
  userId: string
  email?: string
  plan?: string
  country?: string
  [key: string]: unknown
}

export interface FlagBaseOptions {
  baseUrl: string
  sdkToken: string
  /** Polling interval in ms. Set to 0 to disable. Default: 30000 */
  refreshInterval?: number
}

export class FlagBase {
  private baseUrl: string
  private sdkToken: string
  private cache: Map<string, Record<string, unknown>> = new Map()
  private refreshTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: FlagBaseOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.sdkToken = options.sdkToken

    const interval = options.refreshInterval ?? 30_000
    if (interval > 0) {
      this.refreshTimer = setInterval(() => {
        this.cache.clear()
      }, interval)
      // Allow Node.js to exit even with the timer running
      if (this.refreshTimer.unref) this.refreshTimer.unref()
    }
  }

  async isEnabled(flagKey: string, context: UserContext, defaultValue = false): Promise<boolean> {
    const flags = await this.evaluate(context)
    const val = flags[flagKey]
    return val !== undefined ? Boolean(val) : defaultValue
  }

  async getValue<T>(flagKey: string, context: UserContext, defaultValue: T): Promise<T> {
    const flags = await this.evaluate(context)
    const val = flags[flagKey]
    return val !== undefined ? (val as T) : defaultValue
  }

  async evaluateAll(context: UserContext): Promise<Record<string, unknown>> {
    return this.evaluate(context)
  }

  private cacheKey(context: UserContext): string {
    return JSON.stringify(context)
  }

  private async evaluate(context: UserContext): Promise<Record<string, unknown>> {
    const key = this.cacheKey(context)
    const cached = this.cache.get(key)
    if (cached) return cached

    const ctxB64 = Buffer.from(JSON.stringify(context)).toString('base64')
    const url = `${this.baseUrl}/api/sdk/flags?context=${encodeURIComponent(ctxB64)}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.sdkToken}` },
    })

    if (!res.ok) {
      throw new Error(`FlagBase: evaluation failed with status ${res.status}`)
    }

    const data = await res.json() as { flags: Record<string, unknown> }
    this.cache.set(key, data.flags)
    return data.flags
  }

  close() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    this.cache.clear()
  }
}
