import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/** Directory that contains this config and this app’s node_modules (never a parent like ~). */
const configDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = fs.existsSync(path.join(configDir, "node_modules", "tailwindcss"))
  ? configDir
  : process.cwd();

const nextConfig: NextConfig = {
  // Without this, Next may use e.g. /Users/user when ~/package-lock.json exists, and load the wrong .env.
  turbopack: {
    root: appDir,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pujlrdfgpbbnfffuzwep.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
