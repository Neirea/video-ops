/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ["@aws-sdk"],
    async redirects() {
        return [
            { source: "/", destination: "/video/default", permanent: true },
        ];
    },
};

export default nextConfig;
