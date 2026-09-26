# Ask Codex to install Jev

Open Codex in the coding project you want Jev to read, and paste this:

```text
Install branch jev-coding-codex-tools from
https://github.com/hernanpappa/jev-in-codex for the current project, following
its docs/INSTALL.md. Set up dependencies, the local Codex plugin (including its
bundled lifecycle hooks), MCP connection, and bundled skill. Add
docs/AGENTS.jev.md guidance to my project's persistent Codex instructions,
preserving existing instructions and configuration. Verify all four MCP tools
and the hook configuration; ask me to review/trust the hooks through Codex's
normal flow, never bypass hook trust. Select JEV_PROVIDER=vercel with
AI_GATEWAY_API_KEY, or the default TypeSafe route with TYPESAFE_API_KEY. Configure
only the selected authentication privately; keep checkpoint transcript/excerpt
evaluation local by default even if an API key is configured. Do not enable
JEV_ALLOW_CHECKPOINT_EGRESS unless I explicitly authorize sending conversation
excerpts through the selected route. Report provider_route and method, and tell
me if you need a private API-key entry, hook trust, or a Codex restart.
```

The agent handles the setup; you supply the selected provider's key privately
when ready. Without that key, ranking uses a labeled local fallback. A Codex
subscription does not supply either provider key. Vercel AI Gateway routes
requests to TypeSafe's Jev model; it does not replace the model provider.

## Installer guidance for the agent

This repository is a **plugin source**, not a marketplace. Do not run
`codex plugin marketplace add teempai/jev-in-codex` and assume it is installable:
there is currently no marketplace catalog in this repository.

1. Inspect the checkout and prerequisites. Use a durable, user-writable local
   installation folder outside the coding project. Do not replace another
   installation or change the user's Node installation without checking it.
   Clone the requested branch, then use `npm ci --ignore-scripts`, `npm run check`,
   `npm run build`, and `node dist/index.js --help`.
2. Put the checkout at `plugins/jev-in-codex` beneath a dedicated local
   marketplace root. Create `.agents/plugins/marketplace.json` beneath that
   root with a unique marketplace name and the entry below. If using an existing
   marketplace, preserve its entries and use the host's plugin-authoring helpers
   when available.
3. In this **local checkout's** `.mcp.json`, add or update the `jev` server
   entry under `mcpServers` (the source file may contain an empty object). Use
   the resolved absolute Node executable. Set its arguments to the absolute
   `dist/index.js` path followed by `--root` and the absolute coding-project
   path. Set `env_vars` to `JEV_PROVIDER`, `TYPESAFE_API_KEY`,
   `AI_GATEWAY_API_KEY`, `JEV_MODEL`, and
   `JEV_ALLOW_CHECKPOINT_EGRESS`; leave the last variable unset unless the user
   separately authorizes remote transcript scoring. Set `tool_timeout_sec` to
   90. These machine-specific paths belong in the local
   installation, not an upstream commit. This avoids requiring `npm link` or
   relying on a desktop application's PATH. Keep the checkout at that location:
   the installed manifest will reference its built server and dependencies.
4. Check `codex plugin marketplace --help` and `codex plugin add --help` for
   the installed Codex version. Register the local marketplace root, then install
   `jev-in-codex@<marketplace-name>`. Do not also register the same MCP server
   separately or copy the bundled skill a second time. The plugin bundles
   `PreCompact` and `SessionStart(source=compact)` hooks; installing it does not
   automatically trust them. Ask the user to inspect and trust the exact hooks
   through Codex's `/hooks` flow. Never bypass that review.
5. Install persistent usage guidance using the section below. Preserve existing
   project instructions, and avoid duplicate Jev sections on repeated installs.
6. Verify the plugin appears in `codex plugin list`. In a new session, verify
   an MCP handshake and all four tools: `jev_select_capability`, `jev_search`,
   `jev_triage`, and `jev_create_checkpoint`. Check a checkpoint using synthetic
   conversation text and confirm it reports local ranking and makes no provider
   request. Inspect `/hooks` for both lifecycle events and verify that the user
   has reviewed/trusted them. Plugin listing alone does not prove the server or
   hooks run. If tools become available only in a new session, say so and finish
   that check there.
