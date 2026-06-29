/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // react-leaflet/leaflet son ESM → transpilarlos evita errores de import en Next.
  transpilePackages: ["react-leaflet", "@react-leaflet/core", "leaflet"],
};

export default nextConfig;
