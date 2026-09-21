import { sdk } from '../sdk'
import { configureClient } from './configureClient'
import { createApiKey } from './create-api-key'
import { createInvitation } from './create-invitation'
import { resetAddress } from './reset-address'
import { resetClient } from './reset-client'
import { revokeApiKey } from './revoke-api-key'
import { viewAddress } from './view-address'

export const actions = sdk.Actions.of()
  .addAction(configureClient)
  .addAction(createApiKey)
  .addAction(revokeApiKey)
  .addAction(createInvitation)
  .addAction(viewAddress)
  .addAction(resetClient)
  .addAction(resetAddress)
