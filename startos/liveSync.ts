import { T } from '@start9labs/start-sdk'
import { CC, T as SX } from '@simplex-chat/types'
import { withBotSession, Envelope } from './bot-client'
import { ClientSettings } from './fileModels/clientSettings.json'
import { ResolvedServerUris } from './serverConfig'

/**
 * Reconcile a running bot's live profile and address settings with the
 * persisted client settings, over a single WebSocket session.
 *
 * The Docker image can only seed display name and peer type from env, and only
 * on first start. Everything else — full name, avatar, business mode, and the
 * address's auto-accept / welcome-message settings — must be applied to the
 * running client over its control API. This runs both at start (a post-ready
 * one-shot in main.ts) and immediately on a Configure submit when the service
 * is already up.
 *
 * Mirrors the openclaw-simplex plugin's ensureProfile/ensureAddress: read the
 * live values first and only write when they've drifted, so a restart with
 * unchanged settings makes no interactive network calls.
 *
 * Command/response reference:
 *   https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/COMMANDS.md
 */

export interface SyncResult {
  profileUpdated: boolean
  addressCreated: boolean
  addressSettingsUpdated: boolean
}

function activeUser(env: Envelope): { userId: number; profile: SX.Profile } {
  if (env.resp?.type !== 'activeUser') {
    throw new Error(
      `Bot did not return an active user (resp.type=${env.resp?.type}). It may not be fully started yet.`,
    )
  }
  return { userId: env.resp.user.userId, profile: env.resp.user.profile }
}

/**
 * Host of a relay whose TLS identity no longer matches the one pinned in the
 * address it hosts, which is what reinstalling a SimpleX Server produces.
 * Changing the relay selection does not re-home an address that already exists.
 */
function staleRelayHost(err: SX.ChatError): string | undefined {
  if (err.type !== 'errorAgent') return undefined
  const { agentError } = err
  if (agentError.type !== 'BROKER') return undefined
  const { brokerErr } = agentError
  if (brokerErr.type !== 'NETWORK') return undefined
  if (brokerErr.networkError.type !== 'unknownCAError') return undefined
  // Drop the pinned fingerprint; the host is the part worth reporting.
  return agentError.brokerAddress.split('@').pop() || agentError.brokerAddress
}

function assertNotCmdError(env: Envelope, what: string): void {
  if (env.resp?.type !== 'chatCmdError') return

  const host = staleRelayHost(env.resp.chatError)
  if (host) {
    throw new Error(
      `Bot refused ${what}: the relay at ${host} is not the one this address was created against. Reinstalling a SimpleX Server regenerates its TLS identity, and changing the relay selection does not move an existing address — run "Reset SimpleX Address" to recreate it on the current relays.`,
    )
  }

  throw new Error(
    `Bot refused ${what}: ${JSON.stringify(env.resp).slice(0, 800)}`,
  )
}

/** Plain text of a welcome message (stored as MsgContent), or '' if none. */
function welcomeText(mc: SX.MsgContent | undefined): string {
  if (mc && 'text' in mc && typeof mc.text === 'string') return mc.text
  return ''
}

// --- Relay (SMP/XFTP) configuration over the v6 operator-servers API ---
//
// SimpleX v6 groups servers by "operator". `/_servers <userId>` (GET) returns a
// `userServers` array: one entry per preset operator (e.g. SimpleX Chat, whose
// preset servers can be individually enabled/disabled) plus, if the user added
// their own, one operator-less entry holding custom servers. `/_servers
// <userId> <json>` (SET, APISetUserServers) writes it back.
//
// This is why dropping the `--server` flag never reverts to public: the flag
// persisted a state with the preset servers disabled and a custom server
// enabled. To switch relays we GET, minimally mutate, and SET the SAME
// structure back — per protocol: use custom => disable that operator's preset
// servers and (re)place the custom entry; use presets => enable them and drop
// the custom entry. Round-tripping the structure (only flipping enabled/deleted
// and swapping custom server rows) keeps every operator field the server
// expects intact.

interface ServerRow {
  serverId?: number
  server: string
  preset?: boolean
  enabled: boolean
  deleted: boolean
  roles?: Record<string, boolean>
}
interface ServerGroup {
  operator?: unknown
  smpServers: ServerRow[]
  xftpServers: ServerRow[]
  chatRelays?: unknown[]
}

function applyProtocol(
  groups: ServerGroup[],
  key: 'smpServers' | 'xftpServers',
  uris: string[],
): void {
  const useCustom = uris.length > 0
  for (const g of groups) {
    const rows = g[key] ?? []
    if (g.operator) {
      // Preset operator servers: enabled only when using presets for this proto.
      for (const s of rows) if (!s.deleted) s.enabled = !useCustom
    } else {
      // Existing custom rows: remove (keep serverId so the server deletes them).
      for (const s of rows) {
        s.enabled = false
        s.deleted = true
      }
    }
    g[key] = rows
  }
  if (useCustom) {
    let custom = groups.find((g) => !g.operator)
    if (!custom) {
      custom = { smpServers: [], xftpServers: [], chatRelays: [] }
      groups.push(custom)
    }
    for (const server of uris) {
      custom[key].push({
        server,
        preset: false,
        enabled: true,
        deleted: false,
        roles: {},
      })
    }
  }
}

