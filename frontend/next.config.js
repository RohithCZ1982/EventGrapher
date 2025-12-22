/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for better deployment
  output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig

