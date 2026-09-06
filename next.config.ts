import type { NextConfig } from 'next';

// GitHub Pages serves static files only. This makes Vinext emit a static site
// that can be published from dist/client.
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
