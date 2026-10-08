import { CC } from '@simplex-chat/types'
import { sdk } from '../sdk'
import { withBotSession } from '../bot-client'
import { connLinkMembers, detailsResult } from '../utils'
import { i18n } from '../i18n'

/**
 * Show the client's long-lived SimpleX address — a reusable connection link.
 * Unlike a one-time invitation (see Create Invitation), the same address can be
 * shared with any number of contacts.
 *
 * Flow in one WebSocket session:
 *   1. /user           → the active user's id
 *   2. /_show_address  → the current address, if one exists
 *   3. /_address       → create one if step 2 found none, then use that
 *
 * See:
 *   https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/COMMANDS.md#apishowmyaddress
 *   https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/COMMANDS.md#apicreatemyaddress
 */
export const viewAddress = sdk.Action.withoutInput(
  'view-address',
  async () => ({
    name: i18n('View SimpleX Address'),
    description: i18n(
      'Show the long-lived SimpleX address for this client — a reusable connection link. Unlike a one-time invitation, the same address works for any number of contacts.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('General'),
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

        // Show the existing address, or create one if there isn't any yet.
        const showEnv = await send(CC.APIShowMyAddress.cmdString({ userId }))
        if (showEnv.resp?.type === 'userContactLink') {
          return showEnv.resp.contactLink.connLinkContact
        }
        const createEnv = await send(
          CC.APICreateMyAddress.cmdString({ userId }),
        )
        if (createEnv.resp?.type !== 'userContactLinkCreated') {
          throw new Error(
            `Bot refused to create an address. resp.type=${createEnv.resp?.type}\n\n${JSON.stringify(createEnv.resp, null, 2).slice(0, 1200)}`,
          )
        }
        return createEnv.resp.connLinkContact
      })
    } catch (err) {
      return detailsResult(
        i18n('Could Not Reach Bot'),
        i18n(
          'The SimpleX client could not complete this request. The details are below.',
        ),
        (err as Error).message,
      )
    }

    const members = connLinkMembers(link)
    if (members.length === 0) {
      return detailsResult(
        i18n('No Address Returned'),
        i18n(
          'The SimpleX client answered without a link. Its response is below.',
        ),
        JSON.stringify(link, null, 2).slice(0, 2048),
      )
    }

    return {
      version: '1',
      title: i18n('SimpleX Address'),
      message: i18n(
        'Share this address so others can request to connect. It is reusable — the same link works for any number of contacts. To accept requests automatically, enable Auto-Accept Contact Requests in Configure Client.',
      ),
      result: { type: 'group', value: members },
    }
  },
)
