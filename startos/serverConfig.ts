import { T } from '@start9labs/start-sdk'
import { sdk } from './sdk'
import { ClientSettings } from './fileModels/clientSettings.json'

/**
 * Translate persisted client settings into the container's start environment.
 *
 * The Docker image (lundog/simplex-websocket-bridge) reads these on start:
 *   PROFILE_DISPLAY_NAME / PROFILE_PEER_TYPE — seed the profile on FIRST start
 *       only; afterwards the profile lives in the DB and is edited over the
 *       WebSocket API (see liveSync.ts). Passing them every start is harmless.
 *   INBOUND_RETENTION_HOURS — positive integer; a janitor deletes received
 *       files older than this. Unset = keep forever.
 *
 * Message relays are deliberately NOT passed as env. simplex-chat persists the
 * `--server`/`--xftp-server` values into the per-user chat database, and the
 * built-in presets are only used when the DB has NO configured servers — so
 * once a custom/local server is set via the flag it sticks even after the flag
 * is removed, and dropping the flag never reverts to the public presets. To
 * make the selection authoritative we instead apply it over the WebSocket API
 * on every (re)start — see configureServers in liveSync.ts — which both sets
 * custom/local servers and resets to presets for public.
 *
 * The flag is also unsafe: an env `--server` is INSERTed into `protocol_servers`,
 * unique on (user, host, port) and not on fingerprint, so a relay already in the
 * database under an older fingerprint aborts startup with a UNIQUE constraint
 * failure. Reinstalling a SimpleX Server produces exactly that.
 */

/** StartOS package id of the self-hosted SimpleX Server (Local relays). */
export const SIMPLEX_SERVER_PACKAGE_ID = 'simplex'

// File-exchange directories, pinned by this package rather than left to the
// image defaults. These paths ARE the file-exchange contract that consumer
// packages mount (`.simplex/files` / `.simplex/outbound`; see README), so the
// image changing $HOME or its SIMPLEX_INBOUND_DIR/SIMPLEX_TMP_DIR defaults must
// not move them out from under consumers. Both live under /data (the `main`
// volume) and are co-located so simplex-chat's atomic tmp->files rename can't
// fail with EXDEV.
const SIMPLEX_INBOUND_DIR = '/data/.simplex/files'
const SIMPLEX_TMP_DIR = '/data/.simplex/tmp'

// Host + service-interface IDs the SimpleX Server (simplex) package exports.
// SMP binds on its 'main' host, XFTP on a dedicated 'xftp' host. Each URI
// produced is a full relay address including the server's CA fingerprint and
// basic-auth password (username = "<fingerprint>:<password>", scheme "smp"/
// "xftp"), which is exactly what simplex-chat's --server / --xftp-server want.
// See Start9Labs/simplex-startos startos/interfaces.ts.
const SMP_RELAY = { hostId: 'main', interfaceId: 'smp' } as const
const XFTP_RELAY = { hostId: 'xftp', interfaceId: 'xftp' } as const

// The SimpleX Server publishes its binding before its CA fingerprint exists,
// formatting the address as `smp://undefined:null@host:5223`. Match the
// fingerprint shape so a half-built relay reads as not-ready, not as a relay.
const RELAY_URI = /^[a-z]+:\/\/[A-Za-z0-9_-]{40,}=[:@]/

/**
 * Best available full URI for one exported relay interface.
 *
 * Preference order (issue #3): clearnet domain, then clearnet IP, then Tor
 * onion (exported as a plugin hostname), then .local (mDNS, LAN-only) as a last
 * resort. A contact must be able to reach the SMP relay to deliver messages, so
 * a LAN-only address only works for same-network peers — hence it ranks last.
 */
