# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `simplex-websocket-bridge`.** It runs a headless SimpleX Chat client and exposes the SimpleX network over a token-authenticated WebSocket API (interface id `ws` on host `main`, port 5225). Bearer auth is enforced at the StartOS reverse proxy via `addSsl.auth`; same-box dependents and this package's own actions bypass the proxy by dialing the container bridge IP directly.
- **The `websocket` standalone health check and the `ws` interface are a dependent-facing contract** (see README's file-exchange section). Dependents reference the `websocket` id in a `kind: 'running'` requirement — treat both ids as a small API and update consumers if you rename them.
- **File exchange is a SINGLE `/simplex` mount, not one per subdir.** `utils.ts` re-mounts the `main` volume's `.simplex/media` subpath at `/simplex` (exposing `/simplex/inbound`, `/simplex/tmp`, `/simplex/outbound`) as one mount, because simplex-chat moves completed downloads temp→files with an atomic rename that `EXDEV`-fails across separate bind mounts. Don't split it.
- **Actions drive the running bot over its WebSocket control protocol**, not a shell — `bot-client.ts` opens `ws://<container-ip>:5225` and speaks newline-delimited JSON-RPC (`create-invitation`, `configure`).

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach simplex-websocket-bridge -n simplex-sub -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — here `simplex-sub`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".
