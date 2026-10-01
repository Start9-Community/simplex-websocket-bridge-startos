import { CR } from '@simplex-chat/types'
import { sdk } from '../sdk'
import { withBotSession } from '../bot-client'
import { connLinkMembers } from '../utils'
import { i18n } from '../i18n'

/**
 * Create a fresh one-time SimpleX invitation link by driving the running
 * bot daemon over its WebSocket control protocol.
 *
 * Flow inside one WebSocket session:
 *   1. /user            → discover the active user's userId
 *   2. /_connect <id>   → ask the bot to mint a one-time invitation link
 *
 * The response from /_connect (type: "invitation") includes both a short
 * link (modern clients) and a full link (older clients). We surface both.
 *
 * See:
 *   https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/COMMANDS.md#apicreatechatconnection
 */

export const createInvitation = sdk.Action.withoutInput(
  'create-invitation',
  async () => ({
    name: i18n('Create SimpleX Invitation'),
    description: i18n(
      'Create a one-time SimpleX invitation link. Each invocation produces a fresh link that can be used by exactly one new contact — share it through any channel and have them paste it into their SimpleX client.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: i18n('General'),
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    let invitation: CR.Invitation
    try {
      invitation = await withBotSession(effects, async (send) => {
        // 1. Find the active user.
        const userEnv = await send('/user')
        if (userEnv.resp?.type !== 'activeUser') {
          throw new Error(
            `Bot did not return an active user. Got: ${JSON.stringify(userEnv.resp).slice(0, 300)}`,
          )
        }
        const userId = userEnv.resp.user.userId

        // 2. Create a one-time connection for that user.
        const invEnv = await send(`/_connect ${userId}`)
        if (invEnv.resp?.type !== 'invitation') {
          throw new Error(
            `Bot refused /_connect ${userId}. resp.type=${invEnv.resp?.type}\n\n${JSON.stringify(invEnv.resp, null, 2).slice(0, 1500)}`,
          )
        }
        return invEnv.resp
      })
    } catch (err) {
      return {
        version: '1',
        title: i18n('Could Not Reach Bot'),
        message: (err as Error).message,
        result: null,
      }
    }

    const members = connLinkMembers(invitation.connLinkInvitation)
    if (members.length === 0) {
      return {
        version: '1',
        title: i18n('No Invitation Link Returned'),
        message: JSON.stringify(invitation).slice(0, 2048),
        result: null,
      }
    }

    return {
      version: '1',
      title: i18n('One-Time Invitation Link'),
      message: i18n(
        'Send this link to one new contact. Each link can be redeemed by exactly one peer — run this action again to invite another person.',
      ),
      result: {
        type: 'group',
        value: members,
      },
    }
  },
)
