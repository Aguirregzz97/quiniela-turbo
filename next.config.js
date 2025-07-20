/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  images: {
    domains: ["lh3.googleusercontent.com", "media.api-sports.io"],
  },
  devIndicators: false,
};

module.exports = nextConfig;
