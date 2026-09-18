const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verification builds can write to another folder (NEXT_DIST_DIR=.next-verify) so they never clash with a running next dev
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@lexbridge/shared'],
  experimental: {
    // Next buffers proxied request bodies up to this size. Keep it above DOCUMENT_MAX_BYTES (10 MB)
    // plus multipart overhead, so oversized uploads reach the API and get a clean 413.
    proxyClientMaxBodySize: '12mb',
  },
  // Browser calls /api/* on the same origin, so the httpOnly session cookie stays first-party
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
