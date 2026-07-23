import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'simplex-websocket-bridge',
  title: 'SimpleX Websocket Bridge',
  // The package's own code is MIT; the bundled image ships simplex-chat
  // (AGPL-3.0) unmodified, so the distributed package is an aggregate.
  license: 'MIT AND AGPL-3.0-only',
  packageRepo:
    'https://github.com/Start9-Community/simplex-websocket-bridge-startos',
  upstreamRepo: 'https://github.com/simplex-chat/simplex-chat',
  marketingUrl: 'https://simplex.chat/',
  donationUrl:
    'https://github.com/simplex-chat/simplex-chat#help-us-with-donations',
  description: { short, long },
  volumes: ['main'],
  images: {
    // Consume the standalone container image published from
    // github.com/lundog/simplex-websocket-bridge-docker, rather than building
    // locally. Bump this tag deliberately when the upstream SimpleX version
    // changes. The `-N` suffix is the image revision (a rebuild of the same
    // SimpleX version), which moves independently of SimpleX itself.
    simplex: {
      source: {
        dockerTag: 'lundog/simplex-websocket-bridge:6.5.6',
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  // Declared optional; setupDependencies (dependencies.ts) flips `simplex` to a
  // `running` dependency when the user picks self-hosted (Local) relays in the
  // Configure action. Public and Custom relays need no dependency.
  dependencies: {
    simplex: {
      optional: true,
      description: {
        en_US:
          'Optional: relay your messages and files through your own self-hosted SimpleX Server instead of the public servers. Select "My self-hosted SimpleX Server" in the Configure Client action.',
      },
      metadata: {
        title: 'SimpleX Server',
        icon: 'https://raw.githubusercontent.com/Start9Labs/simplex-startos/master/icon.svg',
      },
    },
  },
})
