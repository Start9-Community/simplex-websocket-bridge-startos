import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { sdk } from '../sdk'
import { i18n } from '../i18n'

// Resolves to /media/startos/volumes/main (StartOS's on-host mount of our
// "main" volume), but typed against the manifest so a rename or removal of
// the volume would be a compile error rather than a runtime surprise.
const VOLUME_PATH = sdk.volumes.main.path

/**
 * Wipe all SimpleX Chat data from the "main" volume. Service must be stopped
 * so we don't race the daemon's writes. On next start the daemon's
 * --create-bot-display-name / --create-bot-allow-files args take effect again,
 * which means the fresh profile boots back at "SimpleX Bot" with no picture
 * and file sharing on.
 */
export const resetClient = sdk.Action.withoutInput(
  'reset-client',
  async () => ({
    name: i18n('Reset Client'),
    description: i18n(
      'Permanently delete the SimpleX identity, all chats, and all contacts. A fresh identity is created the next time the service starts.',
    ),
    warning: i18n(
      'This permanently deletes the SimpleX identity, all chats, and all contacts. Anyone who has your current connection link will no longer be able to reach this client — they must reconnect with a new invitation or address. The fresh identity reverts to display name "SimpleX Bot" with no profile picture; you can set those again in the Configure Client action once the service is back up. If this client is used with OpenClaw, note that SimpleX reuses low, sequential contact ids after a reset: a brand-new contact can take a former id (such as 4) and OpenClaw would treat them as the old contact, inheriting their session history, pairing approval, and allowlist membership. Purge the matching OpenClaw state for the channel before letting anyone reconnect. This cannot be undone.',
    ),
    allowedStatuses: 'only-stopped',
    group: i18n('Danger Zone'),
    visibility: 'enabled',
  }),
  async () => {
    try {
      const entries = await fs.readdir(VOLUME_PATH)
      for (const entry of entries) {
        await fs.rm(path.join(VOLUME_PATH, entry), {
          recursive: true,
          force: true,
        })
      }
    } catch (err) {
      return {
        version: '1',
        title: i18n('Reset Failed'),
        message: (err as Error).message,
        result: null,
      }
    }

    return {
      version: '1',
      title: i18n('Client Reset'),
      message: i18n(
        'The SimpleX identity, all contacts, and chat history have been deleted; your API keys are kept. Start the service to create a fresh identity. Every previous contact must reconnect with a new invitation or address — if this client is used with OpenClaw, purge the channel state before they do.',
      ),
      result: null,
    }
  },
)
