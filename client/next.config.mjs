/** @type {import('next').NextConfig} */
const nextConfig = {
  // Frontend and Express must use explicitly configured keys from the same Clerk instance.
  env: { NEXT_PUBLIC_CLERK_KEYLESS_DISABLED: "true" },
  images: { remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }] },
};

export default nextConfig;
