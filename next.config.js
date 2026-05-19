/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:8000'] },
    // These server-only packages contain native bindings or non-bundlable
    // require() patterns and must NOT be processed by Next's bundler.
    serverComponentsExternalPackages: [
      '@marsaud/smb2',
      'basic-ftp',
      'ssh2-sftp-client',
      'ssh2',
      'cpu-features',
      'ffmpeg-static',
    ],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // ssh2's optional native build helper (cpu-features) is not actually
      // installed; mark it external so webpack stops trying to resolve it.
      config.externals = [
        ...(config.externals || []),
        'cpu-features',
        '@marsaud/smb2',
        'basic-ftp',
        'ssh2-sftp-client',
        'ssh2',
        'ffmpeg-static',
      ]
    }
    return config
  },
}

module.exports = nextConfig