7. Give the user private instructions for setting the selected key in the
   environment
   that launches Codex. Never ask for it in chat, print it, or write its value
   into the repository or marketplace files. A desktop app may need a different
   environment setup than a terminal. A key enables remote scoring for the
   existing selection, search, and triage tools, but does not authorize sending
   conversation checkpoints. Only set `JEV_ALLOW_CHECKPOINT_EGRESS=true` after
   the user explicitly approves that separate data flow to the selected route.
   Set the same `JEV_PROVIDER` and selected key in the hooks' environment;
   MCP `env_vars` alone does not configure hooks. Start a new Codex thread after
   installation; relaunch the application if its environment changed.

A minimal catalog for a **new dedicated local marketplace** is:

```json
{
  "name": "jev-local",
  "interface": { "displayName": "Jev local" },
  "plugins": [{
    "name": "jev-in-codex",
    "source": { "source": "local", "path": "./plugins/jev-in-codex" },
    "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
    "category": "Productivity"
  }]
}
```

Register and install using the real local root and selected marketplace name:

```bash
codex plugin marketplace add /absolute/path/to/local-marketplace-root
codex plugin add jev-in-codex@jev-local
codex plugin list
```

Use the [official plugin documentation](https://developers.openai.com/plugins/build/plugins)
for host-specific behavior. CLI command syntax was checked against Codex 0.154.0;
installation through the desktop UI has not been verified. If the user's host
cannot install local plugins, use the README's direct MCP configuration and
companion skill as a fallback, and describe it accurately as that installation
method: the manual `jev_create_checkpoint` tool is available, but MCP alone does
not install the plugin's automatic lifecycle hooks.

## Persistent Codex instructions

Merge [docs/AGENTS.jev.md](AGENTS.jev.md) into the coding project's root
`AGENTS.md`. This is the configurable project instruction layer Codex loads for
future work; it does not replace the built-in system prompt. The bundled
`jev-assist` skill supplies the detailed workflow, while the project instructions
make the intended usage explicit.

Read existing instructions first. If a nonempty `AGENTS.override.md` supplies the
root instructions, merge into that active file instead. Preserve all unrelated
content and the existing instruction hierarchy; avoid adding a second identical
section. Do not write to global instructions or change other projects unless the
user requests that scope. On removal, remove only the Jev section added by this
installation.

The installed guidance tells Codex when to select capabilities, search context,
triage output, or create a manual context checkpoint; when normal tools are
sufficient; and how to interpret scores, fallback, coverage, and untrusted
evidence. It also explains that trusted hooks save a bounded local checkpoint
before native compaction and restore it afterward. Do not claim Jev controls a
context-percentage/message-count threshold, add a blanket requirement to call
Jev on every turn, or change tool approval policies.

In a new session, ask Codex to summarize the active Jev guidance as well as
checking tool availability. If the instructions are not loaded, inspect overrides
and instruction discovery before claiming setup is complete. See the
[official AGENTS.md documentation](https://developers.openai.com/codex/guides/agents-md).

## After installation

Start a new thread and ask:

> Summarize when your project instructions tell you to use Jev, then confirm
> its four tools are available. Use jev_select_capability with a
> small synthetic catalog to check whether ranking is using Jev or local fallback,
> then use jev_create_checkpoint with synthetic history and verify that it stays local.

A key-free check should report `method: local_fallback` and the configured
`provider_route`. After configuring a working key, a synthetic authenticated
check should report `method: jev`; failures may still produce explicit fallback.
The repository's simulated tests prove request routing and response handling,
not that either real account is authorized. With both keys present, verify the
selected `provider_route` and that no request reaches the other destination.
Do not use private source or logs for the first test.

Only enable Jev for a project whose selected contents may be sent directly to
TypeSafe, or through Vercel AI Gateway to TypeSafe when that route is selected.
The filename denylist does not detect secrets embedded in ordinary files.
The MCP still runs locally; no Vercel deployment or deployment token is needed.
Get a local-use AI Gateway key from the
[Vercel AI Gateway dashboard](https://vercel.com/docs/ai-gateway/authentication-and-byok).
Do not assume zero retention, no training, or a fixed price for either route;
review current provider terms and [Jev's gateway listing](https://vercel.com/ai-gateway/models/jev).

To remove the plugin, use `codex plugin remove jev-in-codex@jev-local` (substitute
your marketplace name). Remove a dedicated marketplace only if nothing else uses
it. Review the installation folder before deleting it; do not delete the coding
project or unrelated configuration.
