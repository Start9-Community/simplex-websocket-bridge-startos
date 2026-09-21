import { utils } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'

const { InputSpec, Value } = sdk

export const createApiKey = sdk.Action.withInput(
  'create-api-key',
  async () => ({
    name: i18n('Create API Key'),
    description: i18n(
      'Generate a bearer token for an outside client of the Websocket API.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('General'),
    visibility: 'enabled',
  }),
  InputSpec.of({
    label: Value.text({
      name: i18n('Label'),
      description: i18n(
        'A name to identify this key (e.g. the client it belongs to).',
      ),
      required: true,
      default: null,
      placeholder: 'my-bot',
      minLength: 1,
      maxLength: 64,
    }),
  }),
  async () => null,
  async ({ effects, input }) => {
    const label = input.label.trim()
    if (!label) {
      throw new Error(i18n('The label must contain a visible character.'))
    }

    const store = await storeJson.read().once()
    const apiKeys = store?.apiKeys ?? []

    if (apiKeys.some((key) => key.label === label)) {
      throw new Error(i18n('An API key with this label already exists.'))
    }

    const token = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 32,
    })
    await storeJson.merge(effects, {
      apiKeys: [...apiKeys, { label, token }],
    })

    return {
      version: '1',
      title: i18n('API Key Created'),
      message: i18n('Copy this token now. It will not be shown again.'),
      result: {
        type: 'single',
        name: i18n('Token'),
        description: label,
        value: token,
        copyable: true,
        qr: false,
        masked: true,
      },
    }
  },
)
