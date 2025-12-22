/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed standalone output - using standard Next.js build for Cloud Run
  // This works better with Docker multi-stage builds
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig

