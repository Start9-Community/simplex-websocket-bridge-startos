import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk
const NONE = ''

export const revokeApiKey = sdk.Action.withInput(
  'revoke-api-key',
  async () => ({
    name: i18n('Revoke API Key'),
    description: i18n('Stop an outside client from using the Websocket API.'),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('General'),
    visibility: 'enabled',
  }),
  InputSpec.of({
    label: Value.dynamicSelect(async () => {
      const apiKeys =
        (await storeJson.read((store) => store.apiKeys).once()) ?? []
      const values = Object.fromEntries(
        apiKeys.map(({ label }) => [label, label]),
      )
      if (apiKeys.length === 0) {
        values[NONE] = i18n('No API keys to revoke')
      }

      return {
        name: i18n('API Key'),
        description: i18n('Select the key to revoke.'),
        default: Object.keys(values)[0]!,
        values,
        disabled: false,
      }
    }),
  }),
  async () => null,
  async ({ effects, input }) => {
    if (input.label === NONE) {
      return {
        version: '1',
        title: i18n('Nothing to Revoke'),
        message: i18n('This service has no API keys.'),
        result: null,
      }
    }

    const apiKeys =
      (await storeJson.read((store) => store.apiKeys).once()) ?? []
    const remaining = apiKeys.filter((key) => key.label !== input.label)
    if (remaining.length === apiKeys.length) {
      throw new Error(i18n('The selected API key no longer exists.'))
    }

    await storeJson.merge(effects, { apiKeys: remaining })

    return {
      version: '1',
      title: i18n('API Key Revoked'),
      message: i18n('The selected key no longer grants access.'),
      result: null,
    }
  },
)
