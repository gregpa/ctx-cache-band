import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import {
  bar,
  cacheRemainingMs,
  fillColor,
  formatRemaining,
  formatTokens,
  hitPercent,
  shouldAutoCompact,
} from './logic'

const lastRequestAt = atom({ plugin: 'ctx-cache-band', key: 'lastRequestAt' } as const, null)
const hit = atom({ plugin: 'ctx-cache-band', key: 'hitPercent' } as const, null)
const now = atom({ plugin: 'ctx-cache-band', key: 'now' } as const, 0)
const isTurnRunning = atom({ plugin: 'ctx-cache-band', key: 'isTurnRunning' } as const, false)
const compactedAt = atom({ plugin: 'ctx-cache-band', key: 'compactedAt' } as const, null)

const TICK_MS = 15_000
const DOTS = 18
const CTX_CELLS = 20

export const register: Register = (on, options) => {
  const ttlMs = (options.cacheTtlMinutes === '5' ? 5 : 60) * 60_000
  const leadMs = Math.min(Number(options.compactLeadMinutes ?? 3) * 60_000, ttlMs - TICK_MS)
  const minTokens = Number(options.minCompactTokens ?? 150_000)
  const isAutoCompact = options.autoCompact !== false
  let isCompacting = false

  on('session.start', async ($, e, next) => {
    await update($, now, () => Date.now())
    $.clock.every(TICK_MS, () => {
      void (async () => {
        const t = await $.clock.now()
        await update($, now, () => t)
        if (!isAutoCompact || isCompacting) return
        const { context } = await $.session.usage()
        const decision = shouldAutoCompact({
          now: t,
          lastRequestAt: await read($, lastRequestAt),
          compactedAt: await read($, compactedAt),
          isTurnRunning: await read($, isTurnRunning),
          contextTokens: context.tokens,
          ttlMs,
          leadMs,
          minTokens,
        })
        if (!decision.go) return
        isCompacting = true
        try {
          $.ui.toast(`Cache expires soon; compacting ${formatTokens(context.tokens ?? 0)} context while it is warm`)
          const result = await $.session.compact()
          if ('skip' in result) {
            $.ui.toast(`Auto-compact skipped: ${result.skip}`)
          } else if (result.usage) {
            const pct = hitPercent(result.usage)
            $.ui.toast(`Compacted. Summarizer cache hit: ${pct ?? '?'}%`, { timeoutMs: 8000 })
          }
        } catch {
          // A turn started between the check and the call; the next idle window retries.
        } finally {
          isCompacting = false
        }
      })()
    })

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, isTurnRunning, () => true)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const t = await $.clock.now()
    await update($, isTurnRunning, () => false)
    if (e.usage) {
      const pct = hitPercent(e.usage)
      await update($, lastRequestAt, () => t)
      await update($, hit, () => pct)
    }
    await update($, now, () => t)
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (e.trigger !== 'precompute' && e.agentId === undefined && !('skip' in result)) {
      const t = await $.clock.now()
      await update($, compactedAt, () => t)
      await update($, now, () => t)
    }
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const t = (await read($, now)) || Date.now()
    const last = await read($, lastRequestAt)
    const pct = await read($, hit)
    const { context } = await $.session.usage()

    const remaining = last === null ? null : cacheRemainingMs(t, last, ttlMs)
    const left = remaining === null ? 0 : remaining / ttlMs
    const dots = bar(left, DOTS)
    const cacheColor = remaining === null ? 'gray' : fillColor(1 - left)

    const used = context.tokens === undefined ? null : context.tokens / context.window
    const ctx = bar(used ?? 0, CTX_CELLS)
    const ctxColor = used === null ? 'gray' : fillColor(used)

    return (
      <Box flexDirection="row">
        <Text color={cacheColor}>● </Text>
        <Text dimColor>cache </Text>
        <Text color={cacheColor} bold>
          {remaining === null ? '—' : formatRemaining(remaining)}{' '}
        </Text>
        <Text color={cacheColor}>{'●'.repeat(dots.filled)}</Text>
        <Text dimColor>{'·'.repeat(dots.empty)} </Text>
        <Text>{pct === null ? '—' : `${pct}%`} hit </Text>
        <Text dimColor>│ ctx </Text>
        <Text color={ctxColor} bold>
          {context.tokens === undefined ? '—' : formatTokens(context.tokens)}
        </Text>
        <Text dimColor> / {formatTokens(context.window)} </Text>
        <Text color={ctxColor}>{'█'.repeat(ctx.filled)}</Text>
        <Text dimColor>{'░'.repeat(ctx.empty)} </Text>
        <Text>{context.percent === undefined ? '—' : `${context.percent}%`} </Text>
        <Button
          key="compact"
          label="Compact"
          onPress={async () => {
            if (await read($, isTurnRunning)) {
              $.ui.toast('Compact runs between turns; try again when this one ends')
              return
            }
            try {
              await $.session.compact()
            } catch {
              $.ui.toast('Compact refused while a turn runs')
            }
          }}
        />
      </Box>
    )
  })
}
