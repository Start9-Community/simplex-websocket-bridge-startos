import { utils } from '@start9labs/start-sdk'
import { credentialsJson } from '../fileModels/credentials.json'
import { sdk } from '../sdk'

export const initializeService = sdk.setupOnInit(async (effects) => {
  const apiKey = await credentialsJson.read((c) => c.apiKey).const(effects)
  if (!apiKey) {
    await credentialsJson.merge(
      effects,
      { apiKey: utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 32 }) },
      { allowWriteAfterConst: true },
    )
  }
})
