import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@webviewrpc/web', '@webviewrpc/core', '@example/contract'],
}

export default config