/**
 * Apply already-resolved SMP/XFTP relays to the running client over the WS API,
 * making the chat database — not the removed `--server` env — authoritative.
 * Sets custom/local servers and resets to the public presets, per protocol.
 *
 * Takes the URIs rather than resolving them so the caller owns when the
 * SimpleX Server's address is read — see computeStartEnv.
 *
 * Runs only on (re)start (the post-ready one-shot in main.ts) and on the
 * Configure action when relays change (which applies live — no restart).
 */
export async function configureServers(
  effects: T.Effects,
  servers: ResolvedServerUris,
): Promise<void> {
  const { smp, xftp } = servers
  await withBotSession(effects, async (send) => {
    const { userId } = activeUser(await send('/user'))

    const getEnv = await send(`/_servers ${userId}`)
    assertNotCmdError(getEnv, 'reading server configuration')
    // `userServers` isn't in the bots-subset ChatResponse union, so read the
    // envelope through a loose shape.
    const resp = getEnv.resp as unknown as
      { type?: string; userServers?: ServerGroup[] } | undefined
    if (resp?.type !== 'userServers' || !Array.isArray(resp.userServers)) {
      throw new Error(`Unexpected response reading servers: ${resp?.type}`)
    }
    const userServers = resp.userServers

    applyProtocol(userServers, 'smpServers', smp)
    applyProtocol(userServers, 'xftpServers', xftp)

    assertNotCmdError(
      await send(`/_servers ${userId} ${JSON.stringify(userServers)}`),
      'server configuration',
    )
  })
}

export async function syncClientSettings(
  effects: T.Effects,
  settings: ClientSettings,
): Promise<SyncResult> {
  return withBotSession(effects, async (send) => {
    const result: SyncResult = {
      profileUpdated: false,
      addressCreated: false,
      addressSettingsUpdated: false,
    }

    // ---- Profile (display name, full name, avatar, peer type) ----
    const { userId, profile } = activeUser(await send('/user'))

    const desiredImage = settings.image.trim() || undefined
    const desiredPeerType = settings.peerType as SX.ChatPeerType
    const profileDrifted =
      (profile.displayName ?? '') !== settings.displayName ||
      (profile.fullName ?? '') !== settings.fullName ||
      (profile.image ?? undefined) !== desiredImage ||
      (profile.peerType ?? 'bot') !== desiredPeerType

    if (profileDrifted) {
      // Apply edits on top of the live profile so preferences (e.g. file
      // sharing) and any fields we don't manage ride through untouched.
      const newProfile: SX.Profile = {
        ...profile,
        displayName: settings.displayName,
        fullName: settings.fullName,
        image: desiredImage,
        peerType: desiredPeerType,
      }
      const env = await send(
        CC.APIUpdateProfile.cmdString({ userId, profile: newProfile }),
      )
      assertNotCmdError(env, 'profile update')
      if (env.resp?.type !== 'userProfileNoChange') result.profileUpdated = true
    }

    // ---- Address (create if missing) + settings (auto-accept, business, welcome) ----
    let showEnv = await send(CC.APIShowMyAddress.cmdString({ userId }))
    if (showEnv.resp?.type !== 'userContactLink') {
      // No address yet — create one, then re-read it.
      const created = await send(CC.APICreateMyAddress.cmdString({ userId }))
      assertNotCmdError(created, 'address creation')
      result.addressCreated = true
      showEnv = await send(CC.APIShowMyAddress.cmdString({ userId }))
    }

    if (showEnv.resp?.type === 'userContactLink') {
      const current = showEnv.resp.contactLink.addressSettings
      const desired: SX.AddressSettings = {
        businessAddress: settings.businessMode,
        // Auto-accept present => accept incoming requests (non-incognito).
        // Absent => manual acceptance.
        autoAccept: settings.autoAcceptContacts
          ? { acceptIncognito: false }
          : undefined,
        autoReply: settings.welcomeMessage.trim()
          ? { type: 'text', text: settings.welcomeMessage.trim() }
          : undefined,
      }

      const drifted =
        (current.businessAddress ?? false) !== desired.businessAddress ||
        !!current.autoAccept !== !!desired.autoAccept ||
        welcomeText(current.autoReply) !== welcomeText(desired.autoReply)

      if (drifted) {
        const env = await send(
          CC.APISetAddressSettings.cmdString({ userId, settings: desired }),
        )
        assertNotCmdError(env, 'address settings update')
        result.addressSettingsUpdated = true
      }
    }

    return result
  })
}
