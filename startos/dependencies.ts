import { sdk } from './sdk'
import { clientSettingsJson } from './fileModels/clientSettings.json'
import { SIMPLEX_SERVER_PACKAGE_ID } from './serverConfig'

const simplexServer = sdk.Dependency.optional(SIMPLEX_SERVER_PACKAGE_ID, {
  description: {
    en_US:
      'Optional: relay your messages and files through your own self-hosted SimpleX Server instead of the public servers. Select "My self-hosted SimpleX Server" in the Configure Client action.',
  },
  metadata: {
    title: 'SimpleX Server',
    icon: 'https://raw.githubusercontent.com/Start9Labs/simplex-startos/master/icon.svg',
  },
  versionRange: '*',
  kind: 'running',
  healthChecks: [],
  enabled: async ({ effects }) =>
    (await clientSettingsJson.read((c) => c.servers.mode).const(effects)) ===
    'local',
})

export const dependencies = sdk.Dependencies.of().addDependency(simplexServer)
