export type CompactCheck = {
  now: number
  lastRequestAt: number | null
  compactedAt: number | null
  isTurnRunning: boolean
  contextTokens: number | undefined
  ttlMs: number
  leadMs: number
  minTokens: number
}

export type CompactDecision = { go: true } | { go: false; why: string }

/**
 * Compact only inside the lead window: before it the cache is warm and idle
 * time may still end; after expiry the compaction request itself re-reads
 * the whole context uncached, which is the cost this exists to avoid.
 */
export const shouldAutoCompact = (c: CompactCheck): CompactDecision => {
  if (c.isTurnRunning) return { go: false, why: 'turn running' }
  if (c.lastRequestAt === null) return { go: false, why: 'no response yet' }
  if (c.compactedAt !== null && c.compactedAt >= c.lastRequestAt) {
    return { go: false, why: 'already compacted this idle window' }
  }
  const remaining = cacheRemainingMs(c.now, c.lastRequestAt, c.ttlMs)
  if (remaining <= 0) return { go: false, why: 'cache already expired' }
  if (remaining > c.leadMs) return { go: false, why: 'not in lead window' }
  if ((c.contextTokens ?? 0) < c.minTokens) return { go: false, why: 'context below threshold' }
  return { go: true }
}

export const cacheRemainingMs = (now: number, lastRequestAt: number, ttlMs: number) =>
  Math.max(0, lastRequestAt + ttlMs - now)

export const hitPercent = (u: {
  input_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}): number | null => {
  const total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
  return total === 0 ? null : Math.round((u.cache_read_input_tokens / total) * 100)
}

export const formatTokens = (n: number) => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export const formatRemaining = (ms: number) => {
  if (ms <= 0) return 'expired'
  if (ms >= 60_000) return `${Math.ceil(ms / 60_000)}m`
  return `${Math.ceil(ms / 1000)}s`
}

/** Filled/empty cells for a bar of `width`, `fraction` clamped to 0..1. */
export const bar = (fraction: number, width: number) => {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width)
  return { filled, empty: width - filled }
}

/** Green while comfortable, yellow when getting close, red when nearly gone. */
export const fillColor = (usedFraction: number) =>
  usedFraction >= 0.8 ? 'red' : usedFraction >= 0.5 ? 'yellow' : 'green'
