# Updating the upstream version

SimpleX Websocket Bridge runs the [SimpleX Chat](https://github.com/simplex-chat/simplex-chat)
client headless. The runtime is the standalone container image built from
[lundog/simplex-websocket-bridge-docker](https://github.com/lundog/simplex-websocket-bridge-docker)
and published to Docker Hub as `lundog/simplex-websocket-bridge`. "Upstream" here means the
SimpleX Chat release that image bundles; this repo consumes the image via `dockerTag` and does
not build it.

> [!NOTE]
> Both the image and its source repo were renamed in July 2026 (at image revision `6.5.5-2`), from
> `lundog/simplex-chat` / `lundog/simplex-chat-docker`. The GitHub repo redirects, but the old
> Docker Hub repo does **not** — it is frozen at `6.5.5-1` and gets no new builds. Don't pin it.

## The tag has two parts

The tag is `<simplex-version>[-<image-revision>]`, e.g. `6.5.5-2`, and the two halves move
independently:

- **SimpleX version** (`6.5.5`) — the SimpleX Chat release the image bundles.
- **Image revision** (`-2`) — a rebuild of the *same* SimpleX version (an entrypoint or packaging
  change in the image repo). An unsuffixed tag is revision 0.

An unsuffixed tag points at the **newest** revision of that SimpleX version, so `6.5.5` and
`6.5.5-2` are currently the same image. Pin the explicit revision so the pin can't shift underneath
you.

## Determining the upstream version

**Do not bump from the SimpleX Chat release list alone.** A SimpleX release is only usable once the
bridge image has been rebuilt for it, and that rebuild is a separate, manual step by the image
maintainer — it lags, and sometimes never happens for a given release. Read the image's tag list,
which is the only thing that actually has to exist:

```sh
curl -fsSL "https://hub.docker.com/v2/repositories/lundog/simplex-websocket-bridge/tags?page_size=50&ordering=last_updated" \
  | jq -r '.results[].name'
```

For context, the newest SimpleX Chat release is:

```sh
gh release view -R simplex-chat/simplex-chat --json tagName -q .tagName
```

If it has no matching image tag, there is nothing to bump here yet — the image must be built first.

The pin lives in `startos/manifest/index.ts` at `images.simplex.source.dockerTag`.

## Applying the bump

1. If the image hasn't been rebuilt for the SimpleX release you want, that comes first: in
   [lundog/simplex-websocket-bridge-docker](https://github.com/lundog/simplex-websocket-bridge-docker),
   bump the pinned SimpleX version and publish a multi-arch (amd64 + arm64) tag. The Dockerfile,
   the entrypoint supervisor, and the `--files-folder` / `--temp-folder` wiring all live there, not
   in this repo.
2. Bump `dockerTag` to `lundog/simplex-websocket-bridge:<tag>` (drop the leading `v` from the
   SimpleX release tag; keep the explicit `-N` revision).
3. **Re-check the image's file-exchange defaults.** The bridge's inbound and temp directories come
   from `SIMPLEX_INBOUND_DIR` / `SIMPLEX_TMP_DIR`, which this package sets **explicitly** in
   `startos/main.ts` (to `/simplex/inbound` and `/simplex/tmp`, inside the shared `/simplex` mount
   — see `startos/utils.ts` and the README's file-exchange contract).

   We set them precisely because the image's defaults have moved before and will not announce it:
   through 6.5.4 the image defaulted to `/simplex`, and 6.5.5 silently changed it to
   `$HOME/.simplex/{files,tmp}` — *outside* our mount. A bump that relied on the defaults would send
   every received file somewhere no dependent service can see, breaking the file-exchange contract
   with no error.

   So on each bump, confirm the image still honors both variables, and that inbound and temp stay
   co-located: simplex-chat completes a download with an atomic `rename(2)` from temp into inbound,
   which fails with `EXDEV` if they are separate mounts.
4. Bump the package `version` and update `releaseNotes` in `startos/versions/current.ts`. Add a
   migration only if the new version needs one (see the
   [packaging guide on versions](https://docs.start9.com/packaging)).
