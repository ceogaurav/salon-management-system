import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    // For edge runtime (middleware), exclude Node.js modules
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        pg: false,
        'pg-native': false,
        crypto: false,
      }
    }
    
    return config
  },
}

export default nextConfig
