import { sdk } from '../sdk'
import { i18n } from '../i18n'
import {
  clientSettingsJson,
  readClientSettings,
  ClientSettings,
} from '../fileModels/clientSettings.json'
import { syncClientSettings, configureServers } from '../liveSync'
import { resolveServerUris } from '../serverConfig'
import { pastedImageToAvatarDataUrl } from '../avatar'

const { InputSpec, Value, Variants } = sdk

/**
 * Configure Client — the single pre-flight + live editor for the
 * bridge's SimpleX identity and relays. Replaces the old "Configure Bot
 * Profile" action.
 *
 * Meant to be run BEFORE first start (allowedStatuses: 'any'): it writes a
 * settings file that main.ts reads to build the container's start env. When
 * the service is already running, submitting also reconciles the live profile
 * and address settings over the WebSocket API (see liveSync.ts), so most edits
 * take effect immediately.
 *
 * Env-seeded, first-start-only fields (display name, peer type) and relay /
 * retention settings are applied by re-reading the settings file on the next
 * start; the form notes which changes need a restart.
 */

const customServersSpec = InputSpec.of({
  smp: Value.textarea({
    name: i18n('SMP relay URIs'),
    description: i18n(
      'One SMP server address per line, e.g. smp://<fingerprint>@host. These REPLACE the public preset servers.',
    ),
    required: false,
    default: null,
    placeholder: 'smp://<fingerprint>@host',
    minLength: null,
    maxLength: null,
    patterns: [],
  }),
  xftp: Value.textarea({
    name: i18n('XFTP relay URIs'),
    description: i18n(
      'One XFTP server address per line, e.g. xftp://<fingerprint>@host. These REPLACE the public preset servers.',
    ),
    required: false,
    default: null,
    placeholder: 'xftp://<fingerprint>@host',
    minLength: null,
    maxLength: null,
    patterns: [],
  }),
})

// The profile/address fields StartOS manages over the WebSocket. Grouped under
// a union so they hide entirely when the operator's own application owns the
// profile (hands-off mode).
const managedProfileSpec = InputSpec.of({
  displayName: Value.text({
    name: i18n('Display Name'),
    description: i18n('The name peers see when they connect to your client.'),
    required: true,
    default: 'SimpleX Bot',
    masked: false,
    placeholder: 'SimpleX Bot',
    minLength: 1,
    maxLength: 64,
    patterns: [],
    inputmode: 'text',
  }),
  fullName: Value.text({
    name: i18n('Full Name'),
    description: i18n('Optional longer name shown alongside the display name.'),
    required: false,
    default: null,
    masked: false,
    placeholder: null,
    minLength: null,
    maxLength: 128,
    patterns: [],
    inputmode: 'text',
  }),
  image: Value.textarea({
    name: i18n('Profile Picture'),
    description: i18n(
      'Set a profile picture from an image URL (http/https), a data URL, or base64. Any size — it is cropped to a square and shrunk to fit the SimpleX avatar size limit. Leave empty to remove the picture.',
    ),
    required: false,
    default: null,
    placeholder: 'https://example.com/avatar.png',
    minLength: null,
    maxLength: null,
    patterns: [],
  }),
  peerType: Value.select({
    name: i18n('Peer Type'),
    description: i18n(
      'Bot marks the profile as a SimpleX bot so peer apps show command menus. Human presents as a regular user. Cosmetic — file and message transfer work either way.',
    ),
    default: 'bot',
    values: { bot: i18n('Bot'), human: i18n('Human') },
  }),
  autoAcceptContacts: Value.toggle({
    name: i18n('Auto-Accept Contact Requests'),
    description: i18n(
      'Automatically accept incoming contact requests to the client address.',
    ),
    default: true,
  }),
  businessMode: Value.toggle({
    name: i18n('Business Mode'),
    description: i18n(
      'Present the address as a business address (each contact becomes a group with the business, enabling multiple agents).',
    ),
    default: false,
  }),
  welcomeMessage: Value.textarea({
    name: i18n('Welcome Message'),
    description: i18n(
      'Optional auto-reply sent to each new contact when they connect.',
    ),
    required: false,
    default: null,
    placeholder: null,
    minLength: null,
    maxLength: 2000,
    patterns: [],
  }),
})

const inputSpec = InputSpec.of({
  profile: Value.union({
    name: i18n('SimpleX Profile'),
    description: i18n(
      'Choose whether StartOS manages the client profile — display name, picture, and the other chat settings below — or leaves it to your own application. Message relays and file cleanup are managed by StartOS in either mode.',
    ),
    default: 'managed',
    variants: Variants.of({
      managed: { name: i18n('Managed by StartOS'), spec: managedProfileSpec },
      unmanaged: {
        name: i18n('Managed by my application'),
        spec: InputSpec.of({}),
      },
    }),
  }),
  servers: Value.union({
    name: i18n('Message Relays (SMP/XFTP)'),
    description: i18n(
      'Which servers relay your messages and files. Applied immediately (no restart) and only to NEW connections — existing contacts and your current address keep using the server they were created on. Use Reset SimpleX Address to move your address onto the new relays.',
    ),
    default: 'public',
    variants: Variants.of({
      public: {
        name: i18n('SimpleX defaults (public)'),
        spec: InputSpec.of({}),
      },
      local: {
        name: i18n('My self-hosted SimpleX Server'),
        spec: InputSpec.of({}),
      },
      custom: { name: i18n('Custom'), spec: customServersSpec },
    }),
  }),
  cleanupDays: Value.number({
    name: i18n('Cleanup Received Files After (days)'),
    description: i18n(
      'Delete received files older than this many days. Leave empty to keep files forever.',
    ),
    required: false,
    default: null,
    min: 1,
    max: 3650,
    integer: true,
    units: i18n('days'),
    placeholder: i18n('never'),
  }),
})

