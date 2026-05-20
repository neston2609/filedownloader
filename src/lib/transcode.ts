import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'

// Resolve the ffmpeg binary path. Prefer the bundled ffmpeg-static binary
// (works without any system-level install), but fall back to system ffmpeg
// if for some reason ffmpeg-static didn't ship a binary for this platform.
function resolveFfmpeg(): string {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const p = require('ffmpeg-static') as string | null
    if (p) return p
  } catch {
    /* fall through */
  }
  return 'ffmpeg'
}

const FFMPEG = resolveFfmpeg()

/**
 * Transcode an arbitrary video stream into fragmented MP4 (H.264 + AAC) so
 * any HTML5 <video> element can play it.
 *
 * - Uses -preset veryfast and a moderate CRF to keep up with playback speed
 *   on a typical 2-vCPU server. Heavier presets give smaller files but lag.
 * - Outputs a fragmented MP4 (frag_keyframe + empty_moov) so the browser
 *   can start playing as soon as the first chunk arrives — important
 *   because we can't seek-write the moov atom back to the top of a stream.
 *
 * Returns the ffmpeg stdout stream. The caller must wire up cleanup via
 * the returned `kill` function (typically in the ReadableStream's cancel).
 */
export function transcodeToMp4(source: NodeJS.ReadableStream): {
  out: NodeJS.ReadableStream
  kill: () => void
  proc: ChildProcessWithoutNullStreams
} {
  const ff = spawn(FFMPEG, [
    '-hide_banner', '-loglevel', 'error',
    '-i', 'pipe:0',

    // Cap output height at 720p (downscale only — never upscale). -2 keeps
    // the width even (required by libx264 yuv420p). A lighter 720p encode
    // lets ffmpeg keep up with playback so the stream doesn't stutter.
    '-vf', "scale=-2:'min(720,ih)'",

    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',

    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',

    '-movflags', 'frag_keyframe+empty_moov+default_base_moof+faststart',
    '-f', 'mp4',
    'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'pipe'] })

  // Stream the source into ffmpeg, swallowing pipe errors that fire when
  // either side closes early.
  source.pipe(ff.stdin)
  ff.stdin.on('error', () => { /* EPIPE on client disconnect — ignore */ })
  ff.stderr.on('data', (chunk: Buffer) => {
    const msg = chunk.toString().trim()
    if (msg) console.warn('[ffmpeg]', msg)
  })
  ff.on('error', (err) => {
    console.error('[ffmpeg] spawn failed:', err)
  })

  const kill = () => {
    try { ff.kill('SIGKILL') } catch {}
    try { (source as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.() } catch {}
  }

  return { out: ff.stdout, kill, proc: ff }
}
