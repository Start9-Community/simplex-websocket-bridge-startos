<p align="center">
  <img src="icon.png" alt="SimpleX Websocket Bridge Logo" width="21%">
</p>

# SimpleX Websocket Bridge on StartOS

> Everything not listed in this document should behave the same as upstream
> SimpleX Chat. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

This package runs a [SimpleX Chat](https://github.com/simplex-chat/simplex-chat) client as a service and puts a WebSocket in front of it, so another program can hold a SimpleX identity and send and receive messages and files on your behalf. It is infrastructure for a bot, not a chat client for a person.

- **Upstream repo:** <https://github.com/simplex-chat/simplex-chat>
- **Wrapper repo:** <https://github.com/Start9-Community/simplex-websocket-bridge-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, consumed as published.

| Property      | Value                             |
| ------------- | --------------------------------- |
| Image         | `lundog/simplex-websocket-bridge` |
| Architectures | x86_64, aarch64                   |
| Command       | The image's own entrypoint        |

| Subcontainer  | Purpose                                  |
| ------------- | ---------------------------------------- |
| `simplex-sub` | The only daemon — the one to `attach` to |

**The image ships SimpleX Chat unmodified**, which is why the package declares two licences: the packaging is MIT, the bundled application is AGPL, and what is distributed is the aggregate.

**The image tag carries two version numbers.** The leading part is the SimpleX version; the trailing revision is a rebuild of the same SimpleX version, and it moves independently. Bump it deliberately.

## Volume and Data Layout

One volume, and the layout under it is a published contract.

| Volume | Mount Point | Purpose                               |
| ------ | ----------- | ------------------------------------- |
| `main` | `/data`     | The SimpleX profile and file exchange |

| Path                | Written by         | Holds                               |
| ------------------- | ------------------ | ----------------------------------- |
| `.simplex/`         | SimpleX            | The profile database — the identity |
| `.simplex/files`    | SimpleX            | Files received from contacts        |
| `.simplex/tmp`      | SimpleX            | In-flight downloads                 |
| `.simplex/outbound` | Other packages     | Files staged to be sent             |
| `store.json`        | Init and an action | The API keys                        |

**All four directories are siblings on one filesystem on purpose.** SimpleX completes a download by renaming out of its temp directory into its files directory, and a rename across filesystems fails — so splitting them across mounts would break receiving files rather than merely rearranging them. Their paths are pinned by environment rather than left to the image's defaults, so the layout is a contract and not an accident.

**The outbound directory is world-writable with the sticky bit**, like `/tmp`. A consuming package stages files there as its own user, which this package cannot know in advance and which two consumers need not share — so the directory is widened rather than chowned to a guess, and the sticky bit keeps each consumer able to delete only what it staged.

## File Models

Two models, with a clean split of ownership.

| File                  | Format | Modelled                | Written by          |
| --------------------- | ------ | ----------------------- | ------------------- |
| `store.json`          | JSON   | Yes — `FileHelper.json` | Init and the action |
| `clientSettings.json` | JSON   | Yes                     | The action          |

The store holds **the bearer tokens** that gate the WebSocket, each with a label. The settings file holds everything about the client: the display name and profile, whether contact requests are auto-accepted, business mode, a welcome message, the relay selection, and how long received files are kept.

Every field carries a default, so a partial or older file parses into a complete object rather than failing — and the settings file may legitimately not exist yet, since the configuration action is meant to be run **before** the first start.

**How settings are applied depends on who owns the client**, and that is the single most important thing about this package:

- **Managed** — StartOS owns the profile. Relays go in as environment at start, and the profile, address settings, auto-accept and welcome message are reconciled over the WebSocket once the socket answers.
- **Hands-off** — your application owns the client. StartOS makes **no** WebSocket writes at all; only relays and file cleanup are applied, as environment.

Choosing hands-off is what stops this package and your program fighting over the same profile.

## Dependencies

One, optional, and **declared only while it is selected**.

| Dependency     | Required                   | Kind      | Why                       |
| -------------- | -------------------------- | --------- | ------------------------- |
| SimpleX Server | No — only for local relays | `running` | Relaying your own traffic |

Relays can be SimpleX's public ones, your own SimpleX Server on this box, or a custom list. Only the middle option adds a dependency, and it is declared reactively — switching relay modes adds or drops it.

**Choosing local relays without a reachable server fails the start**, deliberately, rather than silently falling back to the public presets. Being quietly moved onto someone else's relays is not an acceptable failure mode for this.

## Network Access and Interfaces

One interface, and it is authenticated.

| Interface | Id   | Type | Port | Description                                  |
| --------- | ---- | ---- | ---- | -------------------------------------------- |
| Websocket | `ws` | api  | 5225 | The API for driving SimpleX programmatically |

**Bearer authentication is applied at the StartOS reverse proxy**, not by the application: an outside client must send a token from the store or receive a 401 before it ever reaches the container. The token set is read reactively, so adding or revoking a key takes effect without a restart.

**Same-box packages bypass that gate**, because they dial the container's bridge address directly and that path does not traverse the proxy. So a dependent service needs no token, and a token is only for something outside the server.

**Anyone with a token can act as your SimpleX identity** — read messages, send messages, and send files. Treat a token as the identity itself.

## Installation and First-Run Flow

Install seeds **one API key**, so the gate is active from the first start and there is a working token to copy. It is seeded only at install and never re-seeded, which is what makes deleting every key a durable way to lock outside access.

**The configuration action is meant to be run before the first start.** Doing so means the profile is created with the name, picture and relays you want, rather than created with defaults and then edited.

The first start creates the SimpleX profile. In managed mode the package then waits for the socket to actually answer before syncing — the daemon ordering gates launch, not readiness, so syncing immediately would race the socket's bind. If that sync fails it is logged and the service keeps running, rather than the failure taking down a working bridge.

## Actions

Six actions, in two groups.

### General

#### Configure Client

Everything about the client: who owns the profile, the display and full name, the profile picture, whether it presents as a bot or a person, auto-accept, business mode, the welcome message, the relay selection, and received-file retention.

- **Runnable at any status**, and intended to be run before the first start.
- **Cost:** the service restarts to apply.
- **The ownership choice is the important field** — see [File Models](#file-models).

#### API Keys

Manages the bearer tokens that gate outside access.

- **What it changes:** the token list, which the interface picks up reactively.
- **Deleting every key locks out all outside access** while leaving same-box dependents working.

#### Create SimpleX Invitation

Produces a one-time invitation link for exactly one new contact.

- **Requires the service to be running.**
- Each run produces a fresh link; they are not interchangeable and not reusable.

#### View SimpleX Address

Shows the client's long-lived address, the one you can publish.

- **Requires the service to be running.**

### Danger Zone

#### Reset SimpleX Address

Replaces the long-lived address with a new one — useful after changing relays, so the address is hosted on the new servers.

- **Requires the service to be running.**
- **Existing contacts are unaffected.** Only the old link stops working, so update anywhere you published it.

#### Reset Client

Deletes the identity, all chats, and all contacts.

- **Only when the service is stopped.** A fresh identity is created on the next start.
- **Irreversible**, and it breaks every existing connection: anyone holding your link can no longer reach this client.
- **It carries a consequence specific to bots, and it is not hypothetical.** SimpleX reuses low, sequential contact ids after a reset, so a brand-new contact can take a former contact's id — and a consuming application that keys state by id would treat them as the old contact, inheriting session history, pairing approval, and allow-list membership. Purge the consumer's state for this channel before letting anyone reconnect.

## Tasks

None. This package raises no tasks, so the service is never held on a prompt and its ordinary controls are always available.

## Health Checks

Two checks over the same port, and the duplication is deliberate.

| Check       | Displayed as | Method                 |
| ----------- | ------------ | ---------------------- |
| `simplex`   | — internal   | Port 5225 is listening |
| `websocket` | "Websocket"  | Port 5225 is listening |

The daemon's own check is hidden; the standalone one is shown. **The standalone check exists because it has a stable id that dependent packages can require** in their dependency declaration — a daemon's own check is not a contract in the same way.

Neither says anything about SimpleX itself. Unreachable relays, a failed message, or a contact who never connects all show a green check.

## Backups and Restore

The `main` volume is copied wholesale — `sdk.setupBackups(['main'])`. That is the profile database, the received files, whatever is staged in the outbound directory, and the API keys.

**The backup is the identity.** Restoring it reproduces the same SimpleX client with the same contacts and the same address — which is what makes it worth having, and what makes it as sensitive as the messages themselves.

**Do not run a restored copy alongside the original.** Two clients claiming one SimpleX identity is not a supported configuration.

## Limitations and Differences

1. **This is a bot bridge, not a chat client.** There is no interface for a human to read messages in.
2. **A bearer token is the identity.** Anyone holding one can send and read as your client.
3. **Same-box packages need no token**, because they bypass the proxy over the bridge.
4. **Managed and hands-off modes are mutually exclusive**; running your own application against a managed profile means two writers.
5. **Local relays fail the start when the server is unreachable**, rather than falling back to public ones.
6. **Reset Client is irreversible** and can strand a consumer's contact state — see the action.
7. **The four file directories must stay siblings** on one filesystem, or receiving files breaks.
8. **The backup reproduces the identity**, so never restore two copies.

---

## Quick Reference for AI Consumers

```yaml
package_id: simplex-websocket-bridge
image: lundog/simplex-websocket-bridge # tag is <simplex-version>-<image-revision>
architectures:
  - x86_64
  - aarch64
subcontainers:
  - simplex-sub
volumes:
  main: /data # .simplex/{,files,tmp,outbound} plus store.json — siblings on one fs
file_models:
  - store.json # apiKeys: [{ label, token }]
  - clientSettings.json # profile, relays, retention, and who owns the client
startos_managed_env_vars: [] # computed per-start from clientSettings; see serverConfig.ts
dependencies:
  - simplex # optional, kind: running, only while relay mode is `local`
interfaces:
  ws: { type: api, port: 5225 } # bearer auth at the OS proxy; bridge callers bypass it
actions:
  - configure-client # run before first start
  - api-keys
  - create-invitation # only-running
  - view-address # only-running
  - reset-address # only-running, Danger Zone
  - reset-client # only-stopped, Danger Zone, irreversible
tasks: []
health_checks:
  - simplex # internal (display: null)
  - websocket # displayed; stable id for dependents to require
```
