import { CC } from '@simplex-chat/types'
import { sdk } from '../sdk'
import { withBotSession } from '../bot-client'
import { connLinkMembers, detailsResult } from '../utils'
import { i18n } from '../i18n'

/**
 * Replace the client's long-lived SimpleX address with a fresh one.
 *
 * Deleting the address invalidates its connection link (new people can no
 * longer use the old link), but existing contacts already have direct
 * connections and are unaffected. Runs live over the WebSocket, so the service
 * stays up — no stop required.
 *
 * Flow in one WebSocket session:
 *   1. /user            → the active user's id
 *   2. /_delete_address → drop the current address (tolerated if none exists)
 *   3. /_address        → create the replacement, and return its link
 *
 * See:
 *   https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/COMMANDS.md#apideletemyaddress
 *   https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/COMMANDS.md#apicreatemyaddress
 */
export const resetAddress = sdk.Action.withoutInput(
  'reset-address',
  async () => ({
    name: i18n('Reset SimpleX Address'),
    description: i18n(
      'Replace the long-lived SimpleX address for this client with a new one — useful after changing message relays, so the address is hosted on the new servers. Existing contacts are unaffected; only the old address link stops working.',
    ),
    warning: i18n(
      'This replaces the SimpleX address for this client with a new one. The old address link will no longer connect anyone to the client, so update anywhere you have shared it. Existing contacts are not affected — they can still chat with the client as before.',
    ),
    allowedStatuses: 'only-running',
    group: i18n('Danger Zone'),
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    let link
    try {
      link = await withBotSession(effects, async (send) => {
        const userEnv = await send('/user')
        if (userEnv.resp?.type !== 'activeUser') {
          throw new Error(
            `Bot did not return an active user. Got: ${JSON.stringify(userEnv.resp).slice(0, 300)}`,
          )
        }
        const userId = userEnv.resp.user.userId

        // Delete the current address. If there isn't one, the bot replies with
        // a command error — tolerated, since the end state (a fresh address) is
        // the same either way.
        await send(CC.APIDeleteMyAddress.cmdString({ userId }))

        const createEnv = await send(
          CC.APICreateMyAddress.cmdString({ userId }),
        )
        if (createEnv.resp?.type !== 'userContactLinkCreated') {
          throw new Error(
            `Bot refused to create the new address. resp.type=${createEnv.resp?.type}\n\n${JSON.stringify(createEnv.resp, null, 2).slice(0, 1200)}`,
          )
        }
        return createEnv.resp.connLinkContact
      })
    } catch (err) {
      return detailsResult(
        i18n('Reset Failed'),
        i18n(
          'The SimpleX client could not complete this request. The details are below.',
        ),
        (err as Error).message,
      )
    }

    return {
      version: '1',
      title: i18n('Address Reset'),
      message: i18n(
        'A new SimpleX address has been created and is shown below. The previous address link no longer works; existing contacts are unaffected.',
      ),
      result: { type: 'group', value: connLinkMembers(link) },
    }
  },
)
