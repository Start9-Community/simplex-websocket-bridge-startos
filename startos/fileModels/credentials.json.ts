import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// On the `public` volume, which dependent services mount read-only to read the
// Bearer token the proxy accepts from them.
const shape = z.looseObject({
  apiKey: z.string().optional().catch(undefined),
})

export const credentialsJson = FileHelper.json(
  { base: sdk.volumes.public, subpath: 'credentials.json' },
  shape,
)
