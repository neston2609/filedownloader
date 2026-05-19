// Browser-streamable video extensions. Files NOT in NATIVE_EXTS will be
// transcoded by ffmpeg on the fly into fragmented MP4 so the <video> tag
// can play them.
const VIDEO_EXTS = new Set([
  'mp4', 'm4v', 'mov', 'webm', 'ogv', 'ogg',
  'mkv', 'avi', 'wmv', 'flv', '3gp', 'ts',
  'mpg', 'mpeg', 'mts', 'm2ts', 'vob', 'rm', 'rmvb', 'asf', 'divx',
])

// Formats browsers can play directly without transcoding
const NATIVE_EXTS = new Set(['mp4', 'm4v', 'webm', 'ogv', 'ogg'])

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  // The rest get transcoded to MP4, so their stored MIME is informational only
  mov: 'video/mp4',
  mkv: 'video/mp4',
  avi: 'video/mp4',
  wmv: 'video/mp4',
  flv: 'video/mp4',
  '3gp': 'video/mp4',
  ts: 'video/mp4',
  mpg: 'video/mp4',
  mpeg: 'video/mp4',
  mts: 'video/mp4',
  m2ts: 'video/mp4',
  vob: 'video/mp4',
  rm: 'video/mp4',
  rmvb: 'video/mp4',
  asf: 'video/mp4',
  divx: 'video/mp4',
}

function ext(filename: string): string {
  const i = filename.lastIndexOf('.')
  if (i < 0) return ''
  return filename.slice(i + 1).toLowerCase()
}

export function isVideo(filename: string): boolean {
  return VIDEO_EXTS.has(ext(filename))
}

export function isNativeBrowserVideo(filename: string): boolean {
  return NATIVE_EXTS.has(ext(filename))
}

export function videoMimeType(filename: string): string {
  return MIME_BY_EXT[ext(filename)] ?? 'application/octet-stream'
}
