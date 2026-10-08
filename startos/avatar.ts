import { Jimp, JimpMime } from 'jimp'
import { readFile } from 'fs/promises'

/**
 * Turn an arbitrary source image into a SimpleX-ready avatar data URL.
 *
 * SimpleX embeds the avatar in the profile "info" sent to every contact and
 * rejects oversized profiles ("large info"), so the picture must be tiny. We
 * center-crop to a square (SimpleX renders avatars square, so a non-square
 * source would otherwise be stretched) and step the dimensions/quality down
 * until the JPEG fits under the byte cap — mirroring the openclaw-simplex
 * plugin's avatar handling.
 *
 * Returns a `data:image/jpg;base64,...` URL. SimpleX clients expect the
 * "image/jpg" media type specifically (not "image/jpeg"). Throws if the image
 * can't be brought under the cap or can't be decoded.
 */

const MAX_AVATAR_BYTES = 12 * 1024

// [maxSide, jpegQuality] tiers, largest/highest first.
const STEPS: ReadonlyArray<readonly [number, number]> = [
  [192, 70],
  [128, 60],
  [96, 50],
]

async function bufferToAvatarDataUrl(source: Buffer): Promise<string> {
  for (const [size, quality] of STEPS) {
    // Re-decode from the original each step: cover() mutates the instance, so
    // we always crop/scale from full resolution rather than a prior downscale.
    const image = await Jimp.read(source)
    image.cover({ w: size, h: size }) // center-crop + scale to fill the square
    const jpeg = await image.getBuffer(JimpMime.jpeg, { quality })
    if (jpeg.length <= MAX_AVATAR_BYTES) {
      return `data:image/jpg;base64,${jpeg.toString('base64')}`
    }
  }

  throw new Error(
    'Image is too detailed to fit the SimpleX avatar size limit even after downscaling. Try a simpler or lower-resolution image.',
  )
}

// Guards for remote fetches. The cap is on the SOURCE download, before
// downscaling; a normal avatar is well under this.
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024 // 8 MB
const FETCH_TIMEOUT_MS = 15_000

/** Download an image from an http(s) URL into a buffer, bounded in time and size. */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res
  try {
    res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
  } catch (err) {
    throw new Error(`Could not fetch image URL: ${(err as Error).message}`)
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) {
    throw new Error(`Image URL returned HTTP ${res.status}.`)
  }
  const declared = Number(res.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > MAX_DOWNLOAD_BYTES) {
    throw new Error('Image at that URL is too large (max 8 MB).')
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length === 0) {
    throw new Error('Image URL returned no data.')
  }
  if (buffer.length > MAX_DOWNLOAD_BYTES) {
    throw new Error('Image at that URL is too large (max 8 MB).')
  }
  return buffer
}

/**
 * Normalize a supplied image into the avatar data URL. Accepts an http(s) URL
 * (fetched here), a `data:image/...;base64,...` URL, or a raw base64 blob
 * (whitespace/newlines tolerated). Jimp decodes and validates the bytes, so a
 * non-image input throws a clear error.
 */
export async function pastedImageToAvatarDataUrl(
  value: string,
): Promise<string> {
  const trimmed = value.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return bufferToAvatarDataUrl(await fetchImageBuffer(trimmed))
  }

  const comma = trimmed.startsWith('data:') ? trimmed.indexOf(',') : -1
  const base64 = (comma >= 0 ? trimmed.slice(comma + 1) : trimmed).replace(
    /\s+/g,
    '',
  )
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0) {
    throw new Error(
      'No image data found. Provide an image URL, data URL, or base64.',
    )
  }
  return bufferToAvatarDataUrl(buffer)
}

/** Same normalization, but from a file path (for a future native file picker). */
export async function fileToAvatarDataUrl(path: string): Promise<string> {
  return bufferToAvatarDataUrl(await readFile(path))
}
