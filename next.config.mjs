/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Firebase web API key is provided as the server-side `apiKey` env var.
  // Firebase initializes in the browser, so expose it to the client bundle
  // under a public name. A Firebase web API key is non-secret project config.
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.apiKey,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
