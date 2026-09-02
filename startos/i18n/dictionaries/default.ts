export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts / interfaces.ts / health
  'Starting SimpleX Websocket Bridge!': 0,
  Websocket: 1,
  'Websocket API for driving SimpleX programmatically': 2,
  'Websocket is ready': 3,
  'Websocket is not ready': 4,

  // action groups
  General: 5,
  'Danger Zone': 6,

  // configure action
  'Display Name': 9,
  'Profile Picture': 11,

  // create-invitation action
  'Create SimpleX Invitation': 18,
  'Create a one-time SimpleX invitation link. Each invocation produces a fresh link that can be used by exactly one new contact — share it through any channel and have them paste it into their SimpleX client.': 19,
  'One-Time Invitation Link': 20,
  'Send this link to one new contact. Each link can be redeemed by exactly one peer — run this action again to invite another person.': 21,
  'Short Link (recommended)': 22,
  'Use this with modern SimpleX clients. Includes a QR code.': 23,
  'Full Link (older clients)': 24,
  'Backup format for older SimpleX clients that do not understand short links.': 25,
  'Could Not Reach Bot': 26,
  'No Invitation Link Returned': 27,

  // reset-client action
  'Reset Client': 28,
  'Permanently delete the SimpleX identity, all chats, and all contacts. A fresh identity is created the next time the service starts.': 29,
  'This permanently deletes the SimpleX identity, all chats, and all contacts. Anyone who has your current connection link will no longer be able to reach this client — they must reconnect with a new invitation or address. The fresh identity reverts to display name "SimpleX Bot" with no profile picture; you can set those again in the Configure Client action once the service is back up. If this client is used with OpenClaw, note that SimpleX reuses low, sequential contact ids after a reset: a brand-new contact can take a former id (such as 4) and OpenClaw would treat them as the old contact, inheriting their session history, pairing approval, and allowlist membership. Purge the matching OpenClaw state for the channel before letting anyone reconnect. This cannot be undone.': 30,
  'Reset Failed': 31,
  'Client Reset': 32,
  'The SimpleX identity, all contacts, and chat history have been deleted; your API keys are kept. Start the service to create a fresh identity. Every previous contact must reconnect with a new invitation or address — if this client is used with OpenClaw, purge the channel state before they do.': 33,

  // api-keys action
  'API Keys': 34,
  'Manage the bearer tokens that gate outside access to the Websocket API.': 35,
  'Bearer tokens that grant outside access to the Websocket API. Add one per client; delete to revoke. On-box services connect directly and never need a key.': 36,
  Label: 37,
  'A name to identify this key (e.g. the client it belongs to).': 38,
  Token: 39,
  'Leave blank when adding a key and one is generated for you. Keep it secret.': 40,
  'API Keys Saved': 41,
  'Outside clients authenticate with the header: Authorization: Bearer <token>': 42,

  // configure SimpleX client action
  'SMP relay URIs': 43,
  'One SMP server address per line, e.g. smp://<fingerprint>@host. These REPLACE the public preset servers.': 44,
  'XFTP relay URIs': 45,
  'One XFTP server address per line, e.g. xftp://<fingerprint>@host. These REPLACE the public preset servers.': 46,
  'The name peers see when they connect to your client.': 47,
  'Full Name': 48,
  'Optional longer name shown alongside the display name.': 49,
  'Set a profile picture from an image URL (http/https), a data URL, or base64. Any size — it is cropped to a square and shrunk to fit the SimpleX avatar size limit. Leave empty to remove the picture.': 50,
  'Peer Type': 51,
  'Bot marks the profile as a SimpleX bot so peer apps show command menus. Human presents as a regular user. Cosmetic — file and message transfer work either way.': 52,
  Bot: 53,
  Human: 54,
  'Auto-Accept Contact Requests': 55,
  'Automatically accept incoming contact requests to the client address.': 56,
  'Business Mode': 57,
  'Present the address as a business address (each contact becomes a group with the business, enabling multiple agents).': 58,
  'Welcome Message': 59,
  'Optional auto-reply sent to each new contact when they connect.': 60,
  'Message Relays (SMP/XFTP)': 61,
  'Which servers relay your messages and files. Applied immediately (no restart) and only to NEW connections — existing contacts and your current address keep using the server they were created on. Use Reset SimpleX Address to move your address onto the new relays.': 62,
  'SimpleX defaults (public)': 63,
  'My self-hosted SimpleX Server': 64,
  Custom: 65,
  'Cleanup Received Files After (days)': 66,
  'Delete received files older than this many days. Leave empty to keep files forever.': 67,
  days: 68,
  never: 69,
  'Configure Client': 70,
  'Set the client display name, profile, contact-request handling, message relays, and file retention. Run this before starting the service for the first time.': 71,
  'Saved, But Live Update Failed': 74,
  'Settings were saved, but applying them to the running client failed: ': 75,

  // main.ts sync
  'SimpleX client settings synced': 78,
  'Could not sync SimpleX client settings: ': 79,

  // avatar processing (configure action)
  'Could Not Process Image': 80,
  'The profile picture could not be processed: ': 81,

  // view-address / reset-address actions
  'View SimpleX Address': 83,
  'Show the long-lived SimpleX address for this client — a reusable connection link. Unlike a one-time invitation, the same address works for any number of contacts.': 84,
  'SimpleX Address': 85,
  'Share this address so others can request to connect. It is reusable — the same link works for any number of contacts. To accept requests automatically, enable Auto-Accept Contact Requests in Configure Client.': 86,
  'No Address Returned': 87,
  'Reset SimpleX Address': 88,
  'Replace the long-lived SimpleX address for this client with a new one — useful after changing message relays, so the address is hosted on the new servers. Existing contacts are unaffected; only the old address link stops working.': 89,
  'This replaces the SimpleX address for this client with a new one. The old address link will no longer connect anyone to the client, so update anywhere you have shared it. Existing contacts are not affected — they can still chat with the client as before.': 90,
  'Address Reset': 91,
  'A new SimpleX address has been created and is shown below. The previous address link no longer works; existing contacts are unaffected.': 92,

  // configure client — profile management mode
  'SimpleX Profile': 93,
  'Choose whether StartOS manages the client profile — display name, picture, and the other chat settings below — or leaves it to your own application. Message relays and file cleanup are managed by StartOS in either mode.': 94,
  'Managed by StartOS': 95,
  'Managed by my application': 96,

  // message relays
  'Message relays could not be resolved at start: ': 97,
  'The selected message relays could not be applied, so the client would fall back to SimpleX public relays. Check that the SimpleX Server dependency is installed and running.': 98,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
