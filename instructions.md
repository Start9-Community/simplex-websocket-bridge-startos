# SimpleX Websocket Bridge

This service has no human chat interface — it is driven entirely by your own software over a Websocket API. For chatting by hand, use the SimpleX mobile or desktop apps.

## Documentation

- [SimpleX bots — sending commands](https://github.com/simplex-chat/simplex-chat/blob/stable/bots/README.md#sending-commands) — how to drive the client over its Websocket.
- [SimpleX CLI command reference](https://github.com/simplex-chat/simplex-chat/blob/stable/docs/CLI.md) — the commands you can send.
- [SimpleX Chat](https://simplex.chat) — about the network this connects to.

## What you get on StartOS

- A **Websocket API** to the SimpleX network, gated by an API key, that your bots, AI agents, scripts, and other StartOS services can drive.
- **Actions** to configure the client (identity, message relays, file retention), mint one-time invitation links, manage API keys, and reset the client.
- A **shared-volume file-exchange contract** other StartOS packages can opt into to send and receive files through the bridge.

## Getting set up

1. Start the service.
2. Open the **API Keys** action and copy the key created on install (or add your own). Outside clients send it as `Authorization: Bearer <token>`.
3. Open **Interfaces → Websocket** and copy the URL StartOS publishes for your network (LAN, Tor, etc.).
4. Connect any Websocket client to that URL with the bearer token, then drive it with the SimpleX protocol (see Documentation).
5. To give someone a way to reach the bridge, run the **Create SimpleX Invitation** action and share the link or QR — they paste it into their SimpleX client.

On-box StartOS services that depend on this package connect directly and do not need an API key.

## Authentication

Outside access to the Websocket API is gated by a bearer token at the StartOS reverse proxy: connect with `Authorization: Bearer <token>` on the Websocket upgrade — requests without a valid token get `401` and never reach the bridge.

Manage tokens in the **API Keys** action — each has a label (to identify the client) and a generated token. Add one per client; delete one to revoke its access.

## Configuring the client

Run the **Configure Client** action to set the client's identity and behavior. It writes a settings file the service reads on start, so you can run it **before the first start** to seed the identity.

**Who manages the profile?** The "SimpleX Profile" option chooses between _Managed by StartOS_ (default) and _Managed by my application_. Pick the latter to drive the bridge from your own software that manages its own SimpleX identity: StartOS then leaves the profile alone — display name, picture, and the other chat settings below are yours to set. Message relays and received-file cleanup are managed by StartOS in either mode. The profile fields below apply only in the StartOS-managed mode.

- **Display Name** / **Full Name** — how the client presents to contacts.
- **Profile Picture** — an image URL (http/https), a data URL, or base64; it is cropped to a square and shrunk automatically to fit SimpleX's avatar limit. Leave empty to remove it.
- **Peer Type** — Bot or Human (cosmetic; both transfer files and messages either way).
- **Auto-Accept Contact Requests** — automatically accept incoming requests to the client's address.
- **Business Mode** / **Welcome Message** — present a business address and/or send an auto-reply to new contacts.
- **Message Relays (SMP/XFTP)** — SimpleX's public servers (default), your own self-hosted SimpleX Server, or custom addresses.
- **Cleanup Received Files After (days)** — optionally delete old received files.

Profile, contact-request, and message-relay changes are pushed to the running client immediately, with no restart. Only a received-file-retention change restarts the service (it's read by the container at startup).

## Switching message relays

Choosing **SimpleX defaults (public)**, **self-hosted**, or **custom** relays is not a global on/off switch for all traffic — it only changes where **new** connections are created:

- **New contacts and new invitation/address links** use the selected relays.
- **Existing contacts keep working** over the connections they already have. In SimpleX a message queue lives on the server the _recipient_ chose when the connection was made, and it doesn't move; selecting new relays disables the old ones for _new_ queues but doesn't delete or stop existing ones. Messages are never re-routed between your servers by this setting — a sender only adds its own forwarding relay to hide its IP, still delivering to the queue's original server.
- Your **existing published address** likewise stays on its original server — run **Reset SimpleX Address** to mint a new one on the current relays.

When moving to a self-hosted server, keep two things in mind:

- If you later **shut the old server down**, any contact or address still hosted there stops working; reconnect them (and Reset SimpleX Address) on the new relays first.
- A self-hosted relay must be **reachable by your contacts and by this client**. A LAN-only/private address only works for peers on that network; to reach outside contacts, publish the server on clearnet or Tor.

## Adding a contact

There are two ways to hand out a connection link:

- **Create SimpleX Invitation** mints a fresh one-time link (with QR). Each link can be redeemed by exactly one peer — run it again to invite another person.
- **View SimpleX Address** shows the client's long-lived, reusable address (with QR), creating one if needed. The same address works for any number of contacts, so it's convenient to publish. To accept incoming requests automatically, enable **Auto-Accept Contact Requests** in Configure Client.

Send the link or QR to the person you want to connect; they paste it into their SimpleX client.

If a published address is ever over-shared or abused, run **Reset SimpleX Address** (Danger Zone) to replace it with a new one — the service keeps running, existing contacts are unaffected, and only the old link stops working. (See [Switching message relays](#switching-message-relays) for why you may also want to reset the address after changing servers.)

## Connecting programmatically

The bridge does not accept raw command strings; wrap every command in a small JSON envelope:

```json
{ "corrId": "any-id-you-pick", "cmd": "/help" }
```

- `corrId` is a correlation id you choose; the bridge echoes it back in the matching reply so you can pair requests with responses.
- `cmd` is the SimpleX command, exactly as in the `simplex-chat` CLI (leading slash included).

Each reply is a JSON object with the same `corrId` and a `resp` field. The bridge also pushes unsolicited event messages (without your `corrId`) for incoming chats, contact updates, and the like. A few useful commands: `/user` (the active user), `/_connect 1` (a one-time invitation link for user 1 — what **Create SimpleX Invitation** does), and `/contacts` (connected peers).

## Resetting

To start over with a fresh identity, run the **Reset Client** action under Danger Zone (available when the service is stopped). It permanently deletes the SimpleX identity, contacts, and chat history; your API keys are kept, and a fresh identity is created on the next start.

Existing contacts can no longer reach the client afterward and must reconnect with a new invitation or address. If this client is used with OpenClaw, purge the channel's per-contact state before anyone reconnects — SimpleX reuses low, sequential contact ids, so a brand-new contact could otherwise inherit an old contact's OpenClaw session history, pairing approval, and allowlist entry.
