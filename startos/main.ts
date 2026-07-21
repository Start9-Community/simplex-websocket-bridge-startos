import { sdk } from './sdk'
import { port, mainMounts } from './utils'
import { i18n } from './i18n'
import { readClientSettings } from './fileModels/clientSettings.json'
import { computeStartEnv } from './serverConfig'
import { syncClientSettings, configureServers } from './liveSync'
import { waitForBotReady } from './bot-client'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting SimpleX Websocket Bridge!'))

  // Compute the container's start environment from the saved client settings
  // (or code defaults on a fresh install). Seeds the profile on first start and,
  // in hands-off mode, applies relays via env. Throws (failing start) if the
  // settings ask for something unresolvable — e.g. Local relays when the
  // SimpleX Server dependency isn't reachable — rather than silently using
  // public presets.
  const settings = await readClientSettings(effects)
  const env = await computeStartEnv(effects, settings)

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'simplex' },
    mainMounts,
    'simplex-sub',
  )

  const daemons = sdk.Daemons.of(effects)
    .addDaemon('simplex', {
      subcontainer,
      exec: {
        command: sdk.useEntrypoint(),
        env,
      },
      ready: {
        display: null, // surfaced to users (and dependents) via the 'websocket' health check below
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, port, {
            successMessage: i18n('Websocket is ready'),
            errorMessage: i18n('Websocket is not ready'),
          }),
      },
      requires: [],
    })
    // Standalone health check with a stable ID ('websocket') that dependent
    // packages can reference in a `kind: 'running'` dependency requirement.
    // Part of the file exchange contract (see README).
    .addHealthCheck('websocket', {
      ready: {
        display: i18n('Websocket'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, port, {
            successMessage: i18n('Websocket is ready'),
            errorMessage: i18n('Websocket is not ready'),
          }),
      },
      requires: ['simplex'],
    })

  // In hands-off mode the operator's own application owns the client, so we make
  // no WebSocket writes — relays went in via env above, and there's nothing to
  // sync. Only in managed mode do we reconcile relays + profile/address over the
  // WS once the socket is reachable.
  if (!settings.manageProfile) return daemons

  return daemons.addOneshot('sync-settings', {
    subcontainer,
    exec: {
      fn: async () => {
        try {
          // The daemon `requires` gate orders launch, not socket readiness,
          // so wait for the WebSocket to actually answer before syncing —
          // otherwise the first connect races websocat's bind (ECONNREFUSED).
          await waitForBotReady(effects)
          // Apply the selected relays first (authoritative over the DB —
          // sets custom/local, resets public), then reconcile the profile.
          await configureServers(effects, settings)
          await syncClientSettings(effects, settings)
          console.info(i18n('SimpleX client settings synced'))
        } catch (err) {
          console.warn(
            i18n('Could not sync SimpleX client settings: ').concat(
              (err as Error).message,
            ),
          )
        }
        return null
      },
    },
    requires: ['simplex'],
  })
})