async function resolveLocalRelayUri(
  effects: T.Effects,
  relay: { hostId: string; interfaceId: string },
): Promise<string> {
  // Resolve inside `map`, never outside it: the default `eq` deep-compares
  // whole host records, and a filled address's lazy `nonLocal`/`public`/
  // `bridge` getters make that recurse until the stack overflows — which
  // const() swallows on the first change, dropping the watch silently.
  //
  // Scan bindings for the interface id rather than pinning a port, so an
  // upstream port change doesn't break resolution.
  const uri = await sdk.host
    .get(
      effects,
      { packageId: SIMPLEX_SERVER_PACKAGE_ID, hostId: relay.hostId },
      (host) => {
        const addressInfo = Object.values(host?.bindings ?? {})
          .map((binding) => binding.interfaces[relay.interfaceId])
          .find(Boolean)?.addressInfo
        if (!addressInfo) return undefined

        // Literal filters so each satisfies the .filter() generic; ordered
        // from most to least universally reachable.
        const tiers = [
          addressInfo.filter({ kind: 'domain', visibility: 'public' }),
          addressInfo.filter({ kind: 'ip', visibility: 'public' }),
          addressInfo.filter({ kind: 'plugin' }),
          addressInfo.filter({ kind: 'mdns' }),
        ]
        for (const tier of tiers) {
          const [url] = tier.format('urlstring')
          if (url && RELAY_URI.test(url)) return url
        }
        return undefined
      },
    )
    .const()

  if (!uri) {
    throw new Error(
      `SimpleX Server did not expose a reachable "${relay.interfaceId}" address (clearnet, Tor, or .local). Make sure the SimpleX Server package is installed and running.`,
    )
  }
  return uri
}

/** Full SMP/XFTP relay URIs for the selected mode, to apply over the WS API. */
export interface ResolvedServerUris {
  smp: string[]
  xftp: string[]
}

/**
 * Resolve the SMP/XFTP relay URIs for the selected server mode. An empty list
 * for a protocol means "use SimpleX's public presets" (the caller issues a
 * reset for that protocol).
 *
 *   public — no custom URIs (reset both protocols to presets).
 *   custom — the user's URIs (each already a full `smp://<fingerprint>@host`
 *            / `xftp://<fingerprint>@host`); an empty side resets to presets.
 *   local  — auto-pull the user's own SimpleX Server SMP/XFTP addresses from
 *            its StartOS service interfaces (full URIs, fingerprint included).
 *            Fails fast if a relay can't be resolved rather than silently
 *            falling back to presets — choosing self-hosted relays is a
 *            deliberate opt-out.
 */
export async function resolveServerUris(
  effects: T.Effects,
  settings: ClientSettings,
): Promise<ResolvedServerUris> {
  const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean)
  const { mode, smp, xftp } = settings.servers

  if (mode === 'custom') return { smp: clean(smp), xftp: clean(xftp) }

  if (mode === 'local') {
    const [smpUri, xftpUri] = await Promise.all([
      resolveLocalRelayUri(effects, SMP_RELAY),
      resolveLocalRelayUri(effects, XFTP_RELAY),
    ])
    return { smp: [smpUri], xftp: [xftpUri] }
  }

  // public
  return { smp: [], xftp: [] }
}

/**
 * Full start environment for the simplex daemon, plus the relays resolved on
 * the way — both modes apply those over the WS once the socket answers, rather
 * than resolving the same addresses a second time.
 */
export async function computeStartEnv(
  effects: T.Effects,
  settings: ClientSettings,
): Promise<{
  env: Record<string, string>
  servers: ResolvedServerUris | null
}> {
  const env: Record<string, string> = {
    PROFILE_DISPLAY_NAME: settings.displayName,
    PROFILE_PEER_TYPE: settings.peerType,
    // Pin the file-exchange dirs so the contract is independent of the image.
    SIMPLEX_INBOUND_DIR,
    SIMPLEX_TMP_DIR,
  }

  // The image's janitor takes hours; the form collects days for a friendlier
  // UX. null / 0 => omit (keep files forever).
  if (settings.cleanupDays && settings.cleanupDays > 0) {
    env.INBOUND_RETENTION_HOURS = String(settings.cleanupDays * 24)
  }

  // Relays are never passed as env, in either mode. simplex-chat inserts an
  // env `--server` into `protocol_servers`, which is unique on (user, host,
  // port) and not on fingerprint — so a relay whose host and port are already
  // in the database under an older fingerprint aborts startup with a UNIQUE
  // constraint failure, exactly what a SimpleX Server reinstall produces. The
  // operator-servers API replaces those rows instead, so both modes apply
  // relays over the WS; see configureServers.
  //
  // The resolve still happens here because this read is what registers the
  // `const` watch on the SimpleX Server's address, and it has to happen in
  // main's body to bind to the service. An unresolvable relay is not fatal in
  // either mode now: the watch re-runs main once the address appears.
  const servers = await resolveServerUris(effects, settings).catch(
    (err: unknown) => {
      console.warn(
        `Relays could not be resolved at start; retrying when the address resolves. ${(err as Error).message}`,
      )
      return null
    },
  )

  return { env, servers }
}
