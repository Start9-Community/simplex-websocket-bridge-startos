import { sdk } from './sdk'

export const port = 5225

/**
 * Mode for `.simplex/outbound`: world-writable plus the sticky bit (as on
 * /tmp). Part of the file exchange contract — see `mainMounts` below and the
 * README. This container runs as root while consumers write as their own
 * (often non-root) uid, so the dir has to be writable by a uid the bridge
 * cannot know; sticky then limits each consumer to deleting its own files.
 * Applied in main.ts on every start.
 */
export const OUTBOUND_MODE = 0o1777

/**
 * A single mount: the `main` volume at /data (HOME). Everything SimpleX lives
 * under /data/.simplex — the profile database and `store.json`, plus the image's
 * file dirs `files` (received, `--files-folder`), `tmp` (`--temp-folder`), and
 * `outbound` (consumer-written, for the bridge to send). All siblings on one
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
