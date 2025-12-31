import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude recharts and react-smooth from server-side bundling
  serverComponentsExternalPackages: ['recharts', 'react-smooth'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize recharts on server to prevent SSR issues
      config.externals = config.externals || [];
      config.externals.push({
        'recharts': 'commonjs recharts',
        'react-smooth': 'commonjs react-smooth',
      });
    }
    return config;
  },
};

export default nextConfig;