/** Split a textarea of whitespace/newline-separated URIs into a clean array. */
function splitUris(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export const configureClient = sdk.Action.withInput(
  'configure-client',
  async () => ({
    name: i18n('Configure Client'),
    description: i18n(
      'Set the client display name, profile, contact-request handling, message relays, and file retention. Run this before starting the service for the first time.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('General'),
    visibility: 'enabled',
  }),
  inputSpec,
  // getInput — prefill from the saved settings, or code defaults on a fresh
  // install where the file doesn't exist yet.
  async ({ effects }) => {
    const s = await readClientSettings(effects)
    // Prefill the stored avatar so it's visible/editable: leaving it unchanged
    // keeps it, emptying it removes it, replacing it re-processes (see run()).
    const profileValue = {
      displayName: s.displayName,
      fullName: s.fullName || null,
      image: s.image || null,
      peerType: s.peerType,
      autoAcceptContacts: s.autoAcceptContacts,
      businessMode: s.businessMode,
      welcomeMessage: s.welcomeMessage || null,
    }
    return {
      // When unmanaged, carry the stored profile in `other` so switching back
      // to Managed in the form restores it instead of showing defaults.
      profile: s.manageProfile
        ? { selection: 'managed' as const, value: profileValue }
        : {
            selection: 'unmanaged' as const,
            value: {},
            other: { managed: profileValue },
          },
      servers:
        s.servers.mode === 'custom'
          ? {
              selection: 'custom' as const,
              value: {
                smp: s.servers.smp.join('\n') || null,
                xftp: s.servers.xftp.join('\n') || null,
              },
            }
          : s.servers.mode === 'local'
            ? { selection: 'local' as const, value: {} }
            : { selection: 'public' as const, value: {} },
      cleanupDays: s.cleanupDays,
    }
  },
  async ({ effects, input }) => {
    // Read what was saved before: needed to tell which kind of change this is,
    // and to retain the stored profile/avatar when the operator's app owns it.
    const previous = await readClientSettings(effects)
    const manageProfile = input.profile.selection === 'managed'

    // Profile fields: from the form when StartOS-managed; otherwise keep what's
    // stored (the app owns the live profile, and we never touch it over the WS).
    let displayName = previous.displayName
    let fullName = previous.fullName
    let image = previous.image
    let peerType = previous.peerType
    let autoAcceptContacts = previous.autoAcceptContacts
    let businessMode = previous.businessMode
    let welcomeMessage = previous.welcomeMessage

    if (input.profile.selection === 'managed') {
      const p = input.profile.value
      // Avatar: prefilled with the stored data URL, so an unchanged value is
      // kept as-is, an emptied value removes it, and a new URL/data-URL/base64
      // is cropped to a square and shrunk.
      const pasted = p.image?.trim() ?? ''
      if (pasted === '') {
        image = ''
      } else if (pasted !== previous.image) {
        try {
          image = await pastedImageToAvatarDataUrl(pasted)
        } catch (err) {
          return {
            version: '1',
            title: i18n('Could Not Process Image'),
            message: i18n(
              'The profile picture could not be processed: ',
            ).concat((err as Error).message),
            result: null,
          }
        }
      }
      displayName = p.displayName
      fullName = p.fullName?.trim() || ''
      peerType = p.peerType
      autoAcceptContacts = p.autoAcceptContacts
      businessMode = p.businessMode
      welcomeMessage = p.welcomeMessage?.trim() || ''
    }

    const servers: ClientSettings['servers'] =
      input.servers.selection === 'custom'
        ? {
            mode: 'custom',
            smp: splitUris(input.servers.value.smp),
            xftp: splitUris(input.servers.value.xftp),
          }
        : {
            mode: input.servers.selection as 'public' | 'local',
            smp: [],
            xftp: [],
          }

    const settings: ClientSettings = {
      manageProfile,
      displayName,
      fullName,
      image,
      peerType,
      autoAcceptContacts,
      businessMode,
      welcomeMessage,
      servers,
      cleanupDays: input.cleanupDays ?? null,
    }

    await clientSettingsJson.write(effects, settings)

    // On success return null (no modal).

    // If the client is stopped (the pre-first-start case), everything applies
    // on the next start — nothing to do live.
    const status = await sdk.getStatus(effects).once()
    const running = !!status?.started
    if (!running) return null

    const relaysChanged =
      previous.servers.mode !== settings.servers.mode ||
      previous.servers.smp.join(' ') !== settings.servers.smp.join(' ') ||
      previous.servers.xftp.join(' ') !== settings.servers.xftp.join(' ')
    const retentionChanged = previous.cleanupDays !== settings.cleanupDays
    const manageChanged = previous.manageProfile !== manageProfile

    // Retention is container env (the janitor reads it at launch) and toggling
    // the mode changes what the post-ready one-shot reconciles, so both need a
    // restart; the one-shot then re-applies everything.
    if (retentionChanged || manageChanged) {
      await effects.restart()
      return null
    }

    // Everything else applies live over the WebSocket — no restart, no downtime
    // for dependents. Relays in either mode, profile/address only when StartOS
    // manages it. A rejected relay config surfaces here so it's diagnosable
    // immediately.
    try {
      if (relaysChanged) {
        await configureServers(
          effects,
          await resolveServerUris(effects, settings),
        )
      }
      if (manageProfile) await syncClientSettings(effects, settings)
    } catch (err) {
      return {
        version: '1',
        title: i18n('Saved, But Live Update Failed'),
        message: i18n(
          'Settings were saved, but applying them to the running client failed: ',
        ).concat((err as Error).message),
        result: null,
      }
    }

    return null
  },
)
