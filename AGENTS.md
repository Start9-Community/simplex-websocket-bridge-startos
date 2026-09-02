# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The `ws` interface id and the `websocket` health-check id are a dependent-facing contract.** Consumers require `websocket` in a `kind: 'running'` dependency; a daemon's own `ready` is not addressable that way, which is why the standalone check duplicates it. Treat both ids as a small API and update consumers if you rename either. It gates on the `sync-settings` one-shot and on the relay selection having landed — keep both, or a dependent can connect while the client is still on the public presets.
- **File exchange rides a SINGLE `/data` mount — don't add a second one.** Everything lives under `/data/.simplex`: the profile DB and `store.json`, plus `files` (received), `tmp`, and `outbound` (consumer-written). Keeping them siblings on one filesystem is load-bearing — simplex-chat moves completed downloads tmp→files with an atomic rename that `EXDEV`-fails across separate bind mounts. The paths are pinned via env in `serverConfig.ts` so the contract doesn't drift with the image's `$HOME` defaults. Consumers mount the subpaths they need (`.simplex/files` ro, `.simplex/outbound` rw) at any path they like.
- **Bearer auth lives on the binding (`addSsl.auth`), read reactively**, so the API Keys action takes effect with no restart. Same-box dependents dial the container bridge IP and bypass the proxy entirely — never assume a token gates them.
- **`manageProfile: false` covers the profile and nothing else.** Relays are StartOS's in both modes. Don't add profile writes to hands-off — two writers on one profile is the whole reason the mode exists.
- **Never pass relays as container env.** simplex-chat INSERTs an env `--server` into `protocol_servers`, which is unique on `(user_id, host, port)` and not on fingerprint, so a relay already stored under an older fingerprint aborts startup outright — reinstalling a SimpleX Server produces exactly that. Apply the selection over the operator-servers API instead, which replaces those rows.
- **Actions drive the running bot over its WebSocket control protocol**, not a shell: `bot-client.ts` opens `ws://<container-ip>:5225` and speaks newline-delimited JSON-RPC.
- **Resetting the client lets SimpleX reuse low, sequential contact ids.** A consumer that keys state by id can alias a new contact onto an old one's session history and allow-list membership — keep that warning on the action.
