/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ["@aws-sdk"],
    },
    async redirects() {
        return [
            { source: "/", destination: "/video/default", permanent: true },
        ];
    },
};

export default nextConfig;
