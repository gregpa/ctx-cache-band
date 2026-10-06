import { expect, test } from 'claude-code/testing'

test('band draws cache + ctx and a Compact button on terminal and desktop', async ($, on) => {
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 656_000, window: 1_000_000, percent: 66 },
      rateLimits: [],
      cost: { usd: 0 },
    },
  }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'ctx-cache-band',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120 },
    })
    expect(await ui.find({ type: 'Text', text: /cache/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /ctx/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /656k/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /66%/ })).toBeDefined()
    expect(await ui.find({ key: 'compact' })).toBeDefined()
    await ui.unmount()
  }
})
