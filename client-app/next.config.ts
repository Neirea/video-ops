import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["@aws-sdk"],
    async redirects() {
        return [
            { source: "/", destination: "/video/default", permanent: true },
        ];
    },
};

export default nextConfig;
