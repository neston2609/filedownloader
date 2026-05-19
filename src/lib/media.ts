// Browser-streamable video extensions. Some (mkv, avi) will still load via
// our API but won't play in most browsers — we keep them in the list so the
// user gets a Play button and can see whether their browser supports it.
const VIDEO_EXTS = new Set([
  'mp4', 'm4v', 'mov', 'webm', 'ogv', 'ogg', 'mkv', 'avi', 'wmv', 'flv', '3gp', 'ts',
])

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  '3gp': 'video/3gpp',
  ts: 'video/mp2t',
}

function ext(filename: string): string {
  const i = filename.lastIndexOf('.')
  if (i < 0) return ''
  return filename.slice(i + 1).toLowerCase()
}

export function isVideo(filename: string): boolean {
  return VIDEO_EXTS.has(ext(filename))
}

export function videoMimeType(filename: string): string {
  return MIME_BY_EXT[ext(filename)] ?? 'application/octet-stream'
}
