import { FileHelper, T, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/**
 * Persisted SimpleX client settings.
 *
 * Written by the "Configure Client" action and read by:
 *   - main.ts, to compute the container's start environment (display name,
 *     peer type, SMP/XFTP relays, received-file retention); and
 *   - the live WebSocket sync, to reconcile the running profile and address
 *     settings (full name, image, auto-accept, business mode, welcome message)
 *     that the image can't seed from env.
 *
 * The action is intended to run *before* first start, so this file may not
 * exist yet — callers use `readClientSettings`, which falls back to
 * SETTINGS_DEFAULTS. Every field also has a `.catch(...)` so a partial or older
 * file still parses into a complete, valid object rather than throwing.
 */

export type ServerMode = 'public' | 'local' | 'custom'

export type ClientSettings = {
  /**
   * When true (default), StartOS manages the profile/address over the WebSocket
   * and applies relays authoritatively over the API. When false the operator's
   * own application owns the client: StartOS makes no WebSocket writes and only
   * applies relays + file cleanup via container env at start (hands-off mode).
   */
  manageProfile: boolean
  displayName: string
  fullName: string
  /** Base64 data URL (e.g. "data:image/jpg;base64,...") or "" for none. */
  image: string
  peerType: 'bot' | 'human'
  /** Auto-accept incoming contact requests on the bot's address. */
  autoAcceptContacts: boolean
  businessMode: boolean
  /** Auto-reply sent to new contacts; "" = none. */
  welcomeMessage: string
  servers: {
    mode: ServerMode
    /** Full SMP relay URIs (custom mode). */
    smp: string[]
    /** Full XFTP relay URIs (custom mode). */
    xftp: string[]
  }
  /** Delete received files older than N days; null = never. */
  cleanupDays: number | null
}

// Shared defaults. The display-name default matches the Docker image
// (PROFILE_DISPLAY_NAME) so a bare install produces the same identity whether
// or not the user opens the action first.
export const SETTINGS_DEFAULTS: ClientSettings = {
  manageProfile: true,
  displayName: 'SimpleX Bot',
  fullName: '',
  image: '',
  peerType: 'bot',
  autoAcceptContacts: true,
  businessMode: false,
  welcomeMessage: '',
  servers: { mode: 'public', smp: [], xftp: [] },
  cleanupDays: null,
}

const serversShape = z
  .looseObject({
    mode: z.enum(['public', 'local', 'custom']).catch('public'),
    smp: z.array(z.string()).catch([]),
    xftp: z.array(z.string()).catch([]),
  })
  .catch(SETTINGS_DEFAULTS.servers)

const shape = z.looseObject({
  manageProfile: z.boolean().catch(true),
  displayName: z.string().min(1).catch(SETTINGS_DEFAULTS.displayName),
  fullName: z.string().catch(''),
  image: z.string().catch(''),
  peerType: z.enum(['bot', 'human']).catch('bot'),
  autoAcceptContacts: z.boolean().catch(true),
  businessMode: z.boolean().catch(false),
  welcomeMessage: z.string().catch(''),
  servers: serversShape,
  cleanupDays: z.number().int().nonnegative().nullable().catch(null),
})

export const clientSettingsJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: '/client-settings.json' },
  shape,
)

/**
 * Read the settings file, falling back to defaults when it doesn't exist yet
 * (fresh install, before the Configure action has ever been submitted). The
 * per-field `.catch(...)` guarantees a complete object once the file is present.
 *
 * Deliberately a NON-reactive `.once()` read. `main` reads settings through
 * this to compute the container's start env; a reactive `.const()` would
 * re-run `main` (restarting the whole service) every time the Configure action
 * writes the file — even for a display-name change that we want to apply live
 * over the WebSocket. Relay/retention changes trigger a restart explicitly from
 * the action instead. (`effects` is kept for signature symmetry / future use.)
 */
export async function readClientSettings(
  _effects: T.Effects,
): Promise<ClientSettings> {
  const stored = await clientSettingsJson.read((c) => c).once()
  return stored ?? SETTINGS_DEFAULTS
}
