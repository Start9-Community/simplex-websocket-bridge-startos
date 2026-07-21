# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (architecture, for developers and LLMs) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **Package id is `simplex-websocket-bridge`.** It runs a headless SimpleX Chat client and exposes the SimpleX network over a token-authenticated WebSocket API (interface id `ws` on host `main`, port 5225). Bearer auth is enforced at the StartOS reverse proxy via `addSsl.auth`; same-box dependents and this package's own actions bypass the proxy by dialing the container bridge IP directly.
- **The `websocket` standalone health check and the `ws` interface are a dependent-facing contract** (see README's file-exchange section). Dependents reference the `websocket` id in a `kind: 'running'` requirement — treat both ids as a small API and update consumers if you rename them.
- **File exchange rides a SINGLE `/data` mount — don't add a second one.** `utils.ts` mounts the whole `main` volume at `/data`; everything SimpleX lives under `/data/.simplex` — the profile DB and `store.json`, plus `files` (received), `tmp`, and `outbound` (consumer-written). Keeping them siblings on one filesystem is load-bearing: simplex-chat moves completed downloads tmp→files with an atomic rename that `EXDEV`-fails across separate bind mounts. The paths are pinned via env in `serverConfig.ts` so the contract doesn't drift with the image's `$HOME` defaults. Consumers mount the subpaths they need (`.simplex/files` ro, `.simplex/outbound` rw) via `mountDependency` at any path they like.
- **Actions drive the running bot over its WebSocket control protocol**, not a shell — `bot-client.ts` opens `ws://<container-ip>:5225` and speaks newline-delimited JSON-RPC (`configure-client`, `create-invitation`, `view-address`, `reset-address`, `reset-client`).

## Inspecting a running install

To run a command inside the service's container (read its generated config, grep app logs), use `start-cli package attach simplex-websocket-bridge -n simplex-sub -- <cmd>`. Select the subcontainer by **name** with `-n` (the name passed to `SubContainer.of` in `main.ts` — here `simplex-sub`) or by image with `-i`. Note: `-s/--subcontainer` matches the internal **Guid**, not the name, so passing a name to `-s` fails with "no matching subcontainers".
