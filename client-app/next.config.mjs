/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            { source: "/", destination: "/video/default", permanent: true },
        ];
    },
};

export default nextConfig;
