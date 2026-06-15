/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Old bookmarks for the renamed Cross-pipeline analytics page land on
  // the new Pipeline trends route. Next.js forwards the query string by
  // default, so the carried global filters survive the hop; 308 (permanent)
  // tells browsers to remember the new location.
  async redirects() {
    return [
      {
        source: '/cross-pipeline-analytics',
        destination: '/pipeline-trends',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
