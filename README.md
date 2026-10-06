# ctx-cache-band

A Claude Code mod (function-hooks plugin). It draws a band above the prompt:

```
● cache 40m ●●●●●●●●●●●●···· 99% hit │ ctx 656k / 1M █████████████░░░░░░░ 66% [Compact]
```

- **cache**: time left on the prompt cache, counted from the end of your last turn, plus the cache-hit % of that turn.
- **ctx**: tokens in the context window out of the current model's maximum, with a bar and %.
- **Compact**: runs `/compact` (between turns only).
- **Auto-compact** (on by default): compacts once per idle stretch when the cache has 3 minutes or less left and the context is at least 150k tokens. Compacting while the cache is still warm makes the next re-cache a small context instead of the full one. It never compacts after the cache has expired.

The band draws on the terminal and the desktop app. Claude Code does not draw this band on mobile, but auto-compact still runs there.

## Settings (`/config`, or `pluginConfigs.ctx-cache-band` in settings.json)

| Field | Default | |
|---|---|---|
| `cacheTtlMinutes` | `"60"` | `"5"` or `"60"`. Not auto-detected: set it to the TTL your sessions actually use. |
| `autoCompact` | `true` | |
| `compactLeadMinutes` | `3` | |
| `minCompactTokens` | `150000` | |

## Install: every session on a machine (with hot reload)

Clone into `~/.claude/mods/ctx-cache-band` and add to the `env` block of the **user** `~/.claude/settings.json` (a project's settings are never read for this):

```json
"CLAUDE_CODE_PLUGIN_DIRS": "<absolute path to the clone>",
"CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
```

Separate several folders with `;` on Windows and `:` elsewhere. Restart Claude Code. Edits to the clone reload on their own.

## Install: every Claude Code cloud session

In the cloud environment's settings (the environment menu in the session title bar, then **Edit**):

1. **Setup script**: paste the contents of [`scripts/cloud-setup.sh`](scripts/cloud-setup.sh).
2. **Environment variables**:
   ```
   CLAUDE_CODE_PLUGIN_DIRS=/root/.claude/mods/ctx-cache-band
   CLAUDE_CODE_PLUGIN_DIR_WATCH=1
   ```

New sessions pick it up. If this repo is private and the setup script's clone fails, either make the repo public (it holds nothing sensitive) or give the environment access to it.

## Install: as a marketplace plugin (one machine, no hot reload)

```
/plugin install ctx-cache-band --marketplace gregpa/ctx-cache-band
```

## Develop

```
claude plugin validate .
claude plugin test .
```
