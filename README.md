<p align="center">
  <img src="icon.svg" alt="SimpleX Websocket Bridge Logo" width="21%">
</p>

# SimpleX Websocket Bridge on StartOS

> **Upstream repo:** <https://github.com/simplex-chat/simplex-chat>

SimpleX Websocket Bridge runs the [SimpleX Chat](https://simplex.chat) client headless and exposes the SimpleX messaging network over a token-authenticated **Websocket API**, so bots, AI agents, scripts, and other StartOS services can send and receive SimpleX messages and files programmatically.

**It is not a human chat app.** There is no inbox to read or compose in — it is the machine-to-SimpleX on-ramp that your own software drives. For chatting by hand, use the SimpleX mobile or desktop apps. [SimpleX](https://simplex.chat) is the first messenger with no user identifiers — not even random numbers — and is fully open source, end-to-end encrypted, and metadata-resistant by design.

The bundled client is driven over its Websocket using the upstream [SimpleX bot/chat protocol](https://github.com/simplex-chat/simplex-chat/blob/stable/bots/README.md). [OpenClaw](https://github.com/Start9-Community/openclaw-startos) is an example consumer, using the bridge as an AI agent's SimpleX channel.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property      | Value                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- |
| Image         | `lundog/simplex-websocket-bridge` (built from `lundog/simplex-websocket-bridge-docker`) |
| Architectures | x86_64, aarch64                                                                         |
| Command       | Image entrypoint — supervises `simplex-chat` and `websocat`                             |

The image entrypoint starts `simplex-chat` in headless server/bot mode on a localhost-only control port, then runs [`websocat`](https://github.com/vi/websocat) as a bridge from a container-wide port to that control port so traffic from outside the container can reach it. The supervisor exits if either child dies, so StartOS restarts the container rather than leaving a half-running service.

---

## Volume and Data Layout

| Volume | Mount Point | Purpose                                                                        |
| ------ | ----------- | ------------------------------------------------------------------------------ |
| `main` | `/data`     | HOME — the `.simplex` profile database and file dirs, plus `store.json` (keys) |

The SimpleX client's own database is the source of truth for chat state — identity/keys, contacts, and chat history. Two small JSON files at the volume root hold package-level config: `client-settings.json` (the client configuration StartOS applies — display name, profile, message relays, received-file retention, and whether StartOS manages the profile at all) and `store.json` (the bridge's API keys). All SimpleX file dirs live under `/data/.simplex` — `files` (received, `--files-folder`), `tmp` (`--temp-folder`), and `outbound` (consumer-written) — as siblings on one filesystem, so simplex-chat's atomic `tmp` → `files` rename can't fail with `EXDEV`. The package pins `SIMPLEX_INBOUND_DIR`/`SIMPLEX_TMP_DIR` to these paths at start (rather than relying on the image defaults), so the file-exchange contract stays stable even if the image changes `$HOME` or its own defaults.

### File exchange contract (for consumer packages)

The Websocket carries only a small inline preview for image/video messages — actual file bytes (documents, voice, full-resolution media) live on disk. So other StartOS packages exchange files with the bridge by mounting subpaths of this package's `main` volume via dependency mounts (`mountDependency`), declared as an **optional** dependency so it stays opt-in. The two directions are handled differently:

| Direction | Volume subpath      | Consumer mounts at          | Access     | Purpose                                         |
| --------- | ------------------- | --------------------------- | ---------- | ----------------------------------------------- |
| Inbound   | `.simplex/files`    | _any path_ (its own choice) | read-only  | Files received by the bridge (`--files-folder`) |
| Outbound  | `.simplex/outbound` | _any path_ (its own choice) | read-write | Consumer-written files for the bridge to send   |

Both directions mount a subpath at whatever path the consumer likes — the bridge exposes no special/neutral mountpoint of its own (its files all sit under the single `/data` mount at `/data/.simplex/{files,outbound}`).

**Inbound** is loose: the Websocket API reports a received file by _name only_, which the consumer resolves against its own view of the `files` dir — so the two sides only need to share that one host directory.

**Outbound**: on send the consumer passes a file path that simplex-chat resolves inside _this_ container, so it must be valid here — namely `/data/.simplex/outbound/...`. The consumer stages the file into its own mount of the `.simplex/outbound` subpath, then rewrites the directory prefix to the bridge's path before sending. The openclaw-simplex plugin does this automatically via `connection.outboundFolder` (its mount) + `connection.outboundFolderOnClient` (`/data/.simplex/outbound`), so no shared or verbatim mountpoint is needed. `outbound` is not renamed across filesystems, so it needs no co-location with `tmp`.

**Ownership and permissions.** This container runs as **root**, so everything it creates under `.simplex` is root-owned. A consumer, however, writes staged files as _its own_ uid — the `openclaw` package, for instance, runs OpenClaw as `node` (uid 1000). A root-owned `outbound` dir is therefore unwritable for it and every send fails with `EACCES`. Because the bridge can't know a consumer's uid (and there may be several), it creates `outbound` **world-writable with the sticky bit** (`1777`, as on `/tmp`) rather than chowning to a guess; sticky means each consumer can delete only the files it staged. Consumers need no `chown` of their own, and should not assume they can perform one.

The mode is re-asserted each time _this package_ starts, so an install predating it heals on upgrade with no migration. A consumer restart doesn't re-assert it, so an `outbound` recreated underneath a running bridge (a restore that drops it, a manual cleanup) keeps its creation mode until the bridge next starts.

`.simplex` itself is created `0700`: only root, inside this container, ever traverses it. That costs consumers nothing — a dependency mount of `.simplex/files` or `.simplex/outbound` is resolved by StartOS when it sets the mount up, and the consumer then reaches it through a path in its own namespace that never crosses `.simplex`.

Inbound needs no equivalent treatment: it's mounted read-only and simplex-chat writes received files world-readable, so a non-root consumer can read them under the root-owned dir.

**These paths are set explicitly, not inherited.** `serverConfig.ts` (`computeStartEnv`) passes `SIMPLEX_INBOUND_DIR=/data/.simplex/files` and `SIMPLEX_TMP_DIR=/data/.simplex/tmp` into the container. Do not drop them and fall back to the image's defaults: those defaults have moved before (through image 6.5.4 they were `/simplex`; 6.5.5 changed them to `$HOME/.simplex/{files,tmp}`). A bridge writing outside `/data/.simplex` breaks this contract silently — consumers see an empty `files` dir and no error is raised anywhere.

**Security:** consumers mount only the `.simplex/files` and `.simplex/outbound` subpaths — never the whole `main` volume, `.simplex/` itself, or the profile database and keys it holds. `files` is read-only so consumers can't alter received files; write access is limited to `outbound`, and only a package that declares this dependency and mounts the subpath can reach it at all. Note that `1777` is not isolation _between_ consumers: the sticky bit stops them deleting each other's staged files, not reading them or adding their own. Two consumers that need to be isolated from each other can each create and mount their own subdirectory of `outbound`.

---

## Installation and First-Run Flow

1. On install, the bridge seeds **one API key** so outside access is gated from first start; copy it from the **API Keys** action.
2. On first start, the bundled client auto-creates a fresh SimpleX profile (marked as a bot by default).
3. Copy the Websocket URL from **Interfaces → Websocket**, point a client at it with the API key as a bearer token, and drive it with the SimpleX bot/chat protocol. To hand a contact a connection link, run the **Create SimpleX Invitation** action.

---

## Configuration Management

Client settings are saved to `client-settings.json` by the **Configure Client** action and applied two ways depending on the field.

- **Profile management mode** — by default StartOS manages the SimpleX profile and address (below). Setting the Configure Client "SimpleX Profile" option to _Managed by my application_ switches to a hands-off transport: StartOS makes **no** WebSocket writes, and message relays + received-file cleanup are applied via container env at start. Your own application (over the Websocket) owns the profile, address, and any runtime server changes. Useful for driving the bridge from a non-OpenClaw app that manages its own identity.
- **Profile & address** (display name, full name, picture, peer type, auto-accept contact requests, business mode, welcome message) — in managed mode, pushed to the running client live over the Websocket, no restart. Run the action before first start to seed the identity.
- **Message relays** (public / self-hosted SimpleX Server / custom SMP+XFTP) — in managed mode, applied live over the client's API on save, no restart. SimpleX persists the relay choice in its database and only uses the public presets when none are set, so switching back to public actively resets to the presets rather than relying on removing a flag. Relays are re-applied on every (re)start so the database stays authoritative. In hands-off mode relays are set via container env instead (set-once: `--server` persists in the DB, so reverting to public is then the app's responsibility).
- **Received-file retention** — a container/janitor setting read at launch, so changing it saves and then restarts the service.
- **API keys** — stored in `store.json` and managed via the **API Keys** action. Editing keys re-binds the reverse proxy's accepted-token set with no restart.

---

## Network Access and Interfaces

| Interface | Port | Protocol | Purpose                                          |
| --------- | ---- | -------- | ------------------------------------------------ |
| Websocket | 5225 | ws/wss   | Control API for driving SimpleX programmatically |

**Access methods:**

- LAN IP with unique port
- `<hostname>.local` with unique port
- Tor `.onion` address (opt-in — install Tor and provision an onion for the interface)

**Authentication:** outside access is gated by a **bearer token** enforced at the StartOS reverse proxy — a request without a valid `Authorization: Bearer <token>` gets `401` before reaching the container. Same-box StartOS dependents (and this package's own actions) connect directly to the container's bridge IP, which does not traverse the proxy, so they need no token.

---

## Actions (StartOS UI)

| Action                        | Group       | Purpose                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Configure Client**          | General     | Set the client identity and behavior — display name, full name, picture, peer type, auto-accept contact requests, business mode, welcome message, message relays (public / self-hosted / custom), and received-file retention. Run before first start. Profile, address, and relay edits apply live; a received-file-retention change restarts the service. |
| **Create SimpleX Invitation** | General     | Drive the running client to mint a fresh one-time SimpleX invitation link (with QR). One redemption per link.                                                                                                                                                                                                                                               |
| **View SimpleX Address**      | General     | Show the client's long-lived, reusable SimpleX address (with QR), creating one if it doesn't exist yet. Unlike an invitation, the same address works for any number of contacts.                                                                                                                                                                            |
| **API Keys**                  | General     | Manage the bearer tokens that gate outside access — add a labeled key per client, delete to revoke.                                                                                                                                                                                                                                                         |
| **Reset Client**              | Danger Zone | Wipe the SimpleX identity, contacts, and chat history. Service must be stopped. API keys are preserved. Contacts must reconnect afterward; if used with OpenClaw, purge the channel's per-contact state first (SimpleX reuses low contact ids).                                                                                                             |
| **Reset SimpleX Address**     | Danger Zone | Replace the long-lived address with a new one (runs live, no stop needed). The old address link stops working; existing contacts are unaffected.                                                                                                                                                                                                            |

---

## Backups and Restore

**Included in backup:**

- `main` volume (SimpleX profile and identity, contacts, chat history, received/outbound files, and API keys)

**Restore behavior:** the volume is fully restored before the service starts, bringing the bridge back with its original identity and history.

### Updates are one-way when simplex-chat migrates its database

simplex-chat upgrades its own database in place on first start after a bundled-version bump, and those migrations are **not reversible**: the previous simplex-chat refuses to start against a migrated database. Verified for 0.3.0 → 7.0.0 (simplex-chat v6.5.6 → v7.0.0).

So **back up the service before updating**. Rolling back means uninstalling, reinstalling the older package version, and restoring that backup — a downgrade in place will not work, and `migrations.down` is `IMPOSSIBLE` rather than pretending otherwise.

simplex-chat does leave pre-migration snapshots beside the live files:

```
.simplex/simplex_v1_agent.db.bak
.simplex/simplex_v1_chat.db.bak
```

Restoring those by hand (service stopped, copy each `.bak` over its live file) is a last resort if no backup exists. It discards **everything since the upgrade** — every message, contact change, and file received — and it depends on an upstream convention this package does not control, so a StartOS backup is always the better path.

### Consumers see a stale mount after a reinstall

A dependency mount resolves to a directory when it is set up and keeps that reference. If this package is **uninstalled and reinstalled**, its volume directory is replaced, and a consumer that was already running keeps its mount pointed at the old, now-orphaned directory — file exchange looks silently empty even though the bridge is writing normally.

**Restart the consuming service** after reinstalling the bridge; it re-establishes the mount against the current directory. A normal package *update* does not have this problem.

---

## Health Checks

| Check     | Method                | Messages                                                        |
| --------- | --------------------- | --------------------------------------------------------------- |
| Websocket | Port listening (5225) | Success: "Websocket is ready" / Error: "Websocket is not ready" |

The standalone health check has the stable ID `websocket`, which dependent packages reference in a `kind: 'running'` dependency requirement.

---

## Dependencies

Optional: **SimpleX Server** (`simplex`).

The bridge has no hard dependencies. It declares one **optional** dependency on the `simplex` package: when you choose **My self-hosted SimpleX Server** for message relays in the Configure Client action, the bridge flips `simplex` to a required running dependency and auto-pulls its SMP and XFTP addresses (full URIs, fingerprint included) from that package's service interfaces — preferring a clearnet domain, then a clearnet IP, then Tor, then `.local`. Public and Custom relays need no dependency.

Other packages may in turn declare an optional dependency on the bridge to consume the Websocket API and the file-exchange contract above (referencing the `websocket` health check).

---

## Limitations and Differences

1. **Headless only** — there is no human-facing chat UI; the bridge is driven entirely over its Websocket API by other software.
2. **Bearer auth suits programmatic clients** — browsers cannot set an `Authorization` header on a Websocket handshake, so the gated interface is intended for server-side clients, scripts, and same-box dependents (which bypass the gate), not in-browser Websocket use.
3. **File bytes require the shared volume** — the Websocket carries only a small inline preview for images/video; transferring real file bytes to or from a consumer package requires the file-exchange volume contract.

---

## What Is Unchanged from Upstream

The bundled `simplex-chat` client behaves exactly as upstream: messages and files relay through SimpleX's default preset public SMP/XFTP servers, end-to-end encryption and the no-user-identifiers model are intact, and the Websocket speaks the upstream SimpleX bot/chat command protocol verbatim.

---

## Quick Reference for AI Consumers

```yaml
package_id: simplex-websocket-bridge
image: lundog/simplex-websocket-bridge
architectures: [x86_64, aarch64]
volumes:
  main: /data
ports:
  ws: 5225
auth: bearer token (Authorization: Bearer <token>); same-box dependents bypass via container bridge IP
file_exchange:
  inbound: mount subpath .simplex/files read-only at any path; WS reports file name only
  outbound: mount subpath .simplex/outbound read-write at any path; pass the bridge path /data/.simplex/outbound/<name> (translate prefix)
  outbound_perms: 1777 (world-writable + sticky, re-asserted on bridge start) so non-root consumers can stage files; no consumer chown needed; not isolation between consumers
health_checks:
  - websocket
dependencies: simplex (optional; required only when relays = self-hosted)
startos_managed_env_vars: PROFILE_DISPLAY_NAME, PROFILE_PEER_TYPE, INBOUND_RETENTION_HOURS (derived from client-settings.json at start; SMP/XFTP relays are applied over the client API on start, not via env)
actions:
  - configure-client
  - create-invitation
  - view-address
  - api-keys
  - reset-client
  - reset-address
```

---

## License

This package's own code is **MIT**. The bundled container image runs
`simplex-chat`, which is **AGPL-3.0-only**, unmodified — so the distributed
package is an aggregate: `SPDX-License-Identifier: MIT AND AGPL-3.0-only`. The
AGPL applies to the simplex-chat component (including the network-use provision,
AGPL §13); its corresponding source is the upstream repository
(<https://github.com/simplex-chat/simplex-chat>) at the version pinned by the
image. The image also bundles `websocat` (MIT).
