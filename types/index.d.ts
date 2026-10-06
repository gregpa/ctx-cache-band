/** Epoch ms; null before the first main-loop response or compaction. */
export type CtxCacheStamp = number | null

declare module 'claude-code' {
  interface PluginState {
    'ctx-cache-band': {
      lastRequestAt: CtxCacheStamp
      hitPercent: number | null
      now: number
      isTurnRunning: boolean
      compactedAt: CtxCacheStamp
    }
  }
}
