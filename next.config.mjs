/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PUBLIC_BACKEND_DEPLOY: process.env.PUBLIC_BACKEND_DEPLOY ?? "",
  },
};

export default nextConfig;