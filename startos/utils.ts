import { T } from '@start9labs/start-sdk'
import { T as SX } from '@simplex-chat/types'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const port = 5225

/**
 * Mode for `.simplex/outbound`: world-writable plus the sticky bit (as on
 * /tmp). Part of the file exchange contract — see `mainMounts` below and the
 * README. A consumer stages files as its own uid, which the bridge cannot know
 * and which more than one consumer may not share, so the dir is widened rather
 * than chowned to a guess; sticky then limits each consumer to deleting the
 * files it staged.
 */
export const OUTBOUND_MODE = 0o1777

/**
 * A single container mount: the `main` volume at /data (HOME). SimpleX keeps
 * its profile database under /data/.simplex alongside the image's file dirs
 * `files` (received, `--files-folder`), `tmp` (`--temp-folder`), and `outbound`
 * (consumer-written, for the bridge to send). All siblings on one
 * filesystem, so simplex-chat's atomic tmp->files rename can't hit EXDEV. (The
 * file-exchange paths are pinned via env in serverConfig.ts so the contract is
 * independent of the image's $HOME-derived defaults.)
 *
 * The file exchange contract (see README) needs no second/neutral mount here.
 * A consumer package mounts the specific subpaths it needs via `mountDependency`
 * at whatever paths it likes:
 *
 *   inbound  — mount `.simplex/files` read-only. The WS reports received files
 *              by name only, so the consumer resolves them against its own path.
 *   outbound — mount `.simplex/outbound` read-write. On send the consumer passes
 *              a path the bridge resolves here (`/data/.simplex/outbound/...`);
 *              the consumer stages into its own mount and rewrites the prefix to
 *              that container path (the openclaw-simplex plugin does this via
 *              connection.outboundFolder + outboundFolderOnClient), so no shared
 *              or verbatim mountpoint is required. Writable by any uid
 *              (OUTBOUND_MODE above) since consumers rarely run as root.
 */
export const mainMounts = sdk.Mounts.of().mountVolume({
  volumeId: 'main',
  subpath: null,
  mountpoint: '/data',
  readonly: false,
})

export function detailsResult(
  title: string,
  message: string,
  details: string,
): { version: '1' } & T.ActionResultV1 {
  return {
    version: '1',
    title,
    message,
    result: { type: 'multiline', value: details, copyable: true },
  }
}

/**
 * Build result members for a SimpleX connection link (one-time invitation or
 * long-lived address). Both a short link (modern clients) and a full link
 * (older clients) are surfaced when present, each copyable and with a QR code.
 */
export function connLinkMembers(
  link: SX.CreatedConnLink,
): T.ActionResultMember[] {
  const members: T.ActionResultMember[] = []
  const short = link.connShortLink?.trim()
  const full = link.connFullLink?.trim()
  if (short) {
    members.push({
      type: 'single',
      name: i18n('Short Link (recommended)'),
      description: i18n(
        'Use this with modern SimpleX clients. Includes a QR code.',
      ),
      value: short,
      copyable: true,
      qr: true,
      masked: false,
    })
  }
  if (full) {
    members.push({
      type: 'single',
      name: i18n('Full Link (older clients)'),
      description: i18n(
        'Backup format for older SimpleX clients that do not understand short links.',
      ),
      value: full,
      copyable: true,
      qr: true,
      masked: false,
    })
  }
  return members
}
