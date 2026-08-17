# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **The `ws` interface id and the `websocket` health-check id are a dependent-facing contract.** Consumers require `websocket` in a `kind: 'running'` dependency; a daemon's own `ready` is not addressable that way, which is why the standalone check duplicates it. Treat both ids as a small API and update consumers if you rename either.
- **File exchange rides a SINGLE `/data` mount — don't add a second one.** Everything lives under `/data/.simplex`: the profile DB and `store.json`, plus `files` (received), `tmp`, and `outbound` (consumer-written). Keeping them siblings on one filesystem is load-bearing — simplex-chat moves completed downloads tmp→files with an atomic rename that `EXDEV`-fails across separate bind mounts. The paths are pinned via env in `serverConfig.ts` so the contract doesn't drift with the image's `$HOME` defaults. Consumers mount the subpaths they need (`.simplex/files` ro, `.simplex/outbound` rw) at any path they like.
- **Bearer auth lives on the binding (`addSsl.auth`), read reactively**, so the API Keys action takes effect with no restart. Same-box dependents dial the container bridge IP and bypass the proxy entirely — never assume a token gates them.
- **`manageProfile: false` means make no WebSocket writes at all.** In hands-off mode the operator's own application owns the client — relays and cleanup go in via env and nothing else is touched. Adding a "harmless" sync there makes two writers on one profile.
- **Actions drive the running bot over its WebSocket control protocol**, not a shell: `bot-client.ts` opens `ws://<container-ip>:5225` and speaks newline-delimited JSON-RPC.
- **Resetting the client lets SimpleX reuse low, sequential contact ids.** A consumer that keys state by id can alias a new contact onto an old one's session history and allow-list membership — keep that warning on the action.
