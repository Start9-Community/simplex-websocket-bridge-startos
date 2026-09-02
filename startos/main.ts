import { chmod, mkdir } from 'node:fs/promises'
import { sdk } from './sdk'
import { OUTBOUND_MODE, port, mainMounts } from './utils'
import { i18n } from './i18n'
import { readClientSettings } from './fileModels/clientSettings.json'
import { computeStartEnv } from './serverConfig'
import { syncClientSettings, configureServers } from './liveSync'
import { waitForBotReady } from './bot-client'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting SimpleX Websocket Bridge!'))

  // Consumers stage outgoing files here as their own uid — see OUTBOUND_MODE.
  // mkdir's mode is umask-masked, so pin `.simplex` explicitly and set
  // outbound's mode with chmod.
  await mkdir(sdk.volumes.main.subpath('.simplex'), {
    recursive: true,
    mode: 0o700,
  })
  const outboundDir = sdk.volumes.main.subpath('.simplex/outbound')
  await mkdir(outboundDir, { recursive: true })
  await chmod(outboundDir, OUTBOUND_MODE)

  const settings = await readClientSettings(effects)
  const { env, servers } = await computeStartEnv(effects, settings)

  // A selection that never lands leaves the client on SimpleX's public presets.
  let relaysPending = settings.servers.mode !== 'public'

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
    .addOneshot('sync-settings', {
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
            if (servers) {
              await configureServers(effects, servers)
              relaysPending = false
            }
            if (settings.manageProfile)
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
    // Standalone health check with a stable ID ('websocket') that dependent
    // packages can reference in a `kind: 'running'` dependency requirement.
    // Part of the file exchange contract (see README). Requiring the sync is
    // what keeps a dependent from connecting ahead of the relay selection.
    .addHealthCheck('websocket', {
      ready: {
        display: i18n('Websocket'),
        fn: () =>
          relaysPending
            ? {
                result: 'failure',
                message: i18n(
                  'The selected message relays could not be applied, so the client would fall back to SimpleX public relays. Check that the SimpleX Server dependency is installed and running.',
                ),
              }
            : sdk.healthCheck.checkPortListening(effects, port, {
                successMessage: i18n('Websocket is ready'),
                errorMessage: i18n('Websocket is not ready'),
              }),
      },
      requires: ['simplex', 'sync-settings'],
    })

  return daemons
})
