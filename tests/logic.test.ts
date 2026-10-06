import { describe, expect, test } from 'claude-code/testing'

import { bar, formatRemaining, formatTokens, hitPercent, shouldAutoCompact } from '../hooks/logic'

const HOUR = 60 * 60_000
const base = {
  now: 1_000_000 + HOUR - 2 * 60_000, // 2 min of cache left
  lastRequestAt: 1_000_000,
  compactedAt: null,
  isTurnRunning: false,
  contextTokens: 656_000,
  ttlMs: HOUR,
  leadMs: 3 * 60_000,
  minTokens: 150_000,
}

describe('shouldAutoCompact', () => {
  test('fires inside the lead window on a big idle context', async () => {
    expect(shouldAutoCompact(base)).toEqual({ go: true })
  })
  test('waits while the cache has more than the lead left', async () => {
    expect(shouldAutoCompact({ ...base, now: 1_000_000 + 10 * 60_000 }).go).toBe(false)
  })
  test('never compacts after expiry (the re-read would be uncached)', async () => {
    expect(shouldAutoCompact({ ...base, now: 1_000_000 + HOUR + 1 }).go).toBe(false)
  })
  test('skips small contexts, running turns and a window already compacted', async () => {
    expect(shouldAutoCompact({ ...base, contextTokens: 40_000 }).go).toBe(false)
    expect(shouldAutoCompact({ ...base, isTurnRunning: true }).go).toBe(false)
    expect(shouldAutoCompact({ ...base, compactedAt: 1_000_500 }).go).toBe(false)
    expect(shouldAutoCompact({ ...base, lastRequestAt: null }).go).toBe(false)
  })
})

describe('formatting', () => {
  test('matches the screenshot figures', async () => {
    expect(formatTokens(656_000)).toBe('656k')
    expect(formatTokens(1_000_000)).toBe('1M')
    expect(formatRemaining(40 * 60_000)).toBe('40m')
    expect(formatRemaining(30_000)).toBe('30s')
    expect(formatRemaining(0)).toBe('expired')
    expect(bar(0.66, 20)).toEqual({ filled: 13, empty: 7 })
    expect(
      hitPercent({ input_tokens: 10, cache_read_input_tokens: 990, cache_creation_input_tokens: 0 }),
    ).toBe(99)
  })
})
